import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";

const mapStatusCounts = (rows) =>
  rows.reduce((acc, row) => {
    acc[row.status] = Number(row.count);
    return acc;
  }, {});

export const getOverviewReport = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (role === "student") {
    const appointments = await query(
      "SELECT COUNT(*) AS count FROM appointments WHERE student_id = ?",
      [userId]
    );
    const appointmentsCompleted = await query(
      "SELECT COUNT(*) AS count FROM appointments WHERE student_id = ? AND status IN ('accepted','approved','completed')",
      [userId]
    );
    const appointmentsPending = await query(
      "SELECT COUNT(*) AS count FROM appointments WHERE student_id = ? AND status = 'pending'",
      [userId]
    );
    const tests = await query(
      "SELECT COUNT(*) AS count FROM appointments WHERE student_id = ? AND appointment_type = 'psychological_test'",
      [userId]
    );
    const testsCompleted = await query(
      "SELECT COUNT(*) AS count FROM appointments WHERE student_id = ? AND appointment_type = 'psychological_test' AND status IN ('accepted','approved','completed','rescheduled')",
      [userId]
    );
    const results = await query(
      "SELECT COUNT(*) AS count FROM test_results WHERE student_id = ?",
      [userId]
    );
    const recent = await query(
      `SELECT a.*, u.name AS studentName
       FROM appointments a
       LEFT JOIN users u ON a.student_id = u.id
       WHERE a.student_id = ?
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [userId]
    );

    return res.json({
      totals: {
        appointments: appointments[0]?.count || 0,
        completedAppointments: appointmentsCompleted[0]?.count || 0,
        pendingAppointments: appointmentsPending[0]?.count || 0,
        tests: tests[0]?.count || 0,
        completedTests: testsCompleted[0]?.count || 0,
        results: results[0]?.count || 0,
      },
      collegeDistribution: {},
      recentActivity: recent,
    });
  }

  const appointments = await query("SELECT COUNT(*) AS count FROM appointments");
  const appointmentsCompleted = await query(
    "SELECT COUNT(*) AS count FROM appointments WHERE status IN ('accepted','approved','completed')"
  );
  const appointmentsPending = await query(
    "SELECT COUNT(*) AS count FROM appointments WHERE status = 'pending'"
  );
  const tests = await query(
    "SELECT COUNT(*) AS count FROM appointments WHERE appointment_type = 'psychological_test'"
  );
  const testsCompleted = await query(
    "SELECT COUNT(*) AS count FROM appointments WHERE appointment_type = 'psychological_test' AND status IN ('accepted','approved','completed','rescheduled')"
  );
  const results = await query("SELECT COUNT(*) AS count FROM test_results");
  const colleges = await query(
    "SELECT college, COUNT(*) AS count FROM users WHERE role = 'student' GROUP BY college"
  );
  const recent = await query(
    `SELECT a.*, s.name AS studentName
     FROM appointments a
     LEFT JOIN users s ON a.student_id = s.id
     ORDER BY a.created_at DESC
     LIMIT 5`
  );

  return res.json({
    totals: {
      appointments: appointments[0]?.count || 0,
      completedAppointments: appointmentsCompleted[0]?.count || 0,
      pendingAppointments: appointmentsPending[0]?.count || 0,
      tests: tests[0]?.count || 0,
      completedTests: testsCompleted[0]?.count || 0,
      results: results[0]?.count || 0,
    },
    collegeDistribution: colleges.reduce((acc, row) => {
      acc[row.college || "Unassigned"] = Number(row.count);
      return acc;
    }, {}),
    recentActivity: recent,
  });
};

export const getAdminReport = async (_req, res) => {
  const userCounts = await query(
    "SELECT role, COUNT(*) AS count FROM users GROUP BY role"
  );
  const totalAppointments = await query("SELECT COUNT(*) AS count FROM appointments");
  const totalTests = await query(
    "SELECT COUNT(*) AS count FROM appointments WHERE appointment_type = 'psychological_test'"
  );
  const pendingAppointments = await query(
    "SELECT COUNT(*) AS count FROM appointments WHERE status = 'pending'"
  );
  const pendingTests = await query(
    "SELECT COUNT(*) AS count FROM appointments WHERE appointment_type = 'psychological_test' AND status = 'pending'"
  );
  const appointmentStatusRows = await query(
    "SELECT status, COUNT(*) AS count FROM appointments WHERE appointment_type = 'counseling' GROUP BY status"
  );

  return res.json({
    users: userCounts.reduce((acc, row) => {
      acc[row.role] = Number(row.count);
      return acc;
    }, {}),
    totals: {
      appointments: totalAppointments[0]?.count || 0,
      tests: totalTests[0]?.count || 0,
      pendingRequests: (pendingAppointments[0]?.count || 0) + (pendingTests[0]?.count || 0),
    },
    appointmentStatuses: mapStatusCounts(appointmentStatusRows),
  });
};

export const getCollegeReport = async (req, res) => {
  const userId = req.user?.id;
  const userRows = await query("SELECT college FROM users WHERE id = ?", [userId]);
  const college = userRows[0]?.college;
  if (!college) {
    return res.status(400).json({ message: "College not assigned" });
  }

  const students = await query(
    "SELECT id, name, student_id AS studentId, program, year_level AS yearLevel FROM users WHERE role = 'student' AND college = ?",
    [college]
  );

  const appointmentCounts = await query(
    `SELECT a.status, COUNT(*) AS count
     FROM appointments a
     JOIN users u ON a.student_id = u.id
     WHERE u.college = ?
     GROUP BY a.status`,
    [college]
  );

  const testCounts = await query(
    `SELECT a.status, COUNT(*) AS count
     FROM appointments a
     JOIN users u ON a.student_id = u.id
     WHERE u.college = ? AND a.appointment_type = 'psychological_test'
     GROUP BY a.status`,
    [college]
  );

  const appointmentTotal = appointmentCounts.reduce((sum, row) => sum + Number(row.count), 0);
  const testTotal = testCounts.reduce((sum, row) => sum + Number(row.count), 0);

  const active = appointmentCounts
    .filter((row) => ["pending", "accepted", "approved"].includes(row.status))
    .reduce((sum, row) => sum + Number(row.count), 0) +
    testCounts
      .filter((row) => ["pending", "accepted", "approved"].includes(row.status))
      .reduce((sum, row) => sum + Number(row.count), 0);

  const completed = appointmentCounts
    .filter((row) => ["completed", "accepted", "approved"].includes(row.status))
    .reduce((sum, row) => sum + Number(row.count), 0) +
    testCounts
      .filter((row) => ["completed", "accepted", "approved"].includes(row.status))
      .reduce((sum, row) => sum + Number(row.count), 0);

  return res.json({
    college,
    totals: {
      totalSessions: appointmentTotal + testTotal,
      activeCases: active,
      completed,
    },
    students,
  });
};

export const sendReportToRecipient = async (req, res) => {
  const senderId = req.user?.id;
  const { recipientId, title, summary, payload } = req.body || {};

  if (!recipientId || !title?.trim() || !payload) {
    return res.status(400).json({ message: "recipientId, title, and payload are required" });
  }

  const recipient = await query(
    "SELECT id, name, role FROM users WHERE id = ? AND role = 'college_rep'",
    [recipientId]
  );
  if (!recipient.length) {
    return res.status(404).json({ message: "Recipient must be a College Representative (college_rep)" });
  }

  const payloadJson = typeof payload === "string" ? payload : JSON.stringify(payload);
  const result = await query(
    `INSERT INTO report_recipients (sender_id, recipient_id, title, summary, report_payload)
     VALUES (?, ?, ?, ?, ?)`,
    [senderId, recipientId, title.trim(), summary || null, payloadJson]
  );

  await query(
    `INSERT INTO notifications (user_id, title, message, status, link)
     VALUES (?, ?, ?, 'unread', ?)`,
    [
      recipientId,
      "Counseling report received",
      `${title.trim()}${summary ? ` — ${summary.slice(0, 100)}` : ""}`,
      `/rep/counseling-data`,
    ]
  );

  await logAction(req, "send_report", "report_recipient", result.insertId, {
    recipientId,
    title: title.trim(),
  });

  return res.status(201).json({ message: "Report sent", id: result.insertId });
};

export const listSentReports = async (req, res) => {
  const userId = req.user?.id;
  const rows = await query(
    `SELECT r.id, r.title, r.summary, r.report_payload, r.status, r.sent_at, r.acknowledged_at,
            u.name AS recipientName, u.id AS recipient_id, u.college AS recipientCollege
     FROM report_recipients r
     LEFT JOIN users u ON r.recipient_id = u.id
     WHERE r.sender_id = ?
     ORDER BY r.sent_at DESC`,
    [userId]
  );
  return res.json(rows);
};

export const getReport = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const rows = await query(
    `SELECT r.id, r.title, r.summary, r.report_payload, r.status, r.sent_at, r.acknowledged_at,
            r.sender_id, r.recipient_id,
            sender.name AS senderName, sender.college AS senderCollege,
            recipient.name AS recipientName, recipient.college AS recipientCollege
     FROM report_recipients r
     LEFT JOIN users sender ON r.sender_id = sender.id
     LEFT JOIN users recipient ON r.recipient_id = recipient.id
     WHERE r.id = ?`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: "Report not found" });
  const report = rows[0];
  if (report.sender_id !== userId && report.recipient_id !== userId && req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  return res.json(report);
};

export const listReceivedReports = async (req, res) => {
  const userId = req.user?.id;
  const rows = await query(
    `SELECT r.id, r.title, r.summary, r.report_payload, r.status, r.sent_at, r.acknowledged_at,
            u.name AS senderName, u.id AS sender_id
     FROM report_recipients r
     LEFT JOIN users u ON r.sender_id = u.id
     WHERE r.recipient_id = ?
     ORDER BY r.sent_at DESC`,
    [userId]
  );
  return res.json(rows);
};
