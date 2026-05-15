import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";

const SELECT_FIELDS = `
  cs.id, cs.student_id AS studentId, cs.counselor_id AS counselorId,
  cs.appointment_id AS appointmentId, cs.session_date AS sessionDate,
  cs.presenting_concern AS presentingConcern, cs.goals, cs.summary, cs.plan,
  cs.comments, cs.next_session AS nextSession, cs.counselor_signature AS counselorSignature,
  cs.form_data AS formData, cs.created_at AS createdAt, cs.updated_at AS updatedAt,
  s.name AS studentName, s.college AS studentCollege, s.student_id AS studentNumber,
  c.name AS counselorName
`;

const FROM_JOIN = `
  FROM counseling_sessions cs
  JOIN users s ON cs.student_id = s.id
  JOIN users c ON cs.counselor_id = c.id
`;

const parseFormData = (row) => {
  if (!row) return row;
  let formData = row.formData;
  if (typeof formData === "string") {
    try { formData = JSON.parse(formData); } catch { formData = null; }
  }
  return { ...row, formData };
};

export const listSessions = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const { studentId, appointmentId } = req.query;

  const where = [];
  const params = [];

  if (role === "counselor") {
    where.push("cs.counselor_id = ?");
    params.push(userId);
  } else if (role === "student") {
    where.push("cs.student_id = ?");
    params.push(userId);
  } else if (role === "college_rep") {
    const repRows = await query("SELECT college FROM users WHERE id = ?", [userId]);
    const repCollege = repRows[0]?.college;
    if (!repCollege) return res.json([]);
    where.push("s.college = ?");
    params.push(repCollege);
  }
  // admin: no role filter

  if (studentId) { where.push("cs.student_id = ?"); params.push(studentId); }
  if (appointmentId) { where.push("cs.appointment_id = ?"); params.push(appointmentId); }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(
    `SELECT ${SELECT_FIELDS} ${FROM_JOIN} ${whereClause} ORDER BY cs.session_date DESC, cs.id DESC`,
    params
  );
  return res.json(rows.map(parseFormData));
};

export const getSession = async (req, res) => {
  const { id } = req.params;
  const rows = await query(
    `SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE cs.id = ?`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: "Session not found" });

  const session = parseFormData(rows[0]);
  const role = req.user?.role;
  const userId = req.user?.id;
  if (role === "counselor" && session.counselorId !== userId) return res.status(403).json({ message: "Forbidden" });
  if (role === "student" && session.studentId !== userId) return res.status(403).json({ message: "Forbidden" });

  return res.json(session);
};

export const getSessionByAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const rows = await query(
    `SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE cs.appointment_id = ? LIMIT 1`,
    [appointmentId]
  );
  if (!rows.length) return res.status(404).json({ message: "No session for this appointment" });
  return res.json(parseFormData(rows[0]));
};

export const createSession = async (req, res) => {
  const counselorId = req.user?.id;
  const {
    studentId, appointmentId, sessionDate, presentingConcern,
    goals, summary, plan, comments, nextSession,
    counselorSignature, formData,
  } = req.body;

  if (!studentId || !sessionDate) {
    return res.status(400).json({ message: "studentId and sessionDate are required" });
  }

  const result = await query(
    `INSERT INTO counseling_sessions
      (student_id, counselor_id, appointment_id, session_date, presenting_concern,
       goals, summary, plan, comments, next_session, counselor_signature, form_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studentId, counselorId, appointmentId || null, sessionDate,
      presentingConcern || null, goals || null, summary || null, plan || null,
      comments || null, nextSession || "followup", counselorSignature || null,
      formData ? JSON.stringify(formData) : null,
    ]
  );

  await logAction(req, "create_session", "counseling_session", result.insertId, {
    studentId, sessionDate, appointmentId: appointmentId || null,
  });

  const rows = await query(`SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE cs.id = ?`, [result.insertId]);
  return res.status(201).json(parseFormData(rows[0]));
};

const UPDATABLE_FIELDS = {
  sessionDate: "session_date",
  presentingConcern: "presenting_concern",
  goals: "goals",
  summary: "summary",
  plan: "plan",
  comments: "comments",
  nextSession: "next_session",
  counselorSignature: "counselor_signature",
};

export const updateSession = async (req, res) => {
  const { id } = req.params;
  const counselorId = req.user?.id;

  const existing = await query("SELECT counselor_id FROM counseling_sessions WHERE id = ?", [id]);
  if (!existing.length) return res.status(404).json({ message: "Session not found" });
  if (existing[0].counselor_id !== counselorId) return res.status(403).json({ message: "You can only edit your own sessions" });

  const updates = [];
  const params = [];
  for (const [field, column] of Object.entries(UPDATABLE_FIELDS)) {
    if (field in req.body) {
      updates.push(`${column} = ?`);
      params.push(req.body[field] === "" ? null : req.body[field]);
    }
  }
  if ("formData" in req.body) {
    updates.push("form_data = ?");
    params.push(req.body.formData ? JSON.stringify(req.body.formData) : null);
  }

  if (!updates.length) return res.status(400).json({ message: "No valid fields to update" });

  params.push(id);
  await query(
    `UPDATE counseling_sessions SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
    params
  );

  await logAction(req, "update_session", "counseling_session", id, {
    changedFields: Object.keys(req.body),
  });

  const rows = await query(`SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE cs.id = ?`, [id]);
  return res.json(parseFormData(rows[0]));
};

export const deleteSession = async (req, res) => {
  const { id } = req.params;
  const counselorId = req.user?.id;

  const existing = await query("SELECT counselor_id, student_id, session_date FROM counseling_sessions WHERE id = ?", [id]);
  if (!existing.length) return res.status(404).json({ message: "Session not found" });
  if (existing[0].counselor_id !== counselorId) return res.status(403).json({ message: "You can only delete your own sessions" });

  await logAction(req, "delete_session", "counseling_session", id, {
    studentId: existing[0].student_id,
    sessionDate: existing[0].session_date,
  });

  await query("DELETE FROM counseling_sessions WHERE id = ?", [id]);
  return res.json({ message: "Session deleted" });
};
