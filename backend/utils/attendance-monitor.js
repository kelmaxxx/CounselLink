import { query } from "../config/db.js";
import { createNotification, notifyUsers } from "./notify.js";
import { notifyRole } from "../events.js";
import { sendAttendanceWarningEmail } from "./appointment-emails.js";

const MISSED_THRESHOLD = 3;
const DEFAULT_CANCELLATION_THRESHOLD = 4;

export const getCancellationThreshold = async () => {
  const rows = await query(
    "SELECT setting_value FROM app_settings WHERE setting_key = 'cancellation_warning_threshold'"
  );
  // Only 4 (default) and 5 are valid per the guidance policy.
  return Number(rows[0]?.setting_value) === 5 ? 5 : DEFAULT_CANCELLATION_THRESHOLD;
};

// Counts the leading run of matching outcomes. Pending, rejected and
// rescheduled appointments never enter the history, so they are ignored
// rather than breaking a streak. A completed/missed appointment breaks the
// cancellation run, and a completed appointment breaks the missed run.
const leadingStreak = (rows, predicate) => {
  let count = 0;
  for (const row of rows) {
    if (!predicate(row)) break;
    count += 1;
  }
  return count;
};

const createWarning = async ({ studentId, type, count, triggerAppointmentId }) => {
  // One open warning per student/type is enough; further events in the same
  // streak don't create duplicates. After review, a new streak can warn again.
  const open = await query(
    "SELECT id FROM student_warnings WHERE student_id = ? AND type = ? AND status = 'open' LIMIT 1",
    [studentId, type]
  );
  if (open.length) return null;

  const missed = type === "missed_streak";
  const reason = missed
    ? `${count} consecutive missed appointments`
    : `${count} consecutive student cancellations`;

  let warningId;
  try {
    const result = await query(
      `INSERT INTO student_warnings (student_id, type, reason, event_count, trigger_appointment_id)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, type, reason, count, triggerAppointmentId]
    );
    warningId = result.insertId;
  } catch (err) {
    // Same triggering appointment evaluated twice (e.g. retried request).
    if (err.code === "ER_DUP_ENTRY") return null;
    throw err;
  }

  const notified = await createNotification({
    userId: studentId,
    title: missed ? "Attendance concern" : "Appointment cancellations",
    message: missed
      ? `You have missed ${count} consecutive appointments. Please contact the Guidance and Counseling Section so we can help you continue your sessions.`
      : `You have canceled ${count} consecutive appointments. If something is making it hard to attend, please reach out to the Guidance and Counseling Section — we can help you find a schedule that works.`,
    link: "/student/appointments",
    type: "warning",
    dedupeKey: `attendance-warning-${type}-${triggerAppointmentId}`,
  });
  if (notified) sendAttendanceWarningEmail({ studentId, type, count });

  // Admin-side flag + bell entry. Deactivation is always a separate, manual
  // decision with its own reason and audit entry.
  const studentRows = await query("SELECT name FROM users WHERE id = ?", [studentId]);
  const studentName = studentRows[0]?.name || "A student";
  const adminRows = await query("SELECT id FROM users WHERE role = 'admin' AND status = 'approved'");
  const adminIds = adminRows.map((r) => r.id);
  if (adminIds.length) {
    await notifyUsers(adminIds, {
      title: missed ? "Attendance warning" : "Cancellation warning",
      message: `${studentName} reached ${reason}. Review the case in Manage users.`,
      link: "/admin/manage-users",
      type: "warning",
    });
    notifyRole("admin", { type: "notification" });
  }

  return warningId;
};

export const evaluateMissedStreak = async (studentId, triggerAppointmentId) => {
  // Canceled appointments are deliberately excluded: a properly canceled
  // appointment neither counts as a miss nor breaks an existing miss streak.
  const rows = await query(
    `SELECT id, status FROM appointments
     WHERE student_id = ? AND status IN ('completed', 'missed')
     ORDER BY COALESCE(scheduled_date, preferred_date, DATE(created_at)) DESC, id DESC`,
    [studentId]
  );
  const streak = leadingStreak(rows, (row) => row.status === "missed");
  if (streak < MISSED_THRESHOLD) return null;
  return createWarning({
    studentId,
    type: "missed_streak",
    count: streak,
    triggerAppointmentId,
  });
};

export const evaluateCancellationStreak = async (studentId, triggerAppointmentId) => {
  const threshold = await getCancellationThreshold();
  const rows = await query(
    `SELECT id, status FROM appointments
     WHERE student_id = ?
       AND (status IN ('completed', 'missed') OR (status = 'canceled' AND canceled_by IS NOT NULL))
     ORDER BY COALESCE(scheduled_date, preferred_date, DATE(canceled_at), DATE(created_at)) DESC, id DESC`,
    [studentId]
  );
  const streak = leadingStreak(rows, (row) => row.status === "canceled");
  if (streak < threshold) return null;
  return createWarning({
    studentId,
    type: "repeated_cancellation",
    count: streak,
    triggerAppointmentId,
  });
};
