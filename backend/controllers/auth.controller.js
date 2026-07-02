import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query } from "../config/db.js";
import { sendEmail } from "../services/email.service.js";
import { validatePassword } from "../utils/password.js";
import { isValidPhMobile } from "../utils/validators.js";

const RESET_TTL_MINUTES = 10;
// Signup code lives a little longer than the password-reset code: after entering
// it, the student still has to finish the form (uploads, etc.) and the same
// window also caps how long the "verified" state stays valid before submit.
const VERIFY_TTL_MINUTES = 20;
const MAX_OTP_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 5;
const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Institutional student email domains for self-registration. Only students sign
// themselves up (counselor/admin/college_rep accounts are created by the admin),
// so this list gates the public signup + email-verification endpoints.
const STUDENT_EMAIL_DOMAINS = ["@msu.edu.ph", "@s.msumain.edu.ph", "@msumain.edu.ph"];
const isAllowedStudentEmail = (email) => {
  const lower = String(email || "").toLowerCase();
  return STUDENT_EMAIL_DOMAINS.some((domain) => lower.endsWith(domain));
};

const generateOtp = () =>
  String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const safeEqual = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const buildToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, email: user.email, college: user.college || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

export const login = async (req, res) => {
  const { identifier, password, role } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  const userRows = await query(
    "SELECT * FROM users WHERE (role = ? OR ? IS NULL) AND (email = ? OR student_id = ?)",
    [role || null, role || null, identifier, identifier]
  );

  if (!userRows.length) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const user = userRows[0];
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (user.role === "student" && user.status === "pending_approval") {
    return res.status(403).json({ message: "Account pending approval", status: "pending_approval" });
  }

  if (user.role === "student" && user.status === "rejected") {
    return res.status(403).json({ message: "Account rejected", status: "rejected" });
  }

  const token = buildToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      status: user.status,
      college: user.college,
      studentId: user.student_id,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      bio: user.bio,
    },
  });
};

export const registerStudent = async (req, res) => {
  const { name, email, password, studentId, college, department, program, phone, corUrl, corFileName, corFileType, avatarUrl, avatarFileName, avatarFileType } = req.body;
  if (!name || !email || !password || !studentId || !college) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (phone && !isValidPhMobile(phone)) {
    return res.status(400).json({ message: "Phone number must start with 09 and have 11 digits" });
  }

  const policy = validatePassword(password);
  if (!policy.ok) {
    return res.status(400).json({ message: policy.message });
  }

  const emailLower = email.toLowerCase();
  if (!isAllowedStudentEmail(emailLower)) {
    return res.status(400).json({ message: "Please use your MSU institutional email (e.g., name@s.msumain.edu.ph)" });
  }

  // The email must have been proven-owned via the emailed code first. This is
  // the server-side gate — the signup form also blocks submit until verified,
  // but never trust the client.
  const verifiedRows = await query(
    `SELECT id FROM email_verifications
     WHERE email = ? AND verified_at IS NOT NULL AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [emailLower]
  );
  if (!verifiedRows.length) {
    return res.status(400).json({
      message: "Please verify your email address before registering.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }
  const verificationId = verifiedRows[0].id;
  const consumeVerification = () =>
    query("UPDATE email_verifications SET consumed_at = NOW() WHERE id = ?", [verificationId]);

  const existing = await query("SELECT * FROM users WHERE email = ? OR student_id = ?", [
    email,
    studentId,
  ]);

  if (existing.length) {
    const blocking = existing.find((user) => user.status !== "rejected" && !user.is_placeholder);
    if (blocking) {
      return res.status(409).json({ message: "Email or student ID already in use" });
    }

    const nonStudent = existing.find((user) => user.role !== "student");
    if (nonStudent) {
      return res.status(409).json({ message: "Email or student ID already in use" });
    }

    const uniqueIds = [...new Set(existing.map((user) => user.id))];
    if (uniqueIds.length > 1) {
      return res.status(409).json({ message: "Email or student ID already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users
       SET name = ?,
           email = ?,
           password = ?,
           status = 'pending_approval',
           college = ?,
           department = ?,
           program = ?,
           student_id = ?,
           phone = ?,
           cor_url = ?,
           cor_file_name = ?,
           cor_file_type = ?,
           avatar_url = ?,
           avatar_file_name = ?,
           avatar_file_type = ?,
           rejection_reason = NULL,
           is_placeholder = 0
       WHERE id = ?`,
      [
        name,
        email,
        hashed,
        college,
        department || null,
        program || null,
        studentId,
        phone || null,
        corUrl || null,
        corFileName || null,
        corFileType || null,
        avatarUrl || null,
        avatarFileName || null,
        avatarFileType || null,
        uniqueIds[0],
      ]
    );

    await consumeVerification();
    return res.status(200).json({
      message: "Registration resubmitted. Please wait for approval.",
      id: uniqueIds[0],
    });
  }

  const hashed = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users (name, email, password, role, status, college, department, program, student_id, phone, cor_url, cor_file_name, cor_file_type, avatar_url, avatar_file_name, avatar_file_type)
     VALUES (?, ?, ?, 'student', 'pending_approval', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [name, email, hashed, college, department || null, program || null, studentId, phone || null, corUrl || null, corFileName || null, corFileType || null, avatarUrl || null, avatarFileName || null, avatarFileType || null]
  );

  await consumeVerification();
  return res.status(201).json({
    message: "Registration submitted. Please wait for approval.",
    id: result.insertId,
  });
};

