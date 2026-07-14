import crypto from "crypto";
import bcrypt from "bcryptjs";
import { query, withTransaction } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification } from "../utils/notify.js";
import { notifyUser, notifyRole } from "../events.js";
import { isValidPhMobile } from "../utils/validators.js";

const NATURE_OF_CONCERN_OPTIONS = [
  "Academic Concern",
  "Behavioral Concern",
  "Mental Health Concern",
  "Family Problem",
  "Social/Relationship Concern",
  "Other",
];

const baseSelect = `
  SELECT r.id, r.student_id, r.referrer_id, r.receiving_counselor_id,
         r.reason, r.notes, r.status, r.decision_note, r.decided_at,
         r.created_at, r.updated_at, r.student_department AS studentDepartment,
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
  const {
    fullName,
    studentIdNumber,
    college,
    department,
    contactNumber,
    natureOfConcern,
    natureOfConcernOther,
    description,
    receivingCounselorId,
  } = req.body || {};

  const trimmed = {
    fullName: (fullName || "").trim(),
    studentIdNumber: (studentIdNumber || "").trim(),
    college: (college || req.user?.college || "").trim(),
    department: (department || "").trim(),
    contactNumber: (contactNumber || "").trim(),
    natureOfConcern: (natureOfConcern || "").trim(),
    natureOfConcernOther: (natureOfConcernOther || "").trim(),
    description: (description || "").trim(),
  };

  const hasAllRequired =
    trimmed.fullName &&
    trimmed.studentIdNumber &&
    trimmed.college &&
    trimmed.contactNumber &&
    trimmed.natureOfConcern &&
    trimmed.description &&
    NATURE_OF_CONCERN_OPTIONS.includes(trimmed.natureOfConcern) &&
    (trimmed.natureOfConcern !== "Other" || trimmed.natureOfConcernOther);

  if (!hasAllRequired) {
    return res.status(400).json({ message: "Please complete all required fields." });
  }

  if (!isValidPhMobile(trimmed.contactNumber)) {
    return res.status(400).json({ message: "Contact number must start with 09 and have 11 digits" });
  }

  if (req.user?.college && trimmed.college !== req.user.college) {
    return res
      .status(403)
      .json({ message: "You can only refer students from your own college" });
  }

  // Match against an existing student record (registered or a previous
  // referral/walk-in placeholder) by Student ID so we don't create duplicates.
  const existingStudents = await query(
    "SELECT id, name, college FROM users WHERE student_id = ? AND role = 'student' LIMIT 1",
    [trimmed.studentIdNumber]
  );

  let student;
  let placeholderCreated = false;

  if (existingStudents.length > 0) {
    student = existingStudents[0];
  } else {
    // No account for this Student ID yet — create a placeholder student
    // record so the referral can be linked to a student_id FK and the
    // student shows up in Student Records. It can't be logged into (random
    // password, synthetic email) and gets claimed/updated automatically if
    // this student later registers with the same Student ID.
    const placeholderEmail = `referral-${trimmed.studentIdNumber.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}@placeholder.counselink.local`;
    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

    const userResult = await query(
      `INSERT INTO users (name, email, password, role, status, college, student_id, phone, is_placeholder)
       VALUES (?, ?, ?, 'student', 'approved', ?, ?, ?, 1)`,
      [trimmed.fullName, placeholderEmail, randomPassword, trimmed.college, trimmed.studentIdNumber, trimmed.contactNumber]
    );
    student = { id: userResult.insertId, name: trimmed.fullName, college: trimmed.college };
    placeholderCreated = true;
  }

  const concernLabel =
    trimmed.natureOfConcern === "Other"
      ? `Other - ${trimmed.natureOfConcernOther}`
      : trimmed.natureOfConcern;
  const reason = `${concernLabel}\n\n${trimmed.description}`;

  const result = await query(
    `INSERT INTO referrals
       (student_id, referrer_id, receiving_counselor_id, reason, notes, status, student_department)
     VALUES (?, ?, NULL, ?, NULL, 'pending', ?)`,
    [student.id, referrerId, reason, trimmed.department || null]
  );

  // Notify all counselors since the referral is not assigned to a specific one.
  const allCounselors = await query("SELECT id FROM users WHERE role = 'counselor' AND status = 'approved'", []);
  for (const c of allCounselors) {
    await createNotification({
      userId: c.id,
      title: "New referral received",
      message: `${req.user?.name || "A College"} referred ${student.name} for counseling.`,
      link: `/counselor/referrals`,
    });
  }
  notifyRole("counselor", { type: "referrals" });

  await logAction(req, "create_referral", "referral", result.insertId, {
    studentIdNumber: trimmed.studentIdNumber,
    studentId: student.id,
    placeholderCreated,
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
    conditions.push("(r.receiving_counselor_id IS NULL OR r.receiving_counselor_id = ?)");
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
  const isCounselorWithAccess =
    role === "counselor" &&
    (r.receiving_counselor_id === null || r.receiving_counselor_id === userId);
  if (role !== "admin" && r.referrer_id !== userId && !isCounselorWithAccess) {
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
  if (referral.receiving_counselor_id !== null && referral.receiving_counselor_id !== userId) {
    return res.status(403).json({ message: "Only the assigned counselor can decide" });
  }
  if (referral.status !== "pending") {
    return res.status(409).json({ message: `Referral is already ${referral.status}` });
  }

  const normalizedDate = status === "accepted" ? normalizeDate(scheduledDate) : null;
  const trimmedTime = status === "accepted" ? String(scheduledTime).trim() : null;

  const getQueueSlot = (slot) => {
    const s = (slot || "").toLowerCase();
    if (s === "afternoon" || s.startsWith("1:") || s.startsWith("2:") || s.startsWith("3:")) return "PM";
    if (!s) return null;
    return "AM";
  };

  const appointmentId = await withTransaction(async (q) => {
    await q(
      "UPDATE referrals SET status = ?, decision_note = ?, decided_at = NOW(), receiving_counselor_id = ? WHERE id = ?",
      [status, decisionNote?.trim() || null, userId, id]
    );

    if (status !== "accepted") return null;

    const queueSlot = getQueueSlot(trimmedTime);
    let queueNumber = null;
    if (queueSlot && normalizedDate) {
      const [{ cnt }] = await q(
        `SELECT COUNT(*) AS cnt FROM appointments
         WHERE queue_date = ? AND queue_slot = ? AND queue_number IS NOT NULL AND appointment_type = 'counseling'`,
        [normalizedDate, queueSlot]
      );
      if (cnt < 10) queueNumber = cnt + 1;
    }

    const insertResult = await q(
      `INSERT INTO appointments
         (student_id, counselor_id, referral_id, appointment_type, status, reason,
          scheduled_date, scheduled_time, queue_date, queue_slot, queue_number)
       VALUES (?, ?, ?, 'counseling', 'approved', ?, ?, ?, ?, ?, ?)`,
      [
        referral.student_id,
        userId,
        referral.id,
        referral.reason,
        normalizedDate,
        trimmedTime,
        normalizedDate,
        queueSlot,
        queueNumber,
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
  // Refresh all counselors' referral list (accepted referral leaves pending) and
  // the acting counselor's appointments list (new appointment was created).
  notifyRole("counselor", { type: "referrals" });
  notifyUser(userId, { type: "appointments" });

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
  if (referral.receiving_counselor_id) {
    notifyUser(referral.receiving_counselor_id, { type: "referrals" });
  } else {
    notifyRole("counselor", { type: "referrals" });
  }
  await logAction(req, "referral_cancelled", "referral", id, {});
  return res.json({ message: "Referral cancelled", id: Number(id) });
};
