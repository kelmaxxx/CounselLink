// backend/controllers/consent-revocation.controller.js
// Handles the student-initiated consent revocation request workflow.
//
// State machine:
//   (no record)          → student submits  → PENDING
//   PENDING              → counselor approves → APPROVED  (consent.revoked_at set)
//   PENDING              → counselor rejects  → REJECTED  (consent unchanged)
//   APPROVED / REJECTED  → student may submit a new request (new row)

import { query, withTransaction } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification } from "../utils/notify.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

const isCounselor = (req) => req.user?.role === "admin" || req.user?.role === "counselor";
const isStudent   = (req) => req.user?.role === "student";

const requestTypeOf = (value) => (value === "authorization" ? "authorization" : "consent");
const typeLabel = (type) => (type === "authorization" ? "data authorization" : "informed consent");

// Build a full request row with student and decider names.
const SELECT_REQUEST = `
  SELECT
    r.id, r.consent_id AS consentId, r.student_id AS studentId,
    r.request_type AS requestType,
    r.status, r.requested_at AS requestedAt,
    r.decided_by AS decidedBy, r.decided_at AS decidedAt,
    r.rejection_reason AS rejectionReason,
    r.created_at AS createdAt, r.updated_at AS updatedAt,
    s.name AS studentName
  FROM consent_revocation_requests r
  JOIN users s ON r.student_id = s.id
`;

