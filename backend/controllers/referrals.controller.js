import { query, withTransaction } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification } from "../utils/notify.js";
import { notifyUser } from "../events.js";

const baseSelect = `
  SELECT r.id, r.student_id, r.referrer_id, r.receiving_counselor_id,
         r.reason, r.notes, r.status, r.decision_note, r.decided_at,
         r.created_at, r.updated_at,
         stu.name AS studentName, stu.email AS studentEmail, stu.college AS studentCollege,
         ref.name AS referrerName, ref.role AS referrerRole, ref.college AS referrerCollege,
         rec.name AS receivingCounselorName
  FROM referrals r
  LEFT JOIN users stu ON r.student_id = stu.id
  LEFT JOIN users ref ON r.referrer_id = ref.id
  LEFT JOIN users rec ON r.receiving_counselor_id = rec.id
`;

export const createReferral = async (req, res) => {
  const referrerId = req.user?.id;
  const { studentId, receivingCounselorId, reason, notes } = req.body || {};

  if (!studentId || !receivingCounselorId || !reason?.trim()) {
    return res
      .status(400)
      .json({ message: "studentId, receivingCounselorId, and reason are required" });
  }

  const [student] = await query(
    "SELECT id, name, college FROM users WHERE id = ? AND role = 'student'",
    [studentId]
  );
  if (!student) return res.status(404).json({ message: "Student not found" });

  if (req.user?.college && student.college && req.user.college !== student.college) {
    return res
      .status(403)
      .json({ message: "You can only refer students from your own college" });
  }

  const [receiver] = await query(
    "SELECT id, name FROM users WHERE id = ? AND role = 'counselor'",
    [receivingCounselorId]
  );
  if (!receiver) return res.status(404).json({ message: "Receiving counselor not found" });

  const result = await query(
    `INSERT INTO referrals
       (student_id, referrer_id, receiving_counselor_id, reason, notes, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [studentId, referrerId, receivingCounselorId, reason.trim(), notes || null]
  );

  await createNotification({
    userId: receivingCounselorId,
    title: "New referral received",
    message: `${req.user?.name || "A College Representative"} referred ${student.name} to you.`,
    link: `/counselor/referrals`,
  });
  notifyUser(receivingCounselorId, { type: "referrals" });

  await logAction(req, "create_referral", "referral", result.insertId, {
    studentId,
    receivingCounselorId,
  });

  return res.status(201).json({ message: "Referral created", id: result.insertId });
};

export const listReferrals = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const { direction, status } = req.query;

  if (!["counselor", "college_rep", "admin"].includes(role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const conditions = [];
  const params = [];

  if (role === "counselor") {
    conditions.push("r.receiving_counselor_id = ?");
    params.push(userId);
  } else if (role === "college_rep") {
    conditions.push("r.referrer_id = ?");
    params.push(userId);
  }

  if (status) {
    conditions.push("r.status = ?");
    params.push(status);
  }

  // `direction` is no longer meaningful (counselors only receive, reps only send),
  // but we still accept it for backwards compatibility with the old client.
  void direction;

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `${baseSelect} ${where} ORDER BY r.created_at DESC`;
  const rows = await query(sql, params);
  return res.json(rows);
};

export const getReferral = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const role = req.user?.role;
  const rows = await query(`${baseSelect} WHERE r.id = ?`, [id]);
  if (!rows.length) return res.status(404).json({ message: "Referral not found" });
  const r = rows[0];
  if (
    role !== "admin" &&
    r.referrer_id !== userId &&
    r.receiving_counselor_id !== userId
  ) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return res.json(r);
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && value.includes("T")) return value.split("T")[0];
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return value;
};

export const decideReferral = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { status, decisionNote, scheduledDate, scheduledTime } = req.body || {};

  if (!["accepted", "rejected"].includes(status)) {
    return res
      .status(400)
      .json({ message: "status must be 'accepted' or 'rejected'" });
  }
  if (status === "rejected" && !decisionNote?.trim()) {
    return res
      .status(400)
      .json({ message: "A decision note is required when rejecting" });
  }
  if (status === "accepted" && (!scheduledDate || !scheduledTime)) {
    return res
      .status(400)
      .json({ message: "Scheduled date and time are required when accepting" });
  }

  const [referral] = await query(
    "SELECT id, receiving_counselor_id, referrer_id, status, student_id, reason FROM referrals WHERE id = ?",
    [id]
  );
  if (!referral) return res.status(404).json({ message: "Referral not found" });
  if (referral.receiving_counselor_id !== userId) {
    return res.status(403).json({ message: "Only the receiving counselor can decide" });
  }
  if (referral.status !== "pending") {
    return res.status(409).json({ message: `Referral is already ${referral.status}` });
  }

  const normalizedDate = status === "accepted" ? normalizeDate(scheduledDate) : null;
  const trimmedTime = status === "accepted" ? String(scheduledTime).trim() : null;

  const appointmentId = await withTransaction(async (q) => {
    await q(
      "UPDATE referrals SET status = ?, decision_note = ?, decided_at = NOW() WHERE id = ?",
      [status, decisionNote?.trim() || null, id]
    );

    if (status !== "accepted") return null;

    const insertResult = await q(
      `INSERT INTO appointments
         (student_id, counselor_id, referral_id, appointment_type, status, reason,
          scheduled_date, scheduled_time)
       VALUES (?, ?, ?, 'counseling', 'approved', ?, ?, ?)`,
      [
        referral.student_id,
        referral.receiving_counselor_id,
        referral.id,
        referral.reason,
        normalizedDate,
        trimmedTime,
      ]
    );
    return insertResult.insertId;
  });

  const repMessage =
    status === "accepted"
      ? `Your referral was accepted. A session is scheduled for ${normalizedDate} at ${trimmedTime}.`
      : decisionNote?.trim()
      ? `Your referral was rejected. Reason: ${decisionNote.trim().slice(0, 120)}`
      : "Your referral was rejected.";

  await createNotification({
    userId: referral.referrer_id,
    title: `Referral ${status}`,
    message: repMessage,
    link: `/rep/referrals`,
  });
  // Update the referring rep's referrals list live.
  notifyUser(referral.referrer_id, { type: "referrals" });

  if (appointmentId) {
    await createNotification({
      userId: referral.student_id,
      title: "Counseling session scheduled",
      message: `A counselor has scheduled a counseling session for you on ${normalizedDate} at ${trimmedTime}.`,
      link: `/student/appointments`,
    });
    // The accept created an appointment for the student — refresh their list.
    notifyUser(referral.student_id, { type: "appointments" });
  }

  await logAction(req, `referral_${status}`, "referral", id, {
    decisionNote: decisionNote || null,
    appointmentId: appointmentId || null,
    scheduledDate: normalizedDate,
    scheduledTime: trimmedTime,
  });

  return res.json({
    message: `Referral ${status}`,
    id: Number(id),
    appointmentId: appointmentId || null,
    scheduledDate: normalizedDate,
    scheduledTime: trimmedTime,
  });
};

export const cancelReferral = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const [referral] = await query(
    "SELECT id, referrer_id, receiving_counselor_id, status FROM referrals WHERE id = ?",
    [id]
  );
  if (!referral) return res.status(404).json({ message: "Referral not found" });
  if (referral.referrer_id !== userId) {
    return res.status(403).json({ message: "Only the referrer can cancel" });
  }
  if (referral.status !== "pending") {
    return res.status(409).json({ message: `Cannot cancel a ${referral.status} referral` });
  }

  await query("UPDATE referrals SET status = 'cancelled' WHERE id = ?", [id]);
  // The cancelled referral leaves the receiving counselor's pending list.
  notifyUser(referral.receiving_counselor_id, { type: "referrals" });
  await logAction(req, "referral_cancelled", "referral", id, {});
  return res.json({ message: "Referral cancelled", id: Number(id) });
};
