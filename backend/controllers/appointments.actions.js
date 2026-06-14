import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification } from "../utils/notify.js";
import { notifyUser } from "../events.js";

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

  await logAction(req, "accept_appointment", "appointment", id, { date: normalizedDate, timeSlot });

  const rows = await query("SELECT student_id FROM appointments WHERE id = ?", [id]);
  if (rows.length) {
    await createNotification({
      userId: rows[0].student_id,
      title: "Appointment Approved",
      message: `Your appointment is approved for ${normalizedDate} at ${timeSlot}.`,
      link: "/student/appointments",
    });
    notifyUser(rows[0].student_id, { type: "appointments" });
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

  await logAction(req, "reject_appointment", "appointment", id, { note: note || null });

  const rows = await query("SELECT student_id FROM appointments WHERE id = ?", [id]);
  if (rows.length) {
    await createNotification({
      userId: rows[0].student_id,
      title: "Appointment Rejected",
      message: note ? `Your appointment was rejected. Reason: ${note}` : "Your appointment was rejected.",
      link: "/student/appointments",
    });
    notifyUser(rows[0].student_id, { type: "appointments" });
  }

  return res.json({ message: "Appointment rejected" });
};

export const completeAppointment = async (req, res) => {
  const { id } = req.params;
  const counselorId = req.user?.id;

  const rows = await query(
    "SELECT counselor_id, status, student_id FROM appointments WHERE id = ?",
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: "Appointment not found" });
  const appt = rows[0];
  if (appt.counselor_id && appt.counselor_id !== counselorId) {
    return res.status(403).json({ message: "You can only complete your own appointments" });
  }
  if (appt.status === "completed") {
    return res.status(409).json({ message: "Appointment is already completed" });
  }
  if (!["approved", "rescheduled"].includes(appt.status)) {
    return res.status(409).json({
      message: `Only approved or rescheduled appointments can be marked done (was: ${appt.status})`,
    });
  }

  await query(
    "UPDATE appointments SET status='completed', counselor_id=?, updated_at=NOW() WHERE id=?",
    [counselorId, id]
  );

  await logAction(req, "complete_appointment", "appointment", id, {});

  await createNotification({
    userId: appt.student_id,
    title: "Counseling session completed",
    message: "Your counseling session has been marked as completed by the counselor.",
    link: "/student/appointments",
  });
  notifyUser(appt.student_id, { type: "appointments" });

  return res.json({ message: "Appointment marked as completed" });
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

  await logAction(req, "reschedule_appointment", "appointment", id, { date: normalizedDate, timeSlot });

  const rows = await query("SELECT student_id FROM appointments WHERE id = ?", [id]);
  if (rows.length) {
    await createNotification({
      userId: rows[0].student_id,
      title: "Appointment Rescheduled",
      message: `Your appointment was rescheduled to ${normalizedDate} at ${timeSlot}.`,
      link: "/student/appointments",
    });
    notifyUser(rows[0].student_id, { type: "appointments" });
  }

  return res.json({ message: "Appointment rescheduled" });
};
