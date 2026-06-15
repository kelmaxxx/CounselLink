import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";

const baseSelect = `
  SELECT rr.id, rr.requester_id, rr.counselor_id, rr.request_type,
         rr.student_name, rr.student_identifier,
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
  const { counselorId, requestType, studentName, studentIdentifier, reason } =
    req.body || {};

  const type = requestType === "college" ? "college" : "individual";

  if (!counselorId || !reason?.trim()) {
    return res
      .status(400)
      .json({ message: "counselorId and reason are required" });
  }
  if (type === "individual" && !studentName?.trim()) {
    return res
      .status(400)
      .json({ message: "studentName is required for an individual student request" });
  }

  const [counselor] = await query(
    "SELECT id, name FROM users WHERE id = ? AND role = 'counselor'",
    [counselorId]
  );
  if (!counselor) return res.status(404).json({ message: "Counselor not found" });

  // College-wide requests carry no individual student fields.
  const studentNameValue = type === "individual" ? studentName.trim() : null;
  const studentIdentifierValue =
    type === "individual" ? studentIdentifier?.trim() || null : null;

  const result = await query(
    `INSERT INTO report_requests
       (requester_id, counselor_id, request_type, student_name, student_identifier, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      requesterId,
      counselorId,
      type,
      studentNameValue,
      studentIdentifierValue,
      reason.trim(),
    ]
  );

  const requesterName = req.user?.name || "A College Representative";
  const collegeLabel = req.user?.college ? ` for ${req.user.college}` : "";
  const notificationMessage =
    type === "college"
      ? `${requesterName} requested a college-wide summary report${collegeLabel}.`
      : `${requesterName} requested a report on ${studentNameValue}.`;

  await query(
    `INSERT INTO notifications (user_id, title, message, status, link)
     VALUES (?, ?, ?, 'unread', ?)`,
    [
      counselorId,
      "Report request received",
      notificationMessage,
      `/counselor/reports`,
    ]
  );

  await logAction(req, "create_report_request", "report_request", result.insertId, {
    counselorId,
    requestType: type,
    studentName: studentNameValue,
  });

  return res.status(201).json({ message: "Report request submitted", id: result.insertId });
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
