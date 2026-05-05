import { query } from "../config/db.js";

export const createAppointment = async (req, res) => {
  const { preferredDate, preferredSlots, isUrgent, phoneNumber, reason } = req.body;
  const studentId = req.user?.id;

  if (!preferredDate || !preferredSlots?.length || !phoneNumber || !reason) {
    return res.status(400).json({ message: "Missing required appointment fields" });
  }

  const slots = Array.isArray(preferredSlots) ? preferredSlots.join(",") : preferredSlots;

  const result = await query(
    `INSERT INTO appointments
      (student_id, counselor_id, appointment_type, preferred_date, preferred_time, status, reason, phone_number, is_urgent, preferred_slots)
     VALUES
      (?, NULL, 'counseling', ?, NULL, 'pending', ?, ?, ?, ?)` ,
    [studentId, preferredDate, reason, phoneNumber, isUrgent ? 1 : 0, slots]
  );

  return res.status(201).json({
    message: "Appointment request submitted",
    id: result.insertId,
  });
};

export const listAppointmentsForUser = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (role === "student") {
    const rows = await query(
      `SELECT a.*, u.name AS counselorName
       FROM appointments a
       LEFT JOIN users u ON a.counselor_id = u.id
       WHERE a.student_id = ?
       ORDER BY a.created_at DESC`,
      [userId]
    );
    return res.json(rows);
  }

  const rows = await query(
    `SELECT a.*, s.name AS studentName, s.college, s.student_id AS studentId, c.name AS counselorName
     FROM appointments a
     LEFT JOIN users s ON a.student_id = s.id
     LEFT JOIN users c ON a.counselor_id = c.id
     ORDER BY a.created_at DESC`
  );
  return res.json(rows);
};
