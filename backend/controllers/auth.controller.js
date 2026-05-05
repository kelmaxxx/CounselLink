import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

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
