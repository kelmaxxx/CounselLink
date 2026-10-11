import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification, notifyUsers } from "../utils/notify.js";
import { notifyUser, notifyRole } from "../events.js";
import { buildSessionReportPayload } from "./counseling-sessions.controller.js";

const baseSelect = `
  SELECT rr.id, rr.requester_id, rr.counselor_id, rr.request_type,
         rr.student_id, rr.student_name, rr.student_identifier, rr.department,
         rr.reason, rr.status, rr.response_note, rr.responded_at,
         rr.created_at, rr.updated_at,
         rr.letter_snapshot, rr.rep_signature_url, rr.privacy_ack_at,
         req.name AS requesterName, req.college AS requesterCollege,
         req.department AS requesterDepartment, req.position AS requesterPosition,
         req.signature_url AS requesterSignatureUrl,
         cou.name AS counselorName, cou.position AS counselorPosition,
         cou.signature_url AS counselorSignatureUrl,
         sc.referral_sharing_consent AS studentConsent,
         EXISTS(SELECT 1 FROM counseling_sessions cs WHERE cs.student_id = rr.student_id AND cs.finalized_at IS NOT NULL) AS hasFinalizedSession
  FROM report_requests rr
  LEFT JOIN users req ON rr.requester_id = req.id
  LEFT JOIN users cou ON rr.counselor_id = cou.id
  LEFT JOIN student_consents sc ON sc.student_id = rr.student_id
`;

const subjectForType = (type) =>
  type === "college"
    ? "Request for College Counseling Data"
    : type === "department"
    ? "Request for Department Counseling Data"
    : "Request for Individual Counseling Data";

