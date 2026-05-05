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

export const acceptAppointment = async (req, res) => {
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
      title: "Appointment Approved",
      message: `Your appointment is approved for ${normalizedDate} at ${timeSlot}.`,
      link: "/student/appointments",
    });
  }

  return res.json({ message: "Appointment approved" });
};

export const rejectAppointment = async (req, res) => {
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
      title: "Appointment Rejected",
      message: note ? `Your appointment was rejected. Reason: ${note}` : "Your appointment was rejected.",
      link: "/student/appointments",
    });
  }

  return res.json({ message: "Appointment rejected" });
};

export const rescheduleAppointment = async (req, res) => {
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
      title: "Appointment Rescheduled",
      message: `Your appointment was rescheduled to ${normalizedDate} at ${timeSlot}.`,
      link: "/student/appointments",
    });
  }

  return res.json({ message: "Appointment rescheduled" });
};
