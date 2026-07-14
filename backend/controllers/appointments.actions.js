import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification } from "../utils/notify.js";
import { sendAppointmentStatusEmail } from "../utils/appointment-emails.js";
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

const getQueueSlot = (slot) => {
  const s = (slot || "").toLowerCase();
  if (s === "afternoon" || s.startsWith("1:") || s.startsWith("2:") || s.startsWith("3:")) return "PM";
  if (!s) return null;
  return "AM";
};

export const acceptAppointment = async (req, res) => {
  const { id } = req.params;
  const { date, timeSlot, note } = req.body;
  const counselorId = req.user?.id;

  const [appt] = await query("SELECT is_urgent, queue_number FROM appointments WHERE id = ?", [id]);
  const isUrgent = appt?.is_urgent;

  if (!isUrgent && (!date || !timeSlot)) {
    return res.status(400).json({ message: "Date and time slot are required" });
  }

  const normalizedDate = isUrgent ? null : normalizeDate(date);
  const normalizedSlot = isUrgent ? null : timeSlot;

  let queueNumber = appt?.queue_number ?? null; // preserve urgent queue numbers
  let queueDate = null;
  let queueSlot = null;

  if (!isUrgent && normalizedDate && normalizedSlot) {
    queueSlot = getQueueSlot(normalizedSlot);
    queueDate = normalizedDate;

    const [{ cnt }] = await query(
      `SELECT COUNT(*) AS cnt FROM appointments
       WHERE queue_date = ? AND queue_slot = ? AND queue_number IS NOT NULL AND appointment_type = 'counseling'`,
      [queueDate, queueSlot]
    );

    if (cnt >= 10) {
      return res.status(409).json({
        message: `The ${queueSlot === "AM" ? "morning" : "afternoon"} queue for ${queueDate} is full (10 appointments). Please reschedule to a different date or time slot.`,
      });
    }

    queueNumber = cnt + 1;
  }

  await query(
    `UPDATE appointments
     SET status='approved', counselor_id=?, scheduled_date=?, scheduled_time=?, counselor_action_note=?,
         queue_number=?, queue_date=?, queue_slot=?, updated_at=NOW()
     WHERE id=?`,
    [counselorId, normalizedDate, normalizedSlot, note || null, queueNumber, queueDate, queueSlot, id]
  );

  await logAction(req, "accept_appointment", "appointment", id, { date: normalizedDate, timeSlot: normalizedSlot });

  const rows = await query("SELECT student_id FROM appointments WHERE id = ?", [id]);
  if (rows.length) {
    const queueInfo = !isUrgent && queueNumber ? ` Your queue number is ${queueSlot} #${queueNumber}.` : "";
    const notifMsg = isUrgent
      ? "Your urgent appointment request has been approved. Please proceed to the counselor's office."
      : `Your appointment is approved for ${normalizedDate} at ${normalizedSlot}.${queueInfo}`;
    await createNotification({
      userId: rows[0].student_id,
      title: "Appointment Approved",
      message: notifMsg,
      link: "/student/appointments",
    });
    notifyUser(rows[0].student_id, { type: "appointments" });
    sendAppointmentStatusEmail({
      studentId: rows[0].student_id,
      status: "approved",
      date: normalizedDate,
      timeSlot: normalizedSlot,
      note: note || null,
      isUrgent,
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
    sendAppointmentStatusEmail({
      studentId: rows[0].student_id,
      status: "rejected",
      note: note || null,
    });
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
  sendAppointmentStatusEmail({
    studentId: appt.student_id,
    status: "completed",
    isTest,
  });
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
    sendAppointmentStatusEmail({
      studentId: rows[0].student_id,
      status: "rescheduled",
      date: normalizedDate,
      timeSlot,
      note: note || null,
    });
  }

  return res.json({ message: "Appointment rescheduled" });
};

export const removeNoShows = async (req, res) => {
  const toRemove = await query(
    `SELECT id, student_id, scheduled_date
     FROM appointments
     WHERE status IN ('approved', 'rescheduled')
       AND scheduled_date IS NOT NULL
       AND (
         scheduled_date < CURDATE()
         OR (
           scheduled_date = CURDATE()
           AND (
             (scheduled_time IN ('morning', '9:00-10:00', '10:00-11:00', '11:00-12:00') AND CURTIME() >= '12:00:00')
             OR (scheduled_time IN ('afternoon', '1:00-2:00', '2:00-3:00', '3:00-4:00') AND CURTIME() >= '17:00:00')
             OR (scheduled_time IS NULL AND CURTIME() >= '17:00:00')
           )
         )
       )`,
    []
  );

  if (!toRemove.length) return res.json({ removed: 0 });

  const ids = toRemove.map((r) => r.id);
  await query(
    `UPDATE appointments SET status = 'no_show', updated_at = NOW() WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids
  );

  for (const row of toRemove) {
    await createNotification({
      userId: row.student_id,
      title: "Appointment Closed — No Show",
      message: `Your appointment scheduled for ${row.scheduled_date} was automatically closed because the scheduled date has passed without a completed session.`,
      link: "/student/appointments",
      type: "warning",
    });
    notifyUser(row.student_id, { type: "appointments" });
  }

  await logAction(req, "remove_no_shows", "appointment", null, { count: toRemove.length });
  notifyRole("counselor", { type: "appointments" });

  return res.json({ removed: toRemove.length });
};
