import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification } from "../utils/notify.js";
import { notifyUser } from "../events.js";

export const createTestResult = async (req, res) => {
  const { appointmentId, studentId, testName, completedDate, summary, recommendations } = req.body;
  const counselorId = req.user?.id;

  if (!studentId || !testName || !completedDate) {
    return res.status(400).json({ message: "Missing required result fields" });
  }

  const resultFileUrl = req.file ? `/uploads/test-results/${req.file.filename}` : null;
  const resultFileName = req.file ? req.file.originalname : null;
  const resultFileType = req.file ? req.file.mimetype : null;

  const result = await query(
    `INSERT INTO test_results
      (appointment_id, student_id, counselor_id, test_name, completed_date, summary, recommendations, result_file_url, result_file_name, result_file_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [appointmentId || null, studentId, counselorId, testName, completedDate, summary || null, recommendations || null, resultFileUrl, resultFileName, resultFileType]
  );

  await logAction(req, "upload_test_result", "test_result", result.insertId, {
    studentId,
    testName,
    appointmentId: appointmentId || null,
  });

  await createNotification({
    userId: studentId,
    title: "Psychological test result released",
    message: `Your counselor released a result for "${testName}". View and save it from your records.`,
    link: "/student/consent",
  });
  // Refresh the student's test-results list live.
  notifyUser(studentId, { type: "test-results" });

  return res.status(201).json({ message: "Test result saved", id: result.insertId });
};

export const listTestResultsForUser = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (role === "student") {
    const rows = await query(
      `SELECT r.*, u.name AS counselorName
       FROM test_results r
       LEFT JOIN users u ON r.counselor_id = u.id
       WHERE r.student_id = ?
       ORDER BY r.completed_date DESC`,
      [userId]
    );
    return res.json(rows);
  }

  if (role === "counselor") {
    // Shared visibility across the Guidance and Counseling Section: any
    // counselor can see a student's released test results, not just the one
    // who administered the test (mirrors counseling-sessions.controller.js).
    const rows = await query(
      `SELECT r.*, s.name AS studentName, s.college, s.student_id AS studentId, c.name AS counselorName
       FROM test_results r
       LEFT JOIN users s ON r.student_id = s.id
       LEFT JOIN users c ON r.counselor_id = c.id
       ORDER BY r.completed_date DESC`
    );
    return res.json(rows);
  }

  if (role === "college_rep") {
    const repRows = await query("SELECT college FROM users WHERE id = ?", [userId]);
    const repCollege = repRows[0]?.college;
    if (!repCollege) return res.json([]);

    const rows = await query(
      `SELECT r.*, s.name AS studentName, s.college, s.student_id AS studentId, c.name AS counselorName
       FROM test_results r
       JOIN users s ON r.student_id = s.id
       LEFT JOIN users c ON r.counselor_id = c.id
       WHERE s.college = ?
       ORDER BY r.completed_date DESC`,
      [repCollege]
    );
    return res.json(rows);
  }

  const rows = await query(
    `SELECT r.*, s.name AS studentName, c.name AS counselorName
     FROM test_results r
     LEFT JOIN users s ON r.student_id = s.id
     LEFT JOIN users c ON r.counselor_id = c.id
     ORDER BY r.completed_date DESC`
  );
  return res.json(rows);
};