// Step 1 of signup email verification: email a 6-digit code to the address the
// student typed, proving (once confirmed) that the mailbox is real and theirs.
export const sendSignupCode = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const emailLower = String(email).trim().toLowerCase();
  if (!isAllowedStudentEmail(emailLower)) {
    return res.status(400).json({
      message: "Please use your MSU institutional email (e.g., name@s.msumain.edu.ph)",
    });
  }

  // Fail early (and helpfully) if the email already belongs to a real account —
  // the register endpoint would 409 anyway, and here it's the student's own
  // address so there's nothing to leak.
  const existing = await query(
    "SELECT status, is_placeholder FROM users WHERE email = ?",
    [emailLower]
  );
  const inUse = existing.some((u) => u.status !== "rejected" && !u.is_placeholder);
  if (inUse) {
    return res.status(409).json({ message: "That email is already registered. Try logging in instead." });
  }

  const recent = await query(
    `SELECT COUNT(*) AS n FROM email_verifications
     WHERE email = ? AND created_at > (NOW() - INTERVAL 1 HOUR)`,
    [emailLower]
  );
  if (recent[0]?.n >= MAX_REQUESTS_PER_HOUR) {
    return res.status(429).json({ message: "Too many codes requested. Please try again later." });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MINUTES * 60 * 1000);
  await query(
    "INSERT INTO email_verifications (email, otp_code, expires_at) VALUES (?, ?, ?)",
    [emailLower, otp, expiresAt]
  );

  // Respond before the SMTP round-trip (same pattern as password reset): the
  // code is already persisted, so delivery can happen in the background.
  res.json({ message: "A 6-digit verification code has been sent to your email." });

  sendEmail({
    to: emailLower,
    subject: "Your CounselLink email verification code",
    text: `Your CounselLink verification code is: ${otp}\n\nEnter this code to confirm your email. It expires in ${VERIFY_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
    html: `<p>Your CounselLink email verification code is:</p>
<p style="font-family:monospace;font-size:28px;letter-spacing:6px;background:#f3f4f6;padding:12px 16px;border-radius:8px;text-align:center;font-weight:600;color:#7f1d1d;">${otp}</p>
<p>Enter this code to confirm your email. It expires in <strong>${VERIFY_TTL_MINUTES} minutes</strong>. If you did not request this, ignore this email.</p>`,
  }).catch((err) => {
    console.warn("[signup-verify] Email send failed:", err.message);
    if (process.env.NODE_ENV !== "production") {
      console.info(`[signup-verify] Code for ${emailLower}: ${otp}`);
    }
  });
};

// Step 2 of signup email verification: confirm the emailed code. On success the
// row is marked verified; registerStudent later requires (and consumes) it.
export const verifySignupCode = async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  const emailLower = String(email).trim().toLowerCase();
  const rows = await query(
    `SELECT id, otp_code, otp_attempts FROM email_verifications
     WHERE email = ? AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [emailLower]
  );
  if (!rows.length) {
    return res.status(400).json({ message: "Code expired. Request a new one." });
  }

  const record = rows[0];
  if (record.otp_attempts >= MAX_OTP_ATTEMPTS) {
    await query("UPDATE email_verifications SET consumed_at = NOW() WHERE id = ?", [record.id]);
    return res.status(400).json({ message: "Too many wrong codes. Request a new one." });
  }

  const submitted = String(code).trim();
  if (!safeEqual(submitted, record.otp_code || "")) {
    await query(
      "UPDATE email_verifications SET otp_attempts = otp_attempts + 1 WHERE id = ?",
      [record.id]
    );
    const left = MAX_OTP_ATTEMPTS - (record.otp_attempts + 1);
    return res.status(400).json({
      message:
        left > 0
          ? `Invalid code. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "Invalid code. Request a new one.",
    });
  }

  await query("UPDATE email_verifications SET verified_at = NOW() WHERE id = ?", [record.id]);
  return res.json({ message: "Email verified." });
};

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const genericMessage =
    "If that email is registered, a 6-digit verification code has been sent.";
  const userRows = await query("SELECT id, email, name FROM users WHERE email = ?", [email]);
  if (!userRows.length) {
    return res.json({ message: genericMessage });
  }

  const user = userRows[0];

  const recent = await query(
    `SELECT COUNT(*) AS n FROM password_resets
     WHERE user_id = ? AND created_at > (NOW() - INTERVAL 1 HOUR)`,
    [user.id]
  );
  if (recent[0]?.n >= MAX_REQUESTS_PER_HOUR) {
    return res.status(429).json({
      message: "Too many reset requests. Please try again later.",
    });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await query(
    "INSERT INTO password_resets (user_id, token_hash, otp_code, expires_at) VALUES (?, ?, ?, ?)",
    [user.id, tokenHash, otp, expiresAt]
  );

  // Respond immediately. Sending the email over SMTP can take several seconds
  // (Gmail connect + auth), and we never want the user to wait on it — the OTP
  // is already persisted, so delivery can happen in the background.
  res.json({ message: genericMessage });

  // Fire-and-forget: failures are logged, not surfaced (the generic message
  // already avoids leaking whether the account exists).
  sendEmail({
    to: user.email,
    subject: "Your CounselLink password reset code",
    text: `Hello ${user.name},\n\nYour verification code is: ${otp}\n\nThis code expires in ${RESET_TTL_MINUTES} minutes. If you did not request a password reset, ignore this email.`,
    html: `<p>Hello ${user.name},</p>
<p>Your CounselLink password reset code is:</p>
<p style="font-family:monospace;font-size:28px;letter-spacing:6px;background:#f3f4f6;padding:12px 16px;border-radius:8px;text-align:center;font-weight:600;color:#7f1d1d;">${otp}</p>
<p>This code expires in <strong>${RESET_TTL_MINUTES} minutes</strong>. If you did not request a password reset, ignore this email.</p>`,
  }).catch((err) => {
    console.warn("[password-reset] Email send failed:", err.message);
    if (process.env.NODE_ENV !== "production") {
      // In dev, the SMTP creds are often placeholders — surface the OTP so you
      // can still test the flow from the backend console.
      console.info(`[password-reset] OTP for ${user.email}: ${otp}`);
    }
  });
};

export const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  const userRows = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (!userRows.length) {
    return res.status(400).json({ message: "Invalid code" });
  }
  const userId = userRows[0].id;

  const rows = await query(
    `SELECT id, token_hash, otp_code, otp_attempts, expires_at, used_at
     FROM password_resets
     WHERE user_id = ? AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (!rows.length) {
    return res.status(400).json({ message: "Code expired. Request a new one." });
  }

  const record = rows[0];
  if (record.otp_attempts >= MAX_OTP_ATTEMPTS) {
    await query("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [record.id]);
    return res.status(400).json({
      message: "Too many wrong codes. Request a new one.",
    });
  }

  const submitted = String(otp).trim();
  if (!safeEqual(submitted, record.otp_code || "")) {
    await query(
      "UPDATE password_resets SET otp_attempts = otp_attempts + 1 WHERE id = ?",
      [record.id]
    );
    const left = MAX_OTP_ATTEMPTS - (record.otp_attempts + 1);
    return res.status(400).json({
      message:
        left > 0
          ? `Invalid code. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "Invalid code. Request a new one.",
    });
  }

  await query(
    "UPDATE password_resets SET otp_verified_at = NOW() WHERE id = ?",
    [record.id]
  );

  // Hand back the raw token only after OTP success. We never persisted it raw —
  // re-issue a NEW raw token tied to this row so the next step can authenticate.
  const newRaw = crypto.randomBytes(32).toString("hex");
  const newHash = hashResetToken(newRaw);
  await query("UPDATE password_resets SET token_hash = ? WHERE id = ?", [newHash, record.id]);

  return res.json({ token: newRaw });
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required" });
  }
  const policy = validatePassword(password);
  if (!policy.ok) {
    return res.status(400).json({ message: policy.message });
  }

  const tokenHash = hashResetToken(token);
  const rows = await query(
    `SELECT id, user_id, expires_at, used_at, otp_verified_at
     FROM password_resets WHERE token_hash = ? LIMIT 1`,
    [tokenHash]
  );
  if (!rows.length) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
  const record = rows[0];
  if (record.used_at) {
    return res.status(400).json({ message: "This reset token has already been used" });
  }
  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ message: "This reset token has expired" });
  }
  if (!record.otp_verified_at) {
    return res.status(400).json({ message: "Verify your code before resetting the password" });
  }

  const hashed = await bcrypt.hash(password, 10);
  await query("UPDATE users SET password = ? WHERE id = ?", [hashed, record.user_id]);
  await query("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [record.id]);

  return res.json({ message: "Password updated. You can now log in with your new password." });
};
