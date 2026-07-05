import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification } from "../utils/notify.js";
import { notifyUser } from "../events.js";

const SELECT_FIELDS = `
  cs.id, cs.student_id AS studentId, cs.counselor_id AS counselorId,
  cs.appointment_id AS appointmentId, cs.session_date AS sessionDate,
  cs.presenting_concern AS presentingConcern, cs.goals, cs.summary, cs.plan,
  cs.comments, cs.next_session AS nextSession, cs.counselor_signature AS counselorSignature,
  cs.form_data AS formData, cs.finalized_at AS finalizedAt,
  cs.created_at AS createdAt, cs.updated_at AS updatedAt,
  s.name AS studentName, s.college AS studentCollege, s.student_id AS studentNumber,
  c.name AS counselorName, c.signature_url AS counselorSignatureUrl
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

// Builds the report_recipients payload snapshot for a finalized session. Used
// both by the automatic fan-out on finalize and by the individual
// report-request auto-resolution path (report-requests.controller.js), so a
// rep always sees an identical document however it reached them.
// `session` is the snake_case row shape joined with student/counselor names
// (student_id, counselor_id, session_date, presenting_concern, goals, summary,
// plan, comments, next_session, counselor_signature, form_data, studentName,
// studentCollege, counselorName).
export const buildSessionReportPayload = (session) => {
  let formData = session.form_data;
  if (typeof formData === "string") {
    try { formData = JSON.parse(formData); } catch { formData = null; }
  }
  return {
    sessionId: session.id,
    sessionDate: session.session_date,
    studentName: session.studentName,
    studentCollege: session.studentCollege,
    counselorName: session.counselorName,
    presentingConcern: session.presenting_concern,
    goals: session.goals,
    summary: session.summary,
    plan: session.plan,
    comments: session.comments,
    nextSession: session.next_session,
    counselorSignature: session.counselor_signature,
    // Frozen pointer to the counselor's uploaded signature image so the
    // receiving College Rep prints the same signed document the counselor sees.
    counselorSignatureUrl: session.counselor_signature_url || null,
    formData,
  };
};

export const listSessions = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const { studentId, appointmentId } = req.query;

  const where = [];
  const params = [];

  if (role === "student") {
    where.push("cs.student_id = ?");
    params.push(userId);
  } else if (role === "college_rep") {
    const repRows = await query("SELECT college FROM users WHERE id = ?", [userId]);
    const repCollege = repRows[0]?.college;
    if (!repCollege) return res.json([]);
    where.push("s.college = ?");
    params.push(repCollege);
  }
  // counselor and admin: no role filter — the Guidance and Counseling
  // Section shares visibility across counselors so anyone can pull up a
  // student's history even if a different counselor ran the session.
  // Write actions (update/delete/finalize below) still check ownership.

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

  // Refresh the student's session list live.
  notifyUser(studentId, { type: "sessions" });

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

  const existing = await query(
    "SELECT counselor_id, finalized_at FROM counseling_sessions WHERE id = ?",
    [id]
  );
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

  const existing = await query(
    "SELECT counselor_id, student_id, session_date, finalized_at FROM counseling_sessions WHERE id = ?",
    [id]
  );
  if (!existing.length) return res.status(404).json({ message: "Session not found" });
  if (existing[0].counselor_id !== counselorId) return res.status(403).json({ message: "You can only delete your own sessions" });

  await logAction(req, "delete_session", "counseling_session", id, {
    studentId: existing[0].student_id,
    sessionDate: existing[0].session_date,
  });

  await query("DELETE FROM counseling_sessions WHERE id = ?", [id]);
  return res.json({ message: "Session deleted" });
};

// Marks the session as a submitted Session Report. From this point the row
// becomes the immutable Student Record entry (updateSession + deleteSession
// reject changes). If the underlying appointment was created from a referral,
// the report is also fanned out to that referring College Representative.
export const finalizeSession = async (req, res) => {
  const { id } = req.params;
  const counselorId = req.user?.id;

  const sessionRows = await query(
    `SELECT cs.id, cs.student_id, cs.counselor_id, cs.appointment_id, cs.session_date,
            cs.presenting_concern, cs.goals, cs.summary, cs.plan, cs.comments,
            cs.next_session, cs.counselor_signature, cs.form_data, cs.finalized_at,
            s.name AS studentName, s.college AS studentCollege,
            c.name AS counselorName, c.signature_url AS counselor_signature_url
     FROM counseling_sessions cs
     JOIN users s ON cs.student_id = s.id
     JOIN users c ON cs.counselor_id = c.id
     WHERE cs.id = ?`,
    [id]
  );
  if (!sessionRows.length) return res.status(404).json({ message: "Session not found" });
  const session = sessionRows[0];
  if (session.counselor_id !== counselorId) {
    return res.status(403).json({ message: "Only the owning counselor can submit this report" });
  }
  if (session.finalized_at) {
    return res.status(409).json({ message: "This session has already been submitted." });
  }

  // Resolve the originating College Rep, if any, via:
  //   counseling_sessions.appointment_id -> appointments.referral_id -> referrals.referrer_id
  let referrerId = null;
  if (session.appointment_id) {
    const chain = await query(
      `SELECT r.referrer_id
       FROM appointments a
       JOIN referrals r ON a.referral_id = r.id
       WHERE a.id = ?
       LIMIT 1`,
      [session.appointment_id]
    );
    if (chain.length) referrerId = chain[0].referrer_id;
  }

  await query(
    "UPDATE counseling_sessions SET finalized_at = NOW() WHERE id = ?",
    [id]
  );

  // Privacy gate: a referral alone does not authorize sharing this session's
  // details — the student must have separately agreed to it.
  let reportRecipientId = null;
  let sharedWithRep = false;
  if (referrerId) {
    const consentRows = await query(
      "SELECT referral_sharing_consent FROM student_consents WHERE student_id = ?",
      [session.student_id]
    );
    const canShare = consentRows[0]?.referral_sharing_consent === "yes";

    if (canShare) {
      const payload = buildSessionReportPayload(session);
      const title = `Session Report — ${session.studentName} (${session.session_date})`;
      const summaryText = (session.summary || session.presenting_concern || "").slice(0, 200) || null;

      const insertResult = await query(
        `INSERT INTO report_recipients (sender_id, recipient_id, title, summary, report_payload)
         VALUES (?, ?, ?, ?, ?)`,
        [counselorId, referrerId, title, summaryText, JSON.stringify(payload)]
      );
      reportRecipientId = insertResult.insertId;
      sharedWithRep = true;

      await createNotification({
        userId: referrerId,
        title: "Counseling report received",
        message: `Session report for ${session.studentName} (${session.session_date}) is now available.`,
        link: `/rep/counseling-data`,
      });
    } else {
      await createNotification({
        userId: referrerId,
        title: "Session completed — sharing not consented",
        message: `Session for ${session.studentName} (${session.session_date}) was completed, but the student has not consented to share their counseling session details with you.`,
        link: `/rep/counseling-data`,
      });
    }
    notifyUser(referrerId, { type: "sessions" });
  }

  // The finalized report becomes part of the student's record.
  notifyUser(session.student_id, { type: "sessions" });

  await logAction(req, "finalize_session", "counseling_session", id, {
    studentId: session.student_id,
    appointmentId: session.appointment_id,
    referrerId,
    sharedWithRep,
    reportRecipientId,
  });

  const rows = await query(`SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE cs.id = ?`, [id]);
  return res.json({
    message: "Session report submitted",
    session: parseFormData(rows[0]),
    reportRecipientId,
    fannedOutToRep: sharedWithRep ? referrerId : null,
  });
};
