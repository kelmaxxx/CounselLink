import crypto from "crypto";
import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { notifyUsers } from "../utils/notify.js";
import { notifyRole } from "../events.js";
import { logAction } from "../utils/audit.js";
import { sendEmail } from "../services/email.service.js";

const ALREADY_PENDING_MESSAGE =
  "You have already submitted an urgent counseling request today. Only one request is allowed per day. Please proceed to the Division of Student Affairs Office.";

// Public endpoint reachable from the login page, even by users without an
// account — req.user is always undefined here. logAction still records
// date/time + IP address with a null actor, which is the permanent record
// of the request.
export const createUrgentCounselingRequest = async (req, res) => {
  const { fullName, studentIdNumber, institutionalEmail, description } = req.body || {};

  const trimmed = {
    fullName: (fullName || "").trim(),
    studentIdNumber: (studentIdNumber || "").trim(),
    institutionalEmail: (institutionalEmail || "").trim().toLowerCase(),
    description: (description || "").trim(),
  };

  if (!trimmed.fullName || !trimmed.studentIdNumber || !trimmed.institutionalEmail || !trimmed.description) {
    return res.status(400).json({ message: "Please complete all required fields." });
  }

  const msuDomains = ["@msu.edu.ph", "@s.msumain.edu.ph", "@msumain.edu.ph"];
  if (!msuDomains.some((d) => trimmed.institutionalEmail.endsWith(d))) {
    return res.status(400).json({ message: "Please use a valid MSU institutional email." });
  }

  // Per-day duplicate check: one urgent request per student per calendar day.
  // Matches on student ID, institutional email, or full name (as specified).
  const matchedUserIds = new Set();

  const byStudentId = await query(
    "SELECT id FROM users WHERE student_id = ? AND role = 'student'",
    [trimmed.studentIdNumber]
  );
  for (const r of byStudentId) matchedUserIds.add(r.id);

  const byEmail = await query(
    "SELECT id FROM users WHERE LOWER(email) = ? AND is_placeholder = 0",
    [trimmed.institutionalEmail]
  );
  for (const r of byEmail) matchedUserIds.add(r.id);

  if (matchedUserIds.size > 0) {
    const ids = [...matchedUserIds];
    const ph = ids.map(() => "?").join(",");
    const todayByUser = await query(
      `SELECT id FROM appointments WHERE student_id IN (${ph}) AND is_urgent = 1 AND DATE(created_at) = CURDATE() LIMIT 1`,
      ids
    );
    if (todayByUser.length > 0) {
      return res.status(200).json({ alreadyPending: true, message: ALREADY_PENDING_MESSAGE });
    }
  }

  // Also check by name — catches unregistered students (placeholders) who try
  // to spam with a different student ID on the same day.
  const todayByName = await query(
    `SELECT a.id FROM appointments a
     JOIN users u ON a.student_id = u.id
     WHERE LOWER(u.name) = LOWER(?) AND a.is_urgent = 1 AND DATE(a.created_at) = CURDATE() LIMIT 1`,
    [trimmed.fullName]
  );
  if (todayByName.length > 0) {
    return res.status(200).json({ alreadyPending: true, message: ALREADY_PENDING_MESSAGE });
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
  } else {
    // No account for this Student ID yet — create a placeholder student
    // record so the request can be linked to a student_id FK and the
    // student shows up in Student Records. It can't be logged into (random
    // password, synthetic email) and gets claimed/updated automatically if
    // this student later registers with the same Student ID.
    const placeholderEmail = `walkin-${trimmed.studentIdNumber.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}@placeholder.counselink.local`;
    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

    const userResult = await query(
      `INSERT INTO users (name, email, password, role, status, student_id, is_placeholder)
       VALUES (?, ?, ?, 'student', 'approved', ?, 1)`,
      [trimmed.fullName, placeholderEmail, randomPassword, trimmed.studentIdNumber]
    );
    studentUserId = userResult.insertId;
    placeholderCreated = true;
  }

  // Compute queue position before inserting (count of currently pending urgent requests + 1)
  const queueRows = await query(
    "SELECT COUNT(*) AS cnt FROM appointments WHERE is_urgent = 1 AND status = 'pending'"
  );
  const queueNumber = (queueRows[0]?.cnt ?? 0) + 1;

  const result = await query(
    `INSERT INTO appointments
      (student_id, counselor_id, appointment_type, status, reason, is_urgent)
     VALUES (?, NULL, 'counseling', 'pending', ?, 1)`,
    [studentUserId, trimmed.description]
  );

  const counselors = await query(
    "SELECT id, name, email FROM users WHERE role = 'counselor' AND status = 'approved'"
  );

  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const title = "Urgent Counseling Request";
  const message = `An urgent counseling request was submitted on ${timestamp}.`;
  const detailLines = [
    `Name: ${trimmed.fullName}`,
    `Student ID: ${trimmed.studentIdNumber}`,
    `Institutional Email: ${trimmed.institutionalEmail}`,
    `Queue #: ${queueNumber}`,
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
    institutionalEmail: trimmed.institutionalEmail,
    queueNumber,
    studentUserId,
    placeholderCreated,
    counselorsNotified: counselors.length,
  });

  return res.status(201).json({ message: "Urgent counseling request submitted.", queueNumber });
};