// ─── GET /api/consent-revocations/:studentId/request ────────────────────────
// Returns the most-recent (active or decided) request for this student's
// consent, so the student can see their own status and the counselor can
// review it before making a decision.
export const getRequest = async (req, res) => {
  const { studentId } = req.params;
  const type = requestTypeOf(req.query.type);

  // Students can only fetch their own request.
  if (isStudent(req) && req.user.id !== Number(studentId)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!isCounselor(req) && !isStudent(req)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Get the latest request for this student (pending first, then by date).
  const rows = await query(
    `${SELECT_REQUEST}
     WHERE r.student_id = ? AND r.request_type = ?
     ORDER BY
       CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,
       r.requested_at DESC
     LIMIT 1`,
    [studentId, type]
  );

  if (!rows.length) return res.status(404).json({ message: "No revocation request found" });
  return res.json(rows[0]);
};

// ─── GET /api/consent-revocations/pending ───────────────────────────────────
// Counselor: list all pending requests (across all students they can access).
export const listPendingRequests = async (req, res) => {
  if (!isCounselor(req)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const rows = await query(
    `${SELECT_REQUEST}
     WHERE r.status = 'pending'
     ORDER BY r.requested_at ASC`
  );

  return res.json(rows);
};

// ─── POST /api/consent-revocations/:studentId/request ───────────────────────
// Student submits a revocation request for their own consent or their
// inventory data authorization. Body: { type: "consent" | "authorization" }
export const submitRequest = async (req, res) => {
  const { studentId } = req.params;
  const userId = req.user?.id;
  const type = requestTypeOf(req.body?.type);

  // Must be the student themselves.
  if (!isStudent(req) || userId !== Number(studentId)) {
    return res.status(403).json({ message: "Only the student can submit a revocation request for their own consent" });
  }

  // Verify a consent record exists (the request row references it).
  const consents = await query(
    "SELECT id, revoked_at FROM student_consents WHERE student_id = ?",
    [studentId]
  );
  if (!consents.length) {
    return res.status(409).json({ message: "No consent record found. Sign informed consent first." });
  }
  const consent = consents[0];

  if (type === "consent" && consent.revoked_at) {
    return res.status(409).json({ message: "Consent is already revoked." });
  }

  if (type === "authorization") {
    const inventories = await query(
      "SELECT form_data FROM student_inventories WHERE student_id = ?",
      [studentId]
    );
    let formData = inventories[0]?.form_data;
    if (typeof formData === "string") {
      try { formData = JSON.parse(formData); } catch { formData = null; }
    }
    const ack = formData?.acknowledgment || {};
    if (!ack.disclaimerAgreed || ack.disclaimerRevokedAt) {
      return res.status(409).json({ message: "No active data authorization to revoke." });
    }
  }

  // Guard: only one pending request per type at a time. The generated
  // unique key uq_crr_pending_type backs this up at the DB level.
  const existing = await query(
    "SELECT id FROM consent_revocation_requests WHERE consent_id = ? AND request_type = ? AND status = 'pending'",
    [consent.id, type]
  );
  if (existing.length) {
    return res.status(409).json({ message: `A ${typeLabel(type)} revocation request is already pending.` });
  }

  const result = await query(
    `INSERT INTO consent_revocation_requests (consent_id, request_type, student_id, status, requested_at)
     VALUES (?, ?, ?, 'pending', NOW())`,
    [consent.id, type, studentId]
  );

  await logAction(req, "submit_revocation_request", "consent_revocation_request", result.insertId, {
    consentId: consent.id,
    requestType: type,
  });

  // Notify all counselors so the pending queue updates in real-time.
  const counselors = await query("SELECT id FROM users WHERE role = 'counselor' AND status = 'approved'");
  if (counselors.length) {
    const { notifyUsers } = await import("../utils/notify.js");
    const { notifyRole }  = await import("../events.js");
    await notifyUsers(
      counselors.map((c) => c.id),
      {
        title: `${type === "authorization" ? "Authorization" : "Consent"} Revocation Request`,
        message: `A student has requested revocation of their ${typeLabel(type)}. Please review it in the student's Consent tab.`,
        link: "/students",
        type: "info",
      }
    );
    notifyRole("counselor", { type: "notification" });
  }

  const rows = await query(
    `${SELECT_REQUEST} WHERE r.id = ?`,
    [result.insertId]
  );
  return res.status(201).json(rows[0]);
};

// ─── POST /api/consent-revocations/:requestId/decide ────────────────────────
// Counselor approves or rejects a pending request.
// Body: { action: "approve" | "reject", rejectionReason?: string }
export const decideRequest = async (req, res) => {
  const { requestId } = req.params;
  const { action, rejectionReason } = req.body;
  const counselorId = req.user?.id;

  if (!isCounselor(req)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
  }
  if (action === "reject" && rejectionReason && rejectionReason.length > 1000) {
    return res.status(400).json({ message: "Rejection reason must be 1000 characters or fewer" });
  }

  // Fetch the request inside the transaction to lock the row.
  let decided;
  try {
    decided = await withTransaction(async (txQuery) => {
      // Lock the request row.
      const requests = await txQuery(
        "SELECT * FROM consent_revocation_requests WHERE id = ? FOR UPDATE",
        [requestId]
      );
      if (!requests.length) {
        const err = new Error("Revocation request not found");
        err.statusCode = 404;
        throw err;
      }
      const request = requests[0];

      if (request.status !== "pending") {
        const err = new Error(`This request has already been ${request.status}`);
        err.statusCode = 409;
        throw err;
      }

      const newStatus = action === "approve" ? "approved" : "rejected";

      // Update the request record.
      await txQuery(
        `UPDATE consent_revocation_requests
         SET status = ?, decided_by = ?, decided_at = NOW(),
             rejection_reason = ?, updated_at = NOW()
         WHERE id = ?`,
        [newStatus, counselorId, rejectionReason?.trim() || null, requestId]
      );

      // On approval: revoke only the requested item. Consent and data
      // authorization are independent; either way the inventory signature is
      // suppressed on the active form (consent.revokedAt or disclaimerRevokedAt).
      if (action === "approve") {
        if (request.request_type === "authorization") {
          const inventories = await txQuery(
            "SELECT id, form_data FROM student_inventories WHERE student_id = ?",
            [request.student_id]
          );
          if (inventories.length) {
            let formData = inventories[0].form_data;
            if (typeof formData === "string") {
              try { formData = JSON.parse(formData); } catch { formData = {}; }
            }
            formData = formData || {};
            formData.acknowledgment = {
              ...(formData.acknowledgment || {}),
              disclaimerAgreed: false,
              disclaimerRevokedAt: new Date().toISOString(),
            };
            await txQuery(
              "UPDATE student_inventories SET form_data = ?, updated_at = NOW() WHERE student_id = ?",
              [JSON.stringify(formData), request.student_id]
            );
          }
        } else {
          await txQuery(
            "UPDATE student_consents SET revoked_at = NOW(), updated_at = NOW() WHERE id = ?",
            [request.consent_id]
          );
        }
      }

      return request;
    });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) return res.status(status).json({ message: err.message });
    throw err; // re-throw for the central error handler
  }

  // Fetch counselor name for the notification message.
  const counselors = await query("SELECT name FROM users WHERE id = ?", [counselorId]);
  const counselorName = counselors[0]?.name || "Your counselor";

  // Notify the student of the decision (outside the transaction so a
  // notification failure does not roll back the consent update).
  try {
    const link = "/student/profile";
    const label = typeLabel(decided.request_type);
    const titleType = decided.request_type === "authorization" ? "Authorization" : "Consent";
    if (action === "approve") {
      await createNotification({
        userId: decided.student_id,
        title: `${titleType} Revocation Approved`,
        message: `${counselorName} has approved your request to revoke your ${label}. Your ${label} has been revoked.`,
        link,
        type: "info",
      });
    } else {
      const reasonSuffix = rejectionReason?.trim()
        ? ` Reason: ${rejectionReason.trim()}`
        : "";
      await createNotification({
        userId: decided.student_id,
        title: `${titleType} Revocation Rejected`,
        message: `${counselorName} has rejected your request to revoke your ${label}. Your ${label} remains active.${reasonSuffix}`,
        link,
        type: "info",
      });
    }
  } catch (notifyErr) {
    // Log but don't fail — the decision is already committed.
    console.error("Notification failed after consent revocation decision:", notifyErr);
  }

  await logAction(req, `${action}_revocation_request`, "consent_revocation_request", Number(requestId), {
    studentId: decided.student_id,
    consentId: decided.consent_id,
    requestType: decided.request_type,
    rejectionReason: rejectionReason?.trim() || null,
  });

  const rows = await query(`${SELECT_REQUEST} WHERE r.id = ?`, [requestId]);
  return res.json(rows[0]);
};
