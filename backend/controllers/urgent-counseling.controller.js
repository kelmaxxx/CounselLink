import { query } from "../config/db.js";
import { notifyUsers } from "../utils/notify.js";
import { notifyRole } from "../events.js";
import { logAction } from "../utils/audit.js";
import { sendEmail } from "../services/email.service.js";

const NATURE_OF_CONCERN_OPTIONS = [
  "Mental Health Crisis",
  "Academic Distress",
  "Family Problem",
  "Harassment or Bullying",
  "Personal Emergency",
  "Other",
];

const ALREADY_PENDING_MESSAGE =
  "Your urgent counseling request has already been submitted and is awaiting counselor assistance. Please proceed to the Division of Student Affairs Office.";

// Public endpoint reachable from the login page, even by users without an
// account — req.user is always undefined here. logAction still records
// date/time + IP address with a null actor, which is the permanent record
// of the request.
export const createUrgentCounselingRequest = async (req, res) => {
  const {
    fullName,
    studentIdNumber,
    college,
    contactNumber,
    natureOfConcern,
    natureOfConcernOther,
    description,
  } = req.body || {};

  const trimmed = {
    fullName: (fullName || "").trim(),
    studentIdNumber: (studentIdNumber || "").trim(),
    college: (college || "").trim(),
    contactNumber: (contactNumber || "").trim(),
    natureOfConcern: (natureOfConcern || "").trim(),
    natureOfConcernOther: (natureOfConcernOther || "").trim(),
    description: (description || "").trim(),
  };

  const hasAllRequired =
    trimmed.fullName &&
    trimmed.studentIdNumber &&
    trimmed.college &&
    trimmed.contactNumber &&
    trimmed.natureOfConcern &&
    trimmed.description &&
    NATURE_OF_CONCERN_OPTIONS.includes(trimmed.natureOfConcern) &&
    (trimmed.natureOfConcern !== "Other" || trimmed.natureOfConcernOther);

  if (!hasAllRequired) {
    return res.status(400).json({ message: "Please complete all required fields." });
  }

  const existing = await query(
    "SELECT id FROM urgent_counseling_requests WHERE student_id_number = ? AND status = 'pending' LIMIT 1",
    [trimmed.studentIdNumber]
  );

  if (existing.length > 0) {
    return res.status(200).json({ alreadyPending: true, message: ALREADY_PENDING_MESSAGE });
  }

  const result = await query(
    `INSERT INTO urgent_counseling_requests
      (full_name, student_id_number, college, contact_number, nature_of_concern, nature_of_concern_other, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      trimmed.fullName,
      trimmed.studentIdNumber,
      trimmed.college,
      trimmed.contactNumber,
      trimmed.natureOfConcern,
      trimmed.natureOfConcern === "Other" ? trimmed.natureOfConcernOther : null,
      trimmed.description,
    ]
  );

  const counselors = await query(
    "SELECT id, name, email FROM users WHERE role = 'counselor' AND status = 'approved'"
  );

  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const concernLabel =
    trimmed.natureOfConcern === "Other"
      ? `Other - ${trimmed.natureOfConcernOther}`
      : trimmed.natureOfConcern;

  const title = "Urgent Counseling Request";
  const message = `An urgent counseling request was submitted from the login page on ${timestamp}.`;
  const detailLines = [
    `Name: ${trimmed.fullName}`,
    `Student ID: ${trimmed.studentIdNumber}`,
    `College/Department: ${trimmed.college}`,
    `Contact Number: ${trimmed.contactNumber}`,
    `Nature of Concern: ${concernLabel}`,
    `Description: ${trimmed.description}`,
  ];

  await notifyUsers(
    counselors.map((c) => c.id),
    {
      title,
      message: `${message} ${detailLines.join(" | ")}`,
      link: "/counselor/urgent-requests",
      type: "urgent_counseling",
    }
  );
  notifyRole("counselor", { type: "urgent-requests" });
  notifyRole("counselor", { type: "notification" });

  for (const counselor of counselors) {
    if (!counselor.email) continue;
    try {
      await sendEmail({
        to: counselor.email,
        subject: "URGENT: Counseling Request Submitted",
        text: `${message}\n\n${detailLines.join("\n")}\n\nPlease check the Urgent Requests page as soon as possible.`,
        html: `<p>${message}</p><ul>${detailLines
          .map((line) => `<li>${line}</li>`)
          .join("")}</ul><p>Please check the Urgent Requests page as soon as possible.</p>`,
      });
    } catch (err) {
      console.warn(`[urgent-counseling] Failed to email ${counselor.email}:`, err.message);
    }
  }

  await logAction(req, "urgent_counseling_request", "urgent_counseling_request", result.insertId, {
    studentIdNumber: trimmed.studentIdNumber,
    natureOfConcern: trimmed.natureOfConcern,
    counselorsNotified: counselors.length,
  });

  return res.status(201).json({ message: "Urgent counseling request submitted." });
};

// Counselor-only: list all urgent counseling requests, newest first.
export const listUrgentCounselingRequests = async (req, res) => {
  const rows = await query(
    `SELECT ucr.*, u.name AS resolved_by_name
     FROM urgent_counseling_requests ucr
     LEFT JOIN users u ON ucr.resolved_by = u.id
     ORDER BY ucr.created_at DESC`
  );

  const requests = rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    studentIdNumber: r.student_id_number,
    college: r.college,
    contactNumber: r.contact_number,
    natureOfConcern: r.nature_of_concern,
    natureOfConcernOther: r.nature_of_concern_other,
    description: r.description,
    status: r.status,
    resolvedBy: r.resolved_by,
    resolvedByName: r.resolved_by_name,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return res.json(requests);
};

// Counselor-only: mark a pending request as resolved, re-opening that
// student ID for future urgent requests.
export const resolveUrgentCounselingRequest = async (req, res) => {
  const { id } = req.params;

  const result = await query(
    "UPDATE urgent_counseling_requests SET status = 'resolved', resolved_by = ?, resolved_at = NOW() WHERE id = ? AND status = 'pending'",
    [req.user.id, id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: "Request not found or already resolved." });
  }

  await logAction(req, "resolve_urgent_counseling_request", "urgent_counseling_request", Number(id), {});
  notifyRole("counselor", { type: "urgent-requests" });

  return res.json({ message: "Marked as resolved." });
};
