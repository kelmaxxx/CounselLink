import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification } from "../utils/notify.js";
import { notifyUser } from "../events.js";
import { buildSessionReportPayload } from "./counseling-sessions.controller.js";

const baseSelect = `
  SELECT rr.id, rr.requester_id, rr.counselor_id, rr.request_type,
         rr.student_name, rr.student_identifier, rr.department,
         rr.reason, rr.status, rr.response_note, rr.responded_at,
         rr.created_at, rr.updated_at,
         req.name AS requesterName, req.college AS requesterCollege,
         cou.name AS counselorName
  FROM report_requests rr
  LEFT JOIN users req ON rr.requester_id = req.id
  LEFT JOIN users cou ON rr.counselor_id = cou.id
`;

export const createReportRequest = async (req, res) => {
  const requesterId = req.user?.id;
  const { counselorId, requestType, studentId, department, reason } = req.body || {};

  const type = ["college", "department"].includes(requestType) ? requestType : "individual";

  if (!counselorId || !reason?.trim()) {
    return res
      .status(400)
      .json({ message: "counselorId and reason are required" });
  }
  if (type === "individual" && !studentId) {
    return res
      .status(400)
      .json({ message: "studentId is required for an individual student request" });
  }
  if (type === "department" && !department?.trim()) {
    return res
      .status(400)
      .json({ message: "department is required for a department summary request" });
  }

  const [counselor] = await query(
    "SELECT id, name FROM users WHERE id = ? AND role = 'counselor'",
    [counselorId]
  );
  if (!counselor) return res.status(404).json({ message: "Counselor not found" });

  let student = null;
  if (type === "individual") {
    const studentRows = await query(
      "SELECT id, name, student_id AS studentNumber FROM users WHERE id = ? AND role = 'student'",
      [studentId]
    );
    student = studentRows[0];
    if (!student) return res.status(404).json({ message: "Student not found" });
  }

  const result = await query(
    `INSERT INTO report_requests
       (requester_id, counselor_id, request_type, student_id, student_name, student_identifier, department, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      requesterId,
      counselorId,
      type,
      student?.id || null,
      student?.name || null,
      student?.studentNumber || null,
      type === "department" ? department.trim() : null,
      reason.trim(),
    ]
  );
  const requestId = result.insertId;

  const requesterName = req.user?.name || "A College";
  const collegeLabel = req.user?.college ? ` for ${req.user.college}` : "";

  await query(
    `INSERT INTO notifications (user_id, title, message, status, link)
     VALUES (?, ?, ?, 'unread', ?)`,
    [
      counselorId,
      "Report request received",
      type === "college"
        ? `${requesterName} requested a college-wide summary report${collegeLabel}.`
        : type === "department"
        ? `${requesterName} requested a ${department.trim()} summary${collegeLabel}.`
        : `${requesterName} requested a report on ${student.name}.`,
      `/counselor/reports`,
    ]
  );

  if (type === "college" || type === "department") {
    // College-wide and department summaries still go through the assigned
    // counselor, who writes the narrative — handled by
    // reports.controller.js createCollegeSummary.
    await logAction(req, "create_report_request", "report_request", requestId, {
      counselorId,
      requestType: type,
      department: type === "department" ? department.trim() : null,
    });
    return res.status(201).json({ message: "Report request submitted", id: requestId });
  }

  // Individual requests resolve in one of three ways:
  //  1. A referral from this rep, with a finalized session, AND the
  //     student's consent => fulfilled immediately. (This is also fanned out
  //     automatically when the counselor finalizes the session — this path
  //     just covers requests made before or after that.)
  //  2. No referral from this rep, but some finalized session exists for
  //     this student and the student has consented => left pending so the
  //     assigned counselor can review and send it manually (POST /:id/send).
  //  3. Otherwise => declined automatically.
  const referralSessionRows = await query(
    `SELECT cs.id, cs.student_id, cs.counselor_id, cs.appointment_id, cs.session_date,
            cs.presenting_concern, cs.goals, cs.summary, cs.plan, cs.comments,
            cs.next_session, cs.counselor_signature, cs.form_data,
            s.name AS studentName, s.college AS studentCollege,
            c.name AS counselorName, c.signature_url AS counselor_signature_url
     FROM referrals r
     JOIN appointments a ON a.referral_id = r.id
     JOIN counseling_sessions cs ON cs.appointment_id = a.id
     JOIN users s ON cs.student_id = s.id
     JOIN users c ON cs.counselor_id = c.id
     WHERE r.referrer_id = ? AND r.student_id = ? AND cs.finalized_at IS NOT NULL
     ORDER BY cs.finalized_at DESC
     LIMIT 1`,
    [requesterId, studentId]
  );

  let status = "declined";
  let responseNote = "No session report is available for this student from your office.";

  const consentRows = await query(
    "SELECT referral_sharing_consent FROM student_consents WHERE student_id = ?",
    [studentId]
  );
  const canShare = consentRows[0]?.referral_sharing_consent === "yes";

  if (referralSessionRows.length) {
    const session = referralSessionRows[0];
    if (canShare) {
      const payload = buildSessionReportPayload(session);
      const sessionDateStr = (session.session_date instanceof Date ? session.session_date.toISOString() : String(session.session_date || "")).split("T")[0];
      const title = `Session Report — ${session.studentName} (${sessionDateStr})`;
      const summaryText = (session.summary || session.presenting_concern || "").slice(0, 200) || null;
      await query(
        `INSERT INTO report_recipients (sender_id, recipient_id, title, summary, report_payload)
         VALUES (?, ?, ?, ?, ?)`,
        [session.counselor_id, requesterId, title, summaryText, JSON.stringify(payload)]
      );
      status = "fulfilled";
      responseNote = null;
    } else {
      responseNote =
        "The student has not consented to share their counseling session details with Colleges.";
    }
  } else {
    const anySessionRows = await query(
      "SELECT id FROM counseling_sessions WHERE student_id = ? AND finalized_at IS NOT NULL ORDER BY finalized_at DESC LIMIT 1",
      [studentId]
    );
    if (anySessionRows.length) {
      if (canShare) {
        status = null; // leave pending for the assigned counselor to send manually
      } else {
        responseNote =
          "The student has not consented to share their counseling session details with Colleges.";
      }
    }
  }

  if (status) {
    await query(
      "UPDATE report_requests SET status = ?, response_note = ?, responded_at = NOW() WHERE id = ?",
      [status, responseNote, requestId]
    );

    await createNotification({
      userId: requesterId,
      title: status === "fulfilled" ? "Report request fulfilled" : "Report request declined",
      message:
        status === "fulfilled"
          ? `Your report request for ${student.name} is now available.`
          : responseNote,
      link: status === "fulfilled" ? "/rep/counseling-data" : "/rep/request-report",
    });
    if (status === "fulfilled") notifyUser(requesterId, { type: "sessions" });
  }

  await logAction(req, "create_report_request", "report_request", requestId, {
    counselorId,
    requestType: type,
    studentId,
    autoResolved: status || "pending",
  });

  return res.status(201).json({
    message:
      status === "fulfilled"
        ? "Report request fulfilled"
        : status === "declined"
        ? "Report request declined"
        : "Report request submitted — awaiting counselor review",
    id: requestId,
    status: status || "pending",
  });
};

// Lets the assigned counselor manually deliver an individual report request
// that was left pending (a finalized session exists and the student has
// consented, but it didn't come from this rep's own referral, so it isn't
// released automatically).
export const sendIndividualReport = async (req, res) => {
  const { id } = req.params;
  const counselorId = req.user?.id;

  const [request] = await query(
    "SELECT id, counselor_id, requester_id, request_type, student_id, status FROM report_requests WHERE id = ?",
    [id]
  );
  if (!request) return res.status(404).json({ message: "Report request not found" });
  if (request.request_type !== "individual") {
    return res.status(400).json({ message: "This request is not an individual student request" });
  }
  if (request.counselor_id !== counselorId) {
    return res.status(403).json({ message: "Only the assigned counselor can send this report" });
  }
  if (request.status !== "pending") {
    return res.status(409).json({ message: `Request is already ${request.status}` });
  }
  if (!request.student_id) {
    return res.status(400).json({ message: "No student is linked to this request" });
  }

  const consentRows = await query(
    "SELECT referral_sharing_consent FROM student_consents WHERE student_id = ?",
    [request.student_id]
  );
  if (consentRows[0]?.referral_sharing_consent !== "yes") {
    return res
      .status(403)
      .json({ message: "The student has not consented to share their counseling session details." });
  }

  const sessionRows = await query(
    `SELECT cs.id, cs.student_id, cs.counselor_id, cs.appointment_id, cs.session_date,
            cs.presenting_concern, cs.goals, cs.summary, cs.plan, cs.comments,
            cs.next_session, cs.counselor_signature, cs.form_data,
            s.name AS studentName, s.college AS studentCollege,
            c.name AS counselorName, c.signature_url AS counselor_signature_url
     FROM counseling_sessions cs
     JOIN users s ON cs.student_id = s.id
     JOIN users c ON cs.counselor_id = c.id
     WHERE cs.student_id = ? AND cs.finalized_at IS NOT NULL
     ORDER BY cs.finalized_at DESC
     LIMIT 1`,
    [request.student_id]
  );
  if (!sessionRows.length) {
    return res.status(404).json({ message: "No finalized session report is available for this student" });
  }
  const session = sessionRows[0];

  const payload = buildSessionReportPayload(session);
  const sessionDateStr2 = (session.session_date instanceof Date ? session.session_date.toISOString() : String(session.session_date || "")).split("T")[0];
  const title = `Session Report — ${session.studentName} (${sessionDateStr2})`;
  const summaryText = (session.summary || session.presenting_concern || "").slice(0, 200) || null;

  const result = await query(
    `INSERT INTO report_recipients (sender_id, recipient_id, title, summary, report_payload)
     VALUES (?, ?, ?, ?, ?)`,
    [counselorId, request.requester_id, title, summaryText, JSON.stringify(payload)]
  );

  await query(
    "UPDATE report_requests SET status = 'fulfilled', response_note = NULL, responded_at = NOW() WHERE id = ?",
    [id]
  );

  await createNotification({
    userId: request.requester_id,
    title: "Report request fulfilled",
    message: `Your report request for ${session.studentName} is now available.`,
    link: "/rep/counseling-data",
  });
  notifyUser(request.requester_id, { type: "sessions" });

  await logAction(req, "send_individual_report", "report_recipient", result.insertId, {
    requestId: id,
    studentId: request.student_id,
  });

  return res.json({ message: "Report sent", id: result.insertId });
};

export const listReportRequests = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const { status } = req.query;

  if (!["counselor", "college_rep", "admin"].includes(role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const conditions = [];
  const params = [];

  if (role === "counselor") {
    conditions.push("rr.counselor_id = ?");
    params.push(userId);
  } else if (role === "college_rep") {
    conditions.push("rr.requester_id = ?");
    params.push(userId);
  }

  if (status) {
    conditions.push("rr.status = ?");
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `${baseSelect} ${where} ORDER BY rr.created_at DESC`;
  const rows = await query(sql, params);
  return res.json(rows);
};

export const respondReportRequest = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { status, responseNote } = req.body || {};

  if (!["fulfilled", "declined"].includes(status)) {
    return res.status(400).json({ message: "status must be 'fulfilled' or 'declined'" });
  }
  if (status === "declined" && !responseNote?.trim()) {
    return res.status(400).json({ message: "A response note is required when declining" });
  }

  const [request] = await query(
    "SELECT id, counselor_id, requester_id, status FROM report_requests WHERE id = ?",
    [id]
  );
  if (!request) return res.status(404).json({ message: "Report request not found" });
  if (request.counselor_id !== userId) {
    return res.status(403).json({ message: "Only the assigned counselor can respond" });
  }
  if (request.status !== "pending") {
    return res.status(409).json({ message: `Request is already ${request.status}` });
  }

  await query(
    "UPDATE report_requests SET status = ?, response_note = ?, responded_at = NOW() WHERE id = ?",
    [status, responseNote?.trim() || null, id]
  );

  await query(
    `INSERT INTO notifications (user_id, title, message, status, link)
     VALUES (?, ?, ?, 'unread', ?)`,
    [
      request.requester_id,
      `Report request ${status}`,
      responseNote?.trim()
        ? `Your report request was ${status}. Note: ${responseNote.trim().slice(0, 120)}`
        : `Your report request was ${status}.`,
      `/rep/request-report`,
    ]
  );

  await logAction(req, `report_request_${status}`, "report_request", id, {
    responseNote: responseNote || null,
  });

  return res.json({ message: `Request ${status}`, id: Number(id) });
};

export const cancelReportRequest = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const [request] = await query(
    "SELECT id, requester_id, status FROM report_requests WHERE id = ?",
    [id]
  );
  if (!request) return res.status(404).json({ message: "Report request not found" });
  if (request.requester_id !== userId) {
    return res.status(403).json({ message: "Only the requester can cancel" });
  }
  if (request.status !== "pending") {
    return res.status(409).json({ message: `Cannot cancel a ${request.status} request` });
  }

  await query("UPDATE report_requests SET status = 'cancelled' WHERE id = ?", [id]);
  await logAction(req, "report_request_cancelled", "report_request", id, {});
  return res.json({ message: "Report request cancelled", id: Number(id) });
};
