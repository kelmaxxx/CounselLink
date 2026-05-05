import { query } from "../config/db.js";

const createNotification = async ({ userId, title, message, link }) => {
  await query(
    "INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)",
    [userId, title, message, link]
  );
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return value;
};

export const createTestRequest = async (req, res) => {
  const { preferredDate, preferredSlots, phoneNumber, reason, testType } = req.body;
  const studentId = req.user?.id;

  if (!preferredDate || !preferredSlots?.length || !phoneNumber || !reason) {
    return res.status(400).json({ message: "Missing required test request fields" });
  }

  const slots = Array.isArray(preferredSlots) ? preferredSlots.join(",") : preferredSlots;
  const normalizedDate = normalizeDate(preferredDate);

  const result = await query(
    `INSERT INTO appointments
      (student_id, counselor_id, appointment_type, preferred_date, preferred_time, status, reason, phone_number, is_urgent, preferred_slots)
     VALUES
      (?, NULL, 'psychological_test', ?, NULL, 'pending', ?, ?, 0, ?)` ,
    [studentId, normalizedDate, reason, phoneNumber, slots]
  );

  return res.status(201).json({
    message: "Psychological test request submitted",
    id: result.insertId,
  });
};

export const listTestsForUser = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (role === "student") {
    const rows = await query(
      `SELECT a.*, u.name AS counselorName
       FROM appointments a
       LEFT JOIN users u ON a.counselor_id = u.id
       WHERE a.student_id = ? AND a.appointment_type = 'psychological_test'
       ORDER BY a.created_at DESC`,
      [userId]
    );
    return res.json(rows);
  }

  if (role === "counselor") {
    const rows = await query(
      `SELECT a.*, u.name AS studentName, u.college, u.student_id AS studentId
       FROM appointments a
       JOIN users u ON a.student_id = u.id
       WHERE a.appointment_type = 'psychological_test'
         AND (a.counselor_id IS NULL OR a.counselor_id = ?)
       ORDER BY a.created_at DESC`,
      [userId]
    );
    return res.json(rows);
  }

  const rows = await query(
    `SELECT a.*, s.name AS studentName, c.name AS counselorName
     FROM appointments a
     LEFT JOIN users s ON a.student_id = s.id
     LEFT JOIN users c ON a.counselor_id = c.id
     WHERE a.appointment_type = 'psychological_test'
     ORDER BY a.created_at DESC`
  );
  return res.json(rows);
};

export const acceptTest = async (req, res) => {
  const { id } = req.params;
  const { date, timeSlot, note } = req.body;
  const counselorId = req.user?.id;

  if (!date || !timeSlot) {
    return res.status(400).json({ message: "Date and time slot are required" });
  }

  const normalizedDate = normalizeDate(date);

  await query(
    "UPDATE appointments SET status='approved', counselor_id=?, scheduled_date=?, scheduled_time=?, counselor_action_note=?, updated_at=NOW() WHERE id=?",
    [counselorId, normalizedDate, timeSlot, note || null, id]
  );

  const rows = await query("SELECT student_id FROM appointments WHERE id = ?", [id]);
  if (rows.length) {
    await createNotification({
      userId: rows[0].student_id,
      title: "Test Request Approved",
      message: `Your test request is approved for ${normalizedDate} at ${timeSlot}.`,
      link: "/student/tests",
    });
  }

  return res.json({ message: "Test request approved" });
};

export const rejectTest = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const counselorId = req.user?.id;

  await query(
    "UPDATE appointments SET status='rejected', counselor_id=?, counselor_action_note=?, updated_at=NOW() WHERE id=?",
    [counselorId, note || null, id]
  );

  const rows = await query("SELECT student_id FROM appointments WHERE id = ?", [id]);
  if (rows.length) {
    await createNotification({
      userId: rows[0].student_id,
      title: "Test Request Rejected",
      message: note ? `Your test request was rejected. Reason: ${note}` : "Your test request was rejected.",
      link: "/student/tests",
    });
  }

  return res.json({ message: "Test request rejected" });
};

export const rescheduleTest = async (req, res) => {
  const { id } = req.params;
  const { date, timeSlot, note } = req.body;
  const counselorId = req.user?.id;

  if (!date || !timeSlot) {
    return res.status(400).json({ message: "Date and time slot are required" });
  }

  const normalizedDate = normalizeDate(date);

  await query(
    "UPDATE appointments SET status='rescheduled', counselor_id=?, scheduled_date=?, scheduled_time=?, counselor_action_note=?, updated_at=NOW() WHERE id=?",
    [counselorId, normalizedDate, timeSlot, note || null, id]
  );

  const rows = await query("SELECT student_id FROM appointments WHERE id = ?", [id]);
  if (rows.length) {
    await createNotification({
      userId: rows[0].student_id,
      title: "Test Request Rescheduled",
      message: `Your test request was rescheduled to ${normalizedDate} at ${timeSlot}.`,
      link: "/student/tests",
    });
  }

  return res.json({ message: "Test request rescheduled" });
};
