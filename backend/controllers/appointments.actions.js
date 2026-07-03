import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification } from "../utils/notify.js";
import { notifyUser, notifyRole } from "../events.js";

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

  const [appt] = await query("SELECT is_urgent FROM appointments WHERE id = ?", [id]);
  const isUrgent = appt?.is_urgent;

  if (!isUrgent && (!date || !timeSlot)) {
    return res.status(400).json({ message: "Date and time slot are required" });
  }

  const normalizedDate = isUrgent ? null : normalizeDate(date);
  const normalizedSlot = isUrgent ? null : timeSlot;

  await query(
    "UPDATE appointments SET status='approved', counselor_id=?, scheduled_date=?, scheduled_time=?, counselor_action_note=?, updated_at=NOW() WHERE id=?",
    [counselorId, normalizedDate, normalizedSlot, note || null, id]
  );

  await logAction(req, "accept_appointment", "appointment", id, { date: normalizedDate, timeSlot: normalizedSlot });

  const rows = await query("SELECT student_id FROM appointments WHERE id = ?", [id]);
  if (rows.length) {
    const notifMsg = isUrgent
      ? "Your urgent appointment request has been approved. Please proceed to the counselor's office."
      : `Your appointment is approved for ${normalizedDate} at ${normalizedSlot}.`;
    await createNotification({
      userId: rows[0].student_id,
      title: "Appointment Approved",
      message: notifMsg,
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
    "SELECT counselor_id, status, student_id, is_urgent, appointment_type FROM appointments WHERE id = ?",
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
  const allowedFromPending = appt.status === "pending" && appt.is_urgent;
  if (!["approved", "rescheduled"].includes(appt.status) && !allowedFromPending) {
    return res.status(409).json({
      message: `Only approved or rescheduled appointments can be marked done (was: ${appt.status})`,
    });
  }

  await query(
    "UPDATE appointments SET status='completed', counselor_id=?, updated_at=NOW() WHERE id=?",
    [counselorId, id]
  );

  await logAction(req, "complete_appointment", "appointment", id, {});

  const isTest = appt.appointment_type === "psychological_test";

  await createNotification({
    userId: appt.student_id,
    title: isTest ? "Psychological test completed" : "Counseling session completed",
    message: isTest
      ? "Your psychological test has been marked as completed by the counselor."
      : "Your counseling session has been marked as completed by the counselor.",
    link: isTest ? "/student/tests" : "/student/appointments",
  });
  notifyUser(appt.student_id, { type: isTest ? "tests" : "appointments" });
  if (isTest) {
    // Tests live in their own frontend context (TestsContext), separate from
    // AppointmentsContext, even though both read from the appointments table —
    // so completing one needs its own "tests" signal to refresh other counselor
    // sessions/tabs watching the same queue.
    notifyRole("counselor", { type: "tests" });
  }

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
