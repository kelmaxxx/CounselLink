import crypto from "crypto";
import bcrypt from "bcryptjs";
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

  // Match against an existing student record (registered or a previous
  // walk-in placeholder) by Student ID so we don't create duplicates.
  const existingStudents = await query(
    "SELECT id FROM users WHERE student_id = ? AND role = 'student' LIMIT 1",
    [trimmed.studentIdNumber]
  );

  let studentUserId;
  let placeholderCreated = false;

  if (existingStudents.length > 0) {
    studentUserId = existingStudents[0].id;

    const existingPending = await query(
      "SELECT id FROM appointments WHERE student_id = ? AND is_urgent = 1 AND status = 'pending' LIMIT 1",
      [studentUserId]
    );
    if (existingPending.length > 0) {
      return res.status(200).json({ alreadyPending: true, message: ALREADY_PENDING_MESSAGE });
    }
  } else {
    // No account for this Student ID yet — create a placeholder student
    // record so the request can be linked to a student_id FK and the
    // student shows up in Student Records. It can't be logged into (random
    // password, synthetic email) and gets claimed/updated automatically if
    // this student later registers with the same Student ID.
    const placeholderEmail = `walkin-${trimmed.studentIdNumber.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}@placeholder.counselink.local`;
    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

    const userResult = await query(
      `INSERT INTO users (name, email, password, role, status, college, student_id, phone, is_placeholder)
       VALUES (?, ?, ?, 'student', 'approved', ?, ?, ?, 1)`,
      [trimmed.fullName, placeholderEmail, randomPassword, trimmed.college, trimmed.studentIdNumber, trimmed.contactNumber]
    );
    studentUserId = userResult.insertId;
    placeholderCreated = true;
  }

  const concernLabel =
    trimmed.natureOfConcern === "Other"
      ? `Other - ${trimmed.natureOfConcernOther}`
      : trimmed.natureOfConcern;

  const reason = `Urgent counseling request — ${concernLabel}\n\n${trimmed.description}`;

  const result = await query(
    `INSERT INTO appointments
      (student_id, counselor_id, appointment_type, status, reason, phone_number, is_urgent)
     VALUES (?, NULL, 'counseling', 'pending', ?, ?, 1)`,
    [studentUserId, reason, trimmed.contactNumber]
  );

  const counselors = await query(
    "SELECT id, name, email FROM users WHERE role = 'counselor' AND status = 'approved'"
  );

  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

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
      link: "/counselor/appointments",
      type: "urgent_counseling",
    }
  );
  notifyRole("counselor", { type: "appointments" });
  notifyRole("counselor", { type: "notification" });

  for (const counselor of counselors) {
    if (!counselor.email) continue;
    try {
      await sendEmail({
        to: counselor.email,
        subject: "URGENT: Counseling Request Submitted",
        text: `${message}\n\n${detailLines.join("\n")}\n\nPlease check your Pending requests as soon as possible.`,
        html: `<p>${message}</p><ul>${detailLines
          .map((line) => `<li>${line}</li>`)
          .join("")}</ul><p>Please check your Pending requests as soon as possible.</p>`,
      });
    } catch (err) {
      console.warn(`[urgent-counseling] Failed to email ${counselor.email}:`, err.message);
    }
  }

  await logAction(req, "urgent_counseling_request", "appointment", result.insertId, {
    studentIdNumber: trimmed.studentIdNumber,
    natureOfConcern: trimmed.natureOfConcern,
    studentUserId,
    placeholderCreated,
    counselorsNotified: counselors.length,
  });

  return res.status(201).json({ message: "Urgent counseling request submitted." });
};
