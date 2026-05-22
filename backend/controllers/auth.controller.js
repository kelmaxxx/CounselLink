import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query } from "../config/db.js";
import { sendEmail } from "../services/email.service.js";

const RESET_TTL_MINUTES = 30;
const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const buildToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
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
    },
  });
};

export const registerStudent = async (req, res) => {
  const { name, email, password, studentId, college, phone, corUrl, corFileName, corFileType } = req.body;
  if (!name || !email || !password || !studentId || !college) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const emailLower = email.toLowerCase();
  const allowedDomains = ["@msu.edu.ph", "@s.msumain.edu.ph", "@msumain.edu.ph"];
  if (!allowedDomains.some((domain) => emailLower.endsWith(domain))) {
    return res.status(400).json({ message: "Please use your MSU institutional email (e.g., name@s.msumain.edu.ph)" });
  }

  const existing = await query("SELECT * FROM users WHERE email = ? OR student_id = ?", [
    email,
    studentId,
  ]);

  if (existing.length) {
    const nonRejected = existing.find((user) => user.status !== "rejected");
    if (nonRejected) {
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
           student_id = ?,
           phone = ?,
           cor_url = ?,
           cor_file_name = ?,
           cor_file_type = ?,
           rejection_reason = NULL
       WHERE id = ?`,
      [
        name,
        email,
        hashed,
        college,
        studentId,
        phone || null,
        corUrl || null,
        corFileName || null,
        corFileType || null,
        uniqueIds[0],
      ]
    );

    return res.status(200).json({
      message: "Registration resubmitted. Please wait for approval.",
      id: uniqueIds[0],
    });
  }

  const hashed = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users (name, email, password, role, status, college, student_id, phone, cor_url, cor_file_name, cor_file_type)
     VALUES (?, ?, ?, 'student', 'pending_approval', ?, ?, ?, ?, ?, ?)` ,
    [name, email, hashed, college, studentId, phone || null, corUrl || null, corFileName || null, corFileType || null]
  );

  return res.status(201).json({
    message: "Registration submitted. Please wait for approval.",
    id: result.insertId,
  });
};

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const genericMessage = "If that email is registered, a reset link has been generated.";
  const userRows = await query("SELECT id, email, name FROM users WHERE email = ?", [email]);
  if (!userRows.length) {
    return res.json({ message: genericMessage });
  }

  const user = userRows[0];
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await query(
    "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [user.id, tokenHash, expiresAt]
  );

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/?reset=${rawToken}`;
  let emailDelivered = false;
  try {
    await sendEmail({
      to: user.email,
      subject: "CounselLink password reset",
      text: `Hello ${user.name},\n\nUse this token within ${RESET_TTL_MINUTES} minutes to reset your password: ${rawToken}\n\nOr open: ${resetUrl}\n\nIf you did not request this, ignore this email.`,
      html: `<p>Hello ${user.name},</p><p>Use this token within ${RESET_TTL_MINUTES} minutes to reset your password:</p><p style="font-family:monospace;background:#f3f4f6;padding:8px;border-radius:6px;">${rawToken}</p><p>Or open <a href="${resetUrl}">${resetUrl}</a>.</p><p>If you did not request this, ignore this email.</p>`,
    });
    emailDelivered = true;
  } catch (err) {
    console.warn("[password-reset] SMTP not configured, falling back to console log:", err.message);
    console.info(`[password-reset] token for ${user.email}: ${rawToken}`);
  }

  const payload = { message: genericMessage };
  if (process.env.NODE_ENV !== "production" && !emailDelivered) {
    payload.devToken = rawToken;
  }
  return res.json(payload);
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const tokenHash = hashResetToken(token);
  const rows = await query(
    "SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ? LIMIT 1",
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

  const hashed = await bcrypt.hash(password, 10);
  await query("UPDATE users SET password = ? WHERE id = ?", [hashed, record.user_id]);
  await query("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [record.id]);

  return res.json({ message: "Password updated. You can now log in with your new password." });
};
