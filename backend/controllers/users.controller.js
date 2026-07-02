import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { isValidPhMobile } from "../utils/validators.js";

const SELECT_FIELDS = `
  id, name, email, role, status, college, student_id AS studentId, phone,
  program, year_level AS yearLevel, bio, department, specialization, position,
  employee_id AS employeeId, cor_url AS corUrl, cor_file_name AS corFileName,
  cor_file_type AS corFileType, avatar_url AS avatarUrl,
  avatar_file_name AS avatarFileName, avatar_file_type AS avatarFileType,
  signature_url AS signatureUrl, signature_file_name AS signatureFileName,
  signature_file_type AS signatureFileType,
  created_at, updated_at
`;

const FIELD_TO_COLUMN = {
  name: "name",
  email: "email",
  phone: "phone",
  bio: "bio",
  department: "department",
  specialization: "specialization",
  position: "position",
  college: "college",
  program: "program",
  yearLevel: "year_level",
  studentId: "student_id",
  employeeId: "employee_id",
  avatarUrl: "avatar_url",
  avatarFileName: "avatar_file_name",
  avatarFileType: "avatar_file_type",
  signatureUrl: "signature_url",
  signatureFileName: "signature_file_name",
  signatureFileType: "signature_file_type",
};

const AVATAR_FIELDS = ["avatarUrl", "avatarFileName", "avatarFileType"];
const SIGNATURE_FIELDS = ["signatureUrl", "signatureFileName", "signatureFileType"];

const SELF_UPDATABLE = {
  student: ["name", "email", "phone", "bio", ...AVATAR_FIELDS, ...SIGNATURE_FIELDS],
  counselor: ["name", "email", "phone", "bio", "department", "specialization", "position", ...AVATAR_FIELDS, ...SIGNATURE_FIELDS],
  college_rep: ["name", "email", "phone", "college", ...AVATAR_FIELDS, ...SIGNATURE_FIELDS],
  admin: ["name", "email", "phone", ...AVATAR_FIELDS, ...SIGNATURE_FIELDS],
};

const ADMIN_UPDATABLE = [
  "name", "email", "phone", "bio", "college", "program", "studentId",
  "department", "specialization", "position", "employeeId",
  ...AVATAR_FIELDS, ...SIGNATURE_FIELDS,
];

const buildUpdate = (allowedFields, body) => {
  const updates = [];
  const params = [];
  for (const field of allowedFields) {
    if (field in body) {
      const column = FIELD_TO_COLUMN[field];
      const value = body[field];
      if (field === "email" && value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        return { error: "Invalid email format" };
      }
      if (field === "phone" && value && !isValidPhMobile(value)) {
        return { error: "Phone number must start with 09 and have 11 digits" };
      }
      updates.push(`${column} = ?`);
      params.push(value === "" ? null : value);
    }
  }
  return { updates, params };
};

export const getMe = async (req, res) => {
  const userId = req.user?.id;
  const rows = await query(`SELECT ${SELECT_FIELDS} FROM users WHERE id = ?`, [userId]);
  if (!rows.length) return res.status(404).json({ message: "User not found" });
  return res.json(rows[0]);
};

