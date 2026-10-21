import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { getCancellationThreshold } from "../utils/attendance-monitor.js";

export const listWarnings = async (_req, res) => {
  const cancellationThreshold = await getCancellationThreshold();
  const warnings = await query(
    `SELECT w.id, w.student_id AS studentId, w.type, w.reason,
            w.event_count AS eventCount, w.trigger_appointment_id AS triggerAppointmentId,
            w.status, w.review_note AS reviewNote, w.reviewed_by AS reviewedBy,
            w.reviewed_at AS reviewedAt, w.created_at AS createdAt,
            u.name AS studentName, u.student_id AS studentNumber, u.college,
            u.status AS studentStatus, r.name AS reviewedByName,
            COALESCE(a.scheduled_date, a.preferred_date) AS appointmentDate
     FROM student_warnings w
     JOIN users u ON w.student_id = u.id
     LEFT JOIN users r ON w.reviewed_by = r.id
     LEFT JOIN appointments a ON w.trigger_appointment_id = a.id
     ORDER BY FIELD(w.status, 'open', 'resolved', 'dismissed'), w.created_at DESC`
  );
  return res.json({ cancellationThreshold, warnings });
};

export const reviewWarning = async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body || {};
  if (!["resolved", "dismissed"].includes(status)) {
    return res.status(400).json({ message: "Status must be resolved or dismissed" });
  }

  const rows = await query(
    "SELECT id, student_id, type, status FROM student_warnings WHERE id = ?",
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: "Warning not found" });
  if (rows[0].status !== "open") {
    return res.status(409).json({ message: "This warning has already been reviewed" });
  }

  await query(
    `UPDATE student_warnings
     SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW()
     WHERE id = ?`,
    [status, note?.trim() || null, req.user.id, id]
  );

  await logAction(req, `attendance_warning_${status}`, "student_warning", id, {
    studentId: rows[0].student_id,
    type: rows[0].type,
    note: note?.trim() || null,
  });

  return res.json({ message: status === "resolved" ? "Warning resolved" : "Warning dismissed" });
};

export const updateWarningSettings = async (req, res) => {
  const threshold = Number(req.body?.cancellationThreshold);
  if (![4, 5].includes(threshold)) {
    return res.status(400).json({ message: "Cancellation warning threshold must be 4 or 5" });
  }

  await query(
    `INSERT INTO app_settings (setting_key, setting_value, updated_by)
     VALUES ('cancellation_warning_threshold', ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
    [String(threshold), req.user.id]
  );

  await logAction(req, "update_attendance_settings", "app_settings", null, {
    cancellationThreshold: threshold,
  });

  return res.json({ message: "Settings updated", cancellationThreshold: threshold });
};
