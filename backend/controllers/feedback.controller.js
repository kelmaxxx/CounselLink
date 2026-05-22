import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";

export const submitFeedback = async (req, res) => {
  const { counselorId, appointmentId, rating, comment } = req.body || {};
  const studentId = req.user?.id;

  const ratingNum = Number(rating);
  if (!counselorId || !ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ message: "counselorId and rating (1-5) are required" });
  }

  const counselor = await query("SELECT id FROM users WHERE id = ? AND role = 'counselor'", [
    counselorId,
  ]);
  if (!counselor.length) {
    return res.status(404).json({ message: "Counselor not found" });
  }

  const result = await query(
    `INSERT INTO feedback (student_id, counselor_id, appointment_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [studentId, counselorId, appointmentId || null, ratingNum, comment || null]
  );

  await query(
    `INSERT INTO notifications (user_id, title, message, status, link)
     VALUES (?, ?, ?, 'unread', ?)`,
    [
      counselorId,
      "New feedback received",
      `A student left ${ratingNum}-star feedback${comment ? `: "${comment.slice(0, 80)}"` : "."}`,
      "/counselor/profile",
    ]
  );

  await logAction(req, "submit_feedback", "feedback", result.insertId, {
    counselorId,
    rating: ratingNum,
  });

  return res.status(201).json({ message: "Feedback submitted", id: result.insertId });
};

export const listFeedback = async (req, res) => {
  const callerId = req.user?.id;
  const callerRole = req.user?.role;
  let { counselorId } = req.query;

  if (counselorId === "me") counselorId = callerId;
  if (!counselorId) {
    return res.status(400).json({ message: "counselorId is required" });
  }

  // counselors can only see their own feedback; admin can see any
  if (callerRole === "counselor" && Number(counselorId) !== callerId) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (callerRole !== "counselor" && callerRole !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const rows = await query(
    `SELECT f.id, f.rating, f.comment, f.created_at, f.appointment_id,
            f.student_id, u.name AS studentName
     FROM feedback f
     LEFT JOIN users u ON f.student_id = u.id
     WHERE f.counselor_id = ?
     ORDER BY f.created_at DESC`,
    [counselorId]
  );

  const avg = rows.length
    ? rows.reduce((acc, r) => acc + Number(r.rating), 0) / rows.length
    : null;

  return res.json({ items: rows, count: rows.length, average: avg });
};
