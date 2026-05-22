import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";

const baseSelect = `
  SELECT r.id, r.student_id, r.referring_counselor_id, r.receiving_counselor_id,
         r.reason, r.notes, r.status, r.decision_note, r.decided_at,
         r.created_at, r.updated_at,
         stu.name AS studentName, stu.email AS studentEmail, stu.college AS studentCollege,
         ref.name AS referringCounselorName,
         rec.name AS receivingCounselorName
  FROM referrals r
  LEFT JOIN users stu ON r.student_id = stu.id
  LEFT JOIN users ref ON r.referring_counselor_id = ref.id
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
  if (Number(receivingCounselorId) === referrerId) {
    return res.status(400).json({ message: "Cannot refer a student to yourself" });
  }

  const [student] = await query(
    "SELECT id, name FROM users WHERE id = ? AND role = 'student'",
    [studentId]
  );
  if (!student) return res.status(404).json({ message: "Student not found" });

  const [receiver] = await query(
    "SELECT id, name FROM users WHERE id = ? AND role = 'counselor'",
    [receivingCounselorId]
  );
  if (!receiver) return res.status(404).json({ message: "Receiving counselor not found" });

  const result = await query(
    `INSERT INTO referrals
       (student_id, referring_counselor_id, receiving_counselor_id, reason, notes, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [studentId, referrerId, receivingCounselorId, reason.trim(), notes || null]
  );

  await query(
    `INSERT INTO notifications (user_id, title, message, status, link)
     VALUES (?, ?, ?, 'unread', ?)`,
    [
      receivingCounselorId,
      "New referral received",
      `${req.user?.email || "A counselor"} referred ${student.name} to you.`,
      `/counselor/referrals`,
    ]
  );

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

  if (role !== "counselor" && role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const conditions = [];
  const params = [];

  if (role === "counselor") {
    if (direction === "incoming") {
      conditions.push("r.receiving_counselor_id = ?");
      params.push(userId);
    } else if (direction === "outgoing") {
      conditions.push("r.referring_counselor_id = ?");
      params.push(userId);
    } else {
      conditions.push("(r.referring_counselor_id = ? OR r.receiving_counselor_id = ?)");
      params.push(userId, userId);
    }
  }

  if (status) {
    conditions.push("r.status = ?");
    params.push(status);
  }

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
    r.referring_counselor_id !== userId &&
    r.receiving_counselor_id !== userId
  ) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return res.json(r);
};

export const decideReferral = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { status, decisionNote } = req.body || {};

  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "status must be 'accepted' or 'rejected'" });
  }
  if (status === "rejected" && !decisionNote?.trim()) {
    return res.status(400).json({ message: "A decision note is required when rejecting" });
  }

  const [referral] = await query(
    "SELECT id, receiving_counselor_id, referring_counselor_id, status, student_id FROM referrals WHERE id = ?",
    [id]
  );
  if (!referral) return res.status(404).json({ message: "Referral not found" });
  if (referral.receiving_counselor_id !== userId) {
    return res.status(403).json({ message: "Only the receiving counselor can decide" });
  }
  if (referral.status !== "pending") {
    return res.status(409).json({ message: `Referral is already ${referral.status}` });
  }

  await query(
    "UPDATE referrals SET status = ?, decision_note = ?, decided_at = NOW() WHERE id = ?",
    [status, decisionNote?.trim() || null, id]
  );

  await query(
    `INSERT INTO notifications (user_id, title, message, status, link)
     VALUES (?, ?, ?, 'unread', ?)`,
    [
      referral.referring_counselor_id,
      `Referral ${status}`,
      decisionNote?.trim()
        ? `Your referral was ${status}. Note: ${decisionNote.trim().slice(0, 120)}`
        : `Your referral was ${status}.`,
      `/counselor/referrals`,
    ]
  );

  await logAction(req, `referral_${status}`, "referral", id, { decisionNote: decisionNote || null });

  return res.json({ message: `Referral ${status}`, id: Number(id) });
};

export const cancelReferral = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const [referral] = await query(
    "SELECT id, referring_counselor_id, status FROM referrals WHERE id = ?",
    [id]
  );
  if (!referral) return res.status(404).json({ message: "Referral not found" });
  if (referral.referring_counselor_id !== userId) {
    return res.status(403).json({ message: "Only the referring counselor can cancel" });
  }
  if (referral.status !== "pending") {
    return res.status(409).json({ message: `Cannot cancel a ${referral.status} referral` });
  }

  await query("UPDATE referrals SET status = 'cancelled' WHERE id = ?", [id]);
  await logAction(req, "referral_cancelled", "referral", id, {});
  return res.json({ message: "Referral cancelled", id: Number(id) });
};
