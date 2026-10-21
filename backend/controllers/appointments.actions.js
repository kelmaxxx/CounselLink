import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification, notifyUsers } from "../utils/notify.js";
import { sendAppointmentStatusEmail } from "../utils/appointment-emails.js";
import { notifyUser, notifyRole } from "../events.js";
import { validateSchedule } from "../utils/scheduling.js";
import { evaluateMissedStreak, evaluateCancellationStreak } from "../utils/attendance-monitor.js";

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

const QUEUE_LIMIT = 50;

const getQueueSlot = (slot) => {
  const s = (slot || "").toLowerCase();
  // Two-block system: AM = 9AM-12PM, PM = 1PM-5PM (+ legacy hourly slots)
  if (s === "afternoon" || s === "1:00-5:00" || s.startsWith("1:") || s.startsWith("2:") || s.startsWith("3:") || s.startsWith("4:")) return "PM";
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

  // Server-clock validation: future weekday + block not already passed today.
  if (!isUrgent) {
    const schedCheck = validateSchedule(date, timeSlot);
    if (!schedCheck.ok) {
      return res.status(400).json({ message: schedCheck.message });
    }
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
       WHERE queue_date = ? AND queue_slot = ? AND queue_number IS NOT NULL`,
      [queueDate, queueSlot]
    );

    if (cnt >= QUEUE_LIMIT) {
      return res.status(409).json({
        message: `The ${queueSlot === "AM" ? "morning" : "afternoon"} queue for ${queueDate} is full (50 appointments). Please reschedule to a different date or time slot.`,
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
      counselorId,
      queueNo: queueNumber,
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
      counselorId,
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
  if (!["approved", "rescheduled", "no_show", "missed"].includes(appt.status) && !allowedFromPending) {
    return res.status(409).json({
      message: `Only approved, rescheduled, or missed appointments can be marked done (was: ${appt.status})`,
    });
  }

  await query(
    "UPDATE appointments SET status='completed', counselor_id=?, updated_at=NOW() WHERE id=?",
    [counselorId, id]
  );

  await logAction(req, "complete_appointment", "appointment", id, {});

  const isTest = appt.appointment_type === "psychological_test";

  // Counseling outcomes are announced when the counselor submits the Session
  // Report (finalizeSession), which is the formal completion/termination point.
  // Announcing here as well would double-notify students and could contradict a
  // later termination, so only psychological tests notify at this step.
  if (isTest) {
    await createNotification({
      userId: appt.student_id,
      title: "Psychological test completed",
      message: "Your psychological test has been marked as completed by the counselor.",
      link: "/student/consent",
    });
    notifyUser(appt.student_id, { type: "tests" });
    sendAppointmentStatusEmail({
      studentId: appt.student_id,
      status: "completed",
      isTest,
    });
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

  const schedCheck = validateSchedule(date, timeSlot);
  if (!schedCheck.ok) {
    return res.status(400).json({ message: schedCheck.message });
  }

  const normalizedDate = normalizeDate(date);

  // ── Assign a queue number (same logic as acceptAppointment) ──────────
  const queueSlot = getQueueSlot(timeSlot);
  const queueDate = normalizedDate;

  const [{ cnt }] = await query(
    `SELECT COUNT(*) AS cnt FROM appointments
     WHERE queue_date = ? AND queue_slot = ? AND queue_number IS NOT NULL AND id <> ?`,
    [queueDate, queueSlot, id]
  );

  if (cnt >= QUEUE_LIMIT) {
    return res.status(409).json({
      message: `The ${queueSlot === "AM" ? "morning" : "afternoon"} queue for ${queueDate} is full (50 appointments). Please choose a different date or time slot.`,
    });
  }

  const queueNumber = cnt + 1;

  await query(
    `UPDATE appointments
     SET status='rescheduled', counselor_id=?, scheduled_date=?, scheduled_time=?,
         counselor_action_note=?, queue_number=?, queue_date=?, queue_slot=?, updated_at=NOW()
     WHERE id=?`,
    [counselorId, normalizedDate, timeSlot, note || null, queueNumber, queueDate, queueSlot, id]
  );

  await logAction(req, "reschedule_appointment", "appointment", id, { date: normalizedDate, timeSlot });

  const rows = await query("SELECT student_id FROM appointments WHERE id = ?", [id]);
  if (rows.length) {
    const queueInfo = ` Your queue number is ${queueSlot} #${queueNumber}.`;
    await createNotification({
      userId: rows[0].student_id,
      title: "Appointment Rescheduled",
      message: `Your appointment was rescheduled to ${normalizedDate} at ${timeSlot}.${queueInfo}`,
      link: "/student/appointments",
    });
    notifyUser(rows[0].student_id, { type: "appointments" });
    sendAppointmentStatusEmail({
      studentId: rows[0].student_id,
      status: "rescheduled",
      date: normalizedDate,
      timeSlot,
      note: note || null,
      counselorId,
      queueNo: queueNumber,
    });
  }

  return res.json({ message: "Appointment rescheduled" });
};

