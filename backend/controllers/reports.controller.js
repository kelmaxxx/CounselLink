import { query } from "../config/db.js";

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
  const college = req.user?.college;
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