export const updateMe = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const allowed = SELF_UPDATABLE[role] || [];

  const built = buildUpdate(allowed, req.body);
  if (built.error) return res.status(400).json({ message: built.error });
  if (!built.updates.length) return res.status(400).json({ message: "No valid fields to update" });

  if ("email" in req.body && req.body.email) {
    const dup = await query("SELECT id FROM users WHERE email = ? AND id <> ?", [req.body.email, userId]);
    if (dup.length) return res.status(409).json({ message: "Email already in use" });
  }

  built.params.push(userId);
  await query(
    `UPDATE users SET ${built.updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
    built.params
  );
  const rows = await query(`SELECT ${SELECT_FIELDS} FROM users WHERE id = ?`, [userId]);
  return res.json(rows[0]);
};

export const lookupUser = async (req, res) => {
  const { id } = req.params;
  const rows = await query(
    `SELECT id, name, role, college, student_id AS studentId, program, year_level AS yearLevel,
            department, specialization, position, bio, employee_id AS employeeId, email, phone,
            avatar_url AS avatarUrl, signature_url AS signatureUrl,
            signature_file_name AS signatureFileName, signature_file_type AS signatureFileType
     FROM users WHERE id = ?`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: "User not found" });
  return res.json(rows[0]);
};

// Aggregate-only, role-agnostic lookup (mirrors getCounselorRating's contract)
// so a counselor's public profile can show how many distinct students they've
// counseled and how many sessions they've conducted, without exposing any
// individual appointment record to the viewer.
export const getCounselorStats = async (req, res) => {
  const { id } = req.params;
  const rows = await query(
    `SELECT COUNT(*) AS sessionsCount, COUNT(DISTINCT student_id) AS studentsCount
     FROM appointments
     WHERE counselor_id = ? AND status = 'completed'`,
    [id]
  );
  const { sessionsCount, studentsCount } = rows[0] || {};
  return res.json({
    sessionsCount: Number(sessionsCount) || 0,
    studentsCount: Number(studentsCount) || 0,
  });
};

export const listUsers = async (req, res) => {
  const { role } = req.query;
  const requesterRole = req.user?.role;
  const requesterCollege = req.user?.college || null;

  // College reps can only see students from their own college and the full counselor directory.
  let scopeToRepCollege = false;

  if (requesterRole === "admin") {
    // admin can list anything
  } else if (
    requesterRole === "counselor" &&
    ["student", "counselor", "college_rep"].includes(role)
  ) {
    // counselors can list students (session/appointment pickers),
    // other counselors (referral targets), and college_rep (report recipients)
  } else if (
    requesterRole === "college_rep" &&
    ["student", "counselor"].includes(role)
  ) {
    // college reps need students (referral subjects, scoped to their college)
    // and counselors (referral / report-request targets)
    if (role === "student") scopeToRepCollege = true;
  } else if (requesterRole === "student" && role === "counselor") {
    // students can browse the counselor directory
  } else {
    return res.status(403).json({ message: "Forbidden" });
  }

  let sql = `SELECT ${SELECT_FIELDS} FROM users`;
  const params = [];
  const where = [];
  if (role) {
    where.push("role = ?");
    params.push(role);
  }
  if (scopeToRepCollege) {
    if (!requesterCollege) {
      // Rep with no college assigned should see no students.
      return res.json([]);
    }
    where.push("college = ?");
    params.push(requesterCollege);
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY name ASC";
  const rows = await query(sql, params);
  return res.json(rows);
};

export const adminCreateUser = async (req, res) => {
  const { name, email, password, role, college, department } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  if (!["counselor", "college_rep", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role for admin creation" });
  }

  const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length) return res.status(409).json({ message: "Email already in use" });

  const hashed = await bcrypt.hash(password, 10);
  const result = await query(
    "INSERT INTO users (name, email, password, role, status, college, department) VALUES (?, ?, ?, ?, 'approved', ?, ?)",
    [name, email, hashed, role, college || null, department || null]
  );
  await logAction(req, "create_user", "user", result.insertId, { name, email, role, college: college || null, department: department || null });
  const rows = await query(`SELECT ${SELECT_FIELDS} FROM users WHERE id = ?`, [result.insertId]);
  return res.status(201).json(rows[0]);
};

export const adminUpdateUser = async (req, res) => {
  const { id } = req.params;
  const built = buildUpdate(ADMIN_UPDATABLE, req.body);
  if (built.error) return res.status(400).json({ message: built.error });
  if (!built.updates.length) return res.status(400).json({ message: "No valid fields to update" });

  if ("email" in req.body && req.body.email) {
    const dup = await query("SELECT id FROM users WHERE email = ? AND id <> ?", [req.body.email, id]);
    if (dup.length) return res.status(409).json({ message: "Email already in use" });
  }

  built.params.push(id);
  await query(
    `UPDATE users SET ${built.updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
    built.params
  );
  await logAction(req, "update_user", "user", id, { changedFields: Object.keys(req.body) });
  const rows = await query(`SELECT ${SELECT_FIELDS} FROM users WHERE id = ?`, [id]);
  if (!rows.length) return res.status(404).json({ message: "User not found" });
  return res.json(rows[0]);
};

export const adminDeleteUser = async (req, res) => {
  const { id } = req.params;
  if (Number(id) === Number(req.user.id)) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }

  const target = await query("SELECT id, name, email, role FROM users WHERE id = ?", [id]);
  if (!target.length) return res.status(404).json({ message: "User not found" });

  await logAction(req, "delete_user", "user", id, {
    name: target[0].name,
    email: target[0].email,
    role: target[0].role,
  });

  await query("DELETE FROM notifications WHERE user_id = ?", [id]);
  await query("DELETE FROM messages WHERE sender_id = ? OR recipient_id = ?", [id, id]);
  await query("DELETE FROM test_results WHERE student_id = ? OR counselor_id = ?", [id, id]);
  await query("DELETE FROM appointments WHERE student_id = ? OR counselor_id = ?", [id, id]);
  await query("DELETE FROM announcements WHERE admin_id = ?", [id]);
  await query("DELETE FROM users WHERE id = ?", [id]);
  return res.json({ message: "User deleted" });
};