// Manual attendance outcome. There is deliberately no time-based sweep: a
// counselor (or admin) decides when an appointment was actually missed.
export const markMissed = async (req, res) => {
  const { id } = req.params;
  const actorId = req.user?.id;

  const rows = await query(
    "SELECT counselor_id, status, student_id FROM appointments WHERE id = ?",
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: "Appointment not found" });
  const appt = rows[0];

  if (req.user?.role === "counselor" && appt.counselor_id && appt.counselor_id !== actorId) {
    return res.status(403).json({ message: "You can only update your own appointments" });
  }
  if (!["approved", "rescheduled"].includes(appt.status)) {
    return res.status(409).json({
      message: `Only approved or rescheduled appointments can be marked missed (was: ${appt.status})`,
    });
  }

  await query(
    `UPDATE appointments
     SET status = 'missed', counselor_id = COALESCE(counselor_id, ?),
         outcome_marked_by = ?, outcome_marked_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [actorId, actorId, id]
  );

  await logAction(req, "mark_appointment_missed", "appointment", id, {
    studentId: appt.student_id,
  });

  await createNotification({
    userId: appt.student_id,
    title: "Appointment marked as missed",
    message: "Your scheduled appointment was marked as missed by the counselor. Please contact the Guidance and Counseling Section if you need to reschedule.",
    link: "/student/appointments",
    type: "warning",
    dedupeKey: `missed-notice-${id}`,
  });
  notifyUser(appt.student_id, { type: "appointments" });
  notifyRole("counselor", { type: "appointments" });

  await evaluateMissedStreak(appt.student_id, Number(id));

  return res.json({ message: "Appointment marked as missed" });
};

export const deleteAppointment = async (req, res) => {
  const { id } = req.params;
  const rows = await query("SELECT student_id, status FROM appointments WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ message: "Not found" });

  const apt = rows[0];
  if (apt.student_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (!["pending", "approved", "rescheduled"].includes(apt.status)) {
    return res.status(400).json({ message: "Can only cancel pending or scheduled appointments" });
  }

  // Soft cancel: keeping the row is what makes cancellation streaks auditable.
  await query(
    `UPDATE appointments
     SET status = 'canceled', canceled_by = ?, canceled_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [req.user.id, id]
  );
  await logAction(req, "cancel_appointment", "appointment", id, { status: apt.status });
  notifyRole("counselor", { type: "appointments" });

  await evaluateCancellationStreak(apt.student_id, Number(id));

  res.json({ message: "Appointment canceled successfully" });
};

// Student-initiated reschedule: the student picks a new preferred date/slot
// for their own counseling request. Pending requests just update the
// preference; already-approved/rescheduled ones revert to pending (clearing
// the confirmed schedule + queue) so a counselor re-approves the new time.
export const requestRescheduleAppointment = async (req, res) => {
  const { id } = req.params;
  const { date, timeSlot } = req.body;

  if (!date || !timeSlot) {
    return res.status(400).json({ message: "Date and time slot are required" });
  }
  const schedCheck = validateSchedule(date, timeSlot);
  if (!schedCheck.ok) {
    return res.status(400).json({ message: schedCheck.message });
  }

  const rows = await query(
    "SELECT id, student_id, status, is_urgent, appointment_type FROM appointments WHERE id = ?",
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: "Not found" });
  const apt = rows[0];
  if (apt.student_id !== req.user.id) {
    return res.status(403).json({ message: "You can only reschedule your own requests" });
  }
  if (apt.appointment_type && apt.appointment_type !== "counseling") {
    return res.status(400).json({ message: "Use the psychological test reschedule action for test requests" });
  }
  if (apt.is_urgent) {
    return res.status(400).json({ message: "Urgent requests cannot be rescheduled" });
  }
  if (!["pending", "approved", "rescheduled"].includes(apt.status)) {
    return res.status(400).json({ message: `Only pending or scheduled requests can be rescheduled (was: ${apt.status})` });
  }

  const normalizedDate = normalizeDate(date);
  await query(
    `UPDATE appointments
      SET preferred_date = ?, preferred_slots = ?,
          status = 'pending',
          scheduled_date = NULL, scheduled_time = NULL,
          queue_number = NULL, queue_date = NULL, queue_slot = NULL,
          counselor_action_note = NULL, updated_at = NOW()
      WHERE id = ?`,
    [normalizedDate, timeSlot, id]
  );

  await logAction(req, "student_reschedule_appointment", "appointment", id, {
    date: normalizedDate, timeSlot,
  });

  const counselorRows = await query("SELECT id FROM users WHERE role = 'counselor'");
  const counselorIds = counselorRows.map((r) => r.id);
  if (counselorIds.length) {
    await notifyUsers(counselorIds, {
      title: "Reschedule requested",
      message: `A student requested a new schedule (${normalizedDate} at ${timeSlot}).`,
      link: "/counselor/appointments",
      type: "info",
    });
  }
  notifyRole("counselor", { type: "appointments" });

  return res.json({ message: "Reschedule requested — awaiting counselor approval" });
};
