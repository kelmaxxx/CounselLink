import { query } from "../config/db.js";

export const createTestResult = async (req, res) => {
  const { appointmentId, studentId, testName, completedDate, summary, recommendations } = req.body;
  const counselorId = req.user?.id;

  if (!studentId || !testName || !completedDate) {
    return res.status(400).json({ message: "Missing required result fields" });
  }

  await query(
    `INSERT INTO test_results
      (appointment_id, student_id, counselor_id, test_name, completed_date, summary, recommendations)
     VALUES (?, ?, ?, ?, ?, ?, ?)` ,
    [appointmentId || null, studentId, counselorId, testName, completedDate, summary || null, recommendations || null]
  );

  return res.status(201).json({ message: "Test result saved" });
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

  const rows = await query(
    `SELECT r.*, s.name AS studentName, c.name AS counselorName
     FROM test_results r
     LEFT JOIN users s ON r.student_id = s.id
     LEFT JOIN users c ON r.counselor_id = c.id
     ORDER BY r.completed_date DESC`
  );
  return res.json(rows);
};
