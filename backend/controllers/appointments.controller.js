import { query } from "../config/db.js";
import { notifyRole } from "../events.js";
import { notifyUsers } from "../utils/notify.js";
import { isValidPhMobile } from "../utils/validators.js";

const getQueueSlot = (slot) => {
  const s = (slot || "").toLowerCase();
  if (s === "afternoon" || s.startsWith("1:") || s.startsWith("2:") || s.startsWith("3:")) return "PM";
  if (!s) return null;
  return "AM";
};

export const createAppointment = async (req, res) => {
  const { preferredDate, preferredSlots, isUrgent, phoneNumber, reason, studentId: bodyStudentId } = req.body;

  let studentId = req.user?.id;
  const isCounselor = req.user?.role === "counselor";

  if (isCounselor && bodyStudentId) {
    studentId = bodyStudentId;
  }

  // If created by counselor, phoneNumber defaults to "—", and reason defaults to "Follow-up Session"
  const finalPhoneNumber = phoneNumber || (isCounselor ? "—" : null);
  const finalReason = reason || (isCounselor ? "Follow-up Session" : null);

  if (!preferredDate || (!isUrgent && !preferredSlots?.length) || !finalPhoneNumber || !finalReason) {
    return res.status(400).json({ message: "Missing required appointment fields" });
  }

  if (!isCounselor && !isValidPhMobile(finalPhoneNumber)) {
    return res.status(400).json({ message: "Phone number must start with 09 and have 11 digits" });
  }

  const slots = Array.isArray(preferredSlots) ? preferredSlots.join(",") : preferredSlots;
  // Urgent appointments are auto-approved so they go directly to the sessions queue
  const status = (isCounselor || isUrgent) ? "approved" : "pending";
  const counselorId = isCounselor ? req.user?.id : null;

  let queueNumber = null;
  let queueDate = null;
  let queueSlot = null;

  if (isUrgent) {
    // Urgent requests: assign queue immediately at request time (today's date + current AM/PM)
    const now = new Date();
    queueSlot = now.getHours() < 12 ? "AM" : "PM";
    queueDate = now.toISOString().split("T")[0];

    const [{ cnt }] = await query(
      `SELECT COUNT(*) AS cnt FROM appointments
       WHERE queue_date = ? AND queue_slot = ? AND queue_number IS NOT NULL AND appointment_type = 'counseling'`,
      [queueDate, queueSlot]
    );

    if (cnt >= 10) {
      return res.status(409).json({
        message: `The ${queueSlot === "AM" ? "morning" : "afternoon"} queue is full (10 appointments) for today. Please contact the counseling office directly for urgent matters.`,
      });
    }

    queueNumber = cnt + 1;
  } else if (isCounselor && preferredDate && preferredSlots?.length) {
    // Counselor-created follow-ups are immediately approved, so assign queue now
    const firstSlot = Array.isArray(preferredSlots) ? preferredSlots[0] : preferredSlots.split(",")[0];
    queueSlot = getQueueSlot(firstSlot);
    queueDate = preferredDate;

    if (queueSlot) {
      const [{ cnt }] = await query(
        `SELECT COUNT(*) AS cnt FROM appointments
         WHERE queue_date = ? AND queue_slot = ? AND queue_number IS NOT NULL AND appointment_type = 'counseling'`,
        [queueDate, queueSlot]
      );
      if (cnt < 10) queueNumber = cnt + 1;
    }
  }

  const result = await query(
    `INSERT INTO appointments
      (student_id, counselor_id, appointment_type, preferred_date, preferred_time, status, reason, phone_number, is_urgent, preferred_slots, queue_number, queue_date, queue_slot)
     VALUES
      (?, ?, 'counseling', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [studentId, counselorId, preferredDate, status, finalReason, finalPhoneNumber, isUrgent ? 1 : 0, slots, queueNumber, queueDate, queueSlot]
  );

  // Insert a DB notification for every counselor so their bell shows this request,
  // then fire SSE signals so their UI refreshes without a page reload.
  if (!isCounselor) {
    const counselorRows = await query("SELECT id FROM users WHERE role = 'counselor'");
    const counselorIds = counselorRows.map((r) => r.id);
    if (counselorIds.length) {
      await notifyUsers(counselorIds, {
        title: isUrgent ? "Urgent Appointment — Immediate Attention" : "New Appointment Request",
        message: isUrgent
          ? "A student has submitted an urgent appointment and is awaiting immediate counseling."
          : "A student has submitted a counseling appointment request.",
        link: "/counselor/appointments",
        type: isUrgent ? "warning" : "info",
      });
    }
    notifyRole("counselor", { type: "notification" });
  }
  notifyRole("counselor", { type: "appointments" });

  return res.status(201).json({
    message: isCounselor ? "Follow-up appointment scheduled" : "Appointment request submitted",
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
       WHERE a.student_id = ? AND a.appointment_type = 'counseling'
       ORDER BY a.created_at DESC`,
      [userId]
    );
    return res.json(rows);
  }

  if (role === "counselor") {
    const rows = await query(
      `SELECT a.*, s.name AS studentName, s.college, s.student_id AS studentId, c.name AS counselorName
       FROM appointments a
       LEFT JOIN users s ON a.student_id = s.id
       LEFT JOIN users c ON a.counselor_id = c.id
       WHERE (a.counselor_id = ? OR a.counselor_id IS NULL OR a.is_urgent = 1) AND a.appointment_type = 'counseling'
       ORDER BY a.created_at DESC`,
      [userId]
    );
    return res.json(rows);
  }

  if (role === "college_rep") {
    const repRows = await query("SELECT college FROM users WHERE id = ?", [userId]);
    const repCollege = repRows[0]?.college;
    if (!repCollege) return res.json([]);

    const rows = await query(
      `SELECT a.*, s.name AS studentName, s.college, s.student_id AS studentId, c.name AS counselorName
       FROM appointments a
       JOIN users s ON a.student_id = s.id
       LEFT JOIN users c ON a.counselor_id = c.id
       WHERE s.college = ? AND a.appointment_type = 'counseling'
       ORDER BY a.created_at DESC`,
      [repCollege]
    );
    return res.json(rows);
  }

  const rows = await query(
    `SELECT a.*, s.name AS studentName, s.college, s.student_id AS studentId, c.name AS counselorName
     FROM appointments a
     LEFT JOIN users s ON a.student_id = s.id
     LEFT JOIN users c ON a.counselor_id = c.id
     WHERE a.appointment_type = 'counseling'
     ORDER BY a.created_at DESC`
  );
  return res.json(rows);
};

export const getAppointmentStats = async (_req, res) => {
  const [totalRow] = await query(
    "SELECT COUNT(*) AS total FROM appointments WHERE status = 'completed'"
  );

  const byCollege = await query(
    `SELECT u.college, COUNT(*) AS total
     FROM appointments a
     JOIN users u ON a.student_id = u.id
     WHERE a.status = 'completed' AND u.college IS NOT NULL AND u.college <> ''
     GROUP BY u.college
     ORDER BY total DESC`
  );

  return res.json({
    totalCompleted: totalRow.total,
    byCollege,
  });
};