export const createReportRequest = async (req, res) => {
  const requesterId = req.user?.id;
  const { counselorId, requestType, studentId, department, reason } = req.body || {};

  const type = ["college", "department"].includes(requestType) ? requestType : "individual";

  if (!reason?.trim()) {
    return res.status(400).json({ message: "reason is required" });
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

  // counselorId is optional — if provided, assign directly; otherwise broadcast to all counselors.
  let resolvedCounselorId = counselorId || null;
  if (resolvedCounselorId) {
    const [counselor] = await query(
      "SELECT id FROM users WHERE id = ? AND role = 'counselor'",
      [resolvedCounselorId]
    );
    if (!counselor) return res.status(404).json({ message: "Counselor not found" });
  }

  let student = null;
  if (type === "individual") {
    const studentRows = await query(
      "SELECT id, name, student_id AS studentNumber, program, department, college FROM users WHERE id = ? AND role = 'student'",
      [studentId]
    );
    student = studentRows[0];
    if (!student) return res.status(404).json({ message: "Student not found" });
  }

  // Formal letter snapshot: freeze who asked for what, with the rep's saved
  // e-signature, so the counselor reviews a signed letter (not a raw row).
  // The rep sets this once in their Profile; it is reused on every request.
  const [requester] = await query(
    "SELECT name, college, department, position, signature_url FROM users WHERE id = ?",
    [requesterId]
  );
  if (!requester?.signature_url) {
    return res.status(400).json({
      message: "Draw your signature in your Profile before submitting a request letter.",
    });
  }
  const repCollege = requester.college || req.user?.college || null;
  const letterSnapshot = {
    subject: subjectForType(type),
    scopeType: type,
    studentName: student?.name || null,
    studentIdentifier: student?.studentNumber || null,
    studentProgram: student?.program || null,
    studentDepartment: student?.department || null,
    studentCollege: student?.college || null,
    department: type === "department" ? department.trim() : null,
    college: type === "college" ? repCollege : null,
    reason: reason.trim(),
    requesterName: requester.name,
    requesterPosition: requester.position || "College Representative",
    requesterDepartment: requester.department || null,
    requesterCollege: repCollege,
    repSignatureUrl: requester.signature_url,
    requestedAt: new Date().toISOString(),
  };

  const result = await query(
    `INSERT INTO report_requests
       (requester_id, counselor_id, request_type, student_id, student_name, student_identifier, department, reason, status, letter_snapshot, rep_signature_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [
      requesterId,
      resolvedCounselorId,
      type,
      student?.id || null,
      student?.name || null,
      student?.studentNumber || null,
      type === "department" ? department.trim() : null,
      reason.trim(),
      JSON.stringify(letterSnapshot),
      requester.signature_url,
    ]
  );
  const requestId = result.insertId;

  const requesterName = req.user?.name || "A College";
  const collegeLabel = req.user?.college ? ` for ${req.user.college}` : "";
  const notifTitle = "Report request received";
  const notifMsg =
    type === "college"
      ? `${requesterName} requested a college-wide summary report${collegeLabel}.`
      : type === "department"
      ? `${requesterName} requested a ${department.trim()} summary${collegeLabel}.`
      : `${requesterName} requested a report on ${student.name}.`;

  if (resolvedCounselorId) {
    await query(
      `INSERT INTO notifications (user_id, title, message, status, link) VALUES (?, ?, ?, 'unread', ?)`,
      [resolvedCounselorId, notifTitle, notifMsg, `/counselor/reports`]
    );
    notifyUser(resolvedCounselorId, { type: "notification" });
  } else {
    const allCounselors = await query(
      "SELECT id FROM users WHERE role = 'counselor' AND status = 'approved'",
      []
    );
    if (allCounselors.length) {
      await notifyUsers(
        allCounselors.map((c) => c.id),
        { title: notifTitle, message: notifMsg, link: `/counselor/reports` }
      );
    }
    notifyRole("counselor", { type: "notification" });
  }

  if (type === "college" || type === "department") {
    // College-wide and department summaries still go through the assigned
    // counselor, who writes the narrative — handled by
    // reports.controller.js createCollegeSummary.
    await logAction(req, "create_report_request", "report_request", requestId, {
      counselorId: resolvedCounselorId,
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
      payload.requestId = requestId;
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
    counselorId: resolvedCounselorId,
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
  if (request.counselor_id !== null && request.counselor_id !== counselorId) {
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

  // Require the counselor's digital signature before sending any report.
  const [sender] = await query("SELECT signature_url FROM users WHERE id = ?", [counselorId]);
  if (!sender?.signature_url) {
    return res.status(400).json({
      message: "You must upload your digital signature (eSign) in your Profile before sending a report.",
    });
  }

  const payload = buildSessionReportPayload(session);
  payload.requestId = Number(id);
  const sessionDateStr2 = (session.session_date instanceof Date ? session.session_date.toISOString() : String(session.session_date || "")).split("T")[0];
  const title = `Session Report — ${session.studentName} (${sessionDateStr2})`;
  const summaryText = (session.summary || session.presenting_concern || "").slice(0, 200) || null;

  const result = await query(
    `INSERT INTO report_recipients (sender_id, recipient_id, title, summary, report_payload)
     VALUES (?, ?, ?, ?, ?)`,
    [counselorId, request.requester_id, title, summaryText, JSON.stringify(payload)]
  );

  await query(
    "UPDATE report_requests SET status = 'fulfilled', response_note = NULL, responded_at = NOW(), counselor_id = ? WHERE id = ?",
    [counselorId, id]
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
    conditions.push("(rr.counselor_id = ? OR rr.counselor_id IS NULL)");
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
  if (request.counselor_id !== null && request.counselor_id !== userId) {
    return res.status(403).json({ message: "Only the assigned counselor can respond" });
  }
  if (request.status !== "pending") {
    return res.status(409).json({ message: `Request is already ${request.status}` });
  }

  await query(
    "UPDATE report_requests SET status = ?, response_note = ?, responded_at = NOW(), counselor_id = ? WHERE id = ?",
    [status, responseNote?.trim() || null, userId, id]
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


// Single request with its frozen formal-letter snapshot — visible to the
// requesting rep, the assigned counselor (or any counselor when unassigned),
// and admins.
export const getReportRequest = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const role = req.user?.role;
  const rows = await query(`${baseSelect} WHERE rr.id = ?`, [id]);
  if (!rows.length) return res.status(404).json({ message: "Report request not found" });
  const request = rows[0];
  const isRequester = request.requester_id === userId;
  const isAssignee = request.counselor_id === userId;
  const isBroadcastCounselor = role === "counselor" && request.counselor_id === null;
  if (!isRequester && !isAssignee && !isBroadcastCounselor && role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  return res.json(request);
};
