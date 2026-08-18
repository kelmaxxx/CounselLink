import crypto from "crypto";
import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { isValidPhMobile } from "../utils/validators.js";
import { sendEmail } from "../services/email.service.js";

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
  student: ["name", "email", "phone", "bio", "college", "department", "program", "yearLevel", ...AVATAR_FIELDS, ...SIGNATURE_FIELDS],
  counselor: ["name", "email", "phone", "bio", "department", "specialization", "position", "employeeId", ...AVATAR_FIELDS, ...SIGNATURE_FIELDS],
  college_rep: ["name", "email", "phone", "employeeId", "college", ...AVATAR_FIELDS, ...SIGNATURE_FIELDS],
  admin: ["name", "email", "phone", "employeeId", ...AVATAR_FIELDS, ...SIGNATURE_FIELDS],
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

export const checkEmailExists = async (req, res) => {
  const { email } = req.query;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ message: "Email query parameter is required" });
  }

  const rows = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [String(email).trim()]);
  return res.json({ exists: rows.length > 0 });
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
  const { role, college } = req.query;
  const requesterRole = req.user?.role;
  const requesterCollege = req.user?.college || null;

  // College reps can only see students from their own college and the full counselor directory.
  let scopeToRepCollege = false;

  if (requesterRole === "admin") {
    // admin can list anything
  } else if (
    requesterRole === "counselor" &&
    ["student", "counselor", "college_rep", "admin"].includes(role)
  ) {
    // counselors can list students (session/appointment pickers),
    // other counselors (referral targets), college_rep (report recipients),
    // and admins (messaging)
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
  } else if (college) {
    where.push("college = ?");
    params.push(college);
  }

  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY name ASC";
  const rows = await query(sql, params);
  return res.json(rows);
};

async function createAndSendInvitation(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query("DELETE FROM account_invitations WHERE user_id = ?", [user.id]);
  await query(
    "INSERT INTO account_invitations (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [user.id, tokenHash, expiresAt]
  );

  const appUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const inviteLink = `${appUrl}/accept-invitation?token=${rawToken}`;

  const roleTitle = user.role === "counselor" ? "Counselor" : user.role === "college_rep" ? "College Representative" : "Staff";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">Welcome to CounselLink!</h2>
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>An account has been created for you as a <strong>${roleTitle}</strong> on CounselLink.</p>
      <p>Please click the button below to set up your password and activate your account. This link will expire in 7 days.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set Up Your Password</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If the button above does not work, copy and paste the following URL into your browser:</p>
      <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${inviteLink}</p>
    </div>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: "CounselLink Account Invitation - Set Your Password",
      html,
    });
  } catch (err) {
    console.error("Failed to send invitation email:", err);
  }
}

export const adminCreateUser = async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    name: nameProp,
    email,
    password,
    role,
    college,
    department,
    position,
    specialization,
    employeeId,
  } = req.body;

  if (!role || !["counselor", "college_rep", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role for admin creation" });
  }

  const isCounselorOrRep = ["counselor", "college_rep"].includes(role);

  let fName = String(firstName || "").trim();
  let mName = String(middleName || "").trim();
  let lName = String(lastName || "").trim();
  let fullName = "";

  if (isCounselorOrRep) {
    if (!fName || !mName || !lName || !email) {
      return res.status(400).json({ message: "First name, middle name, last name, and institutional email are required." });
    }
    fullName = `${fName} ${mName} ${lName}`;
  } else {
    fullName = String(nameProp || "").trim() || `${fName} ${mName} ${lName}`.trim();
    if (!fullName || !email) {
      return res.status(400).json({ message: "Missing required fields" });
    }
  }

  const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length) return res.status(409).json({ message: "Email already in use" });

  let hashed = "";
  let status = "approved";

  if (isCounselorOrRep) {
    const randomSecret = crypto.randomBytes(32).toString("hex");
    hashed = await bcrypt.hash(randomSecret, 10);
    status = "pending_setup";
  } else {
    if (!password) {
      return res.status(400).json({ message: "Password is required for admin account creation" });
    }
    hashed = await bcrypt.hash(password, 10);
  }

  const isCounselor = role === "counselor";
  const result = await query(
    `INSERT INTO users (name, first_name, middle_name, last_name, email, password, role, status, college, department, position, specialization, employee_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fullName,
      fName || null,
      mName || null,
      lName || null,
      email,
      hashed,
      role,
      status,
      isCounselor ? null : college || null,
      isCounselor ? null : department || null,
      isCounselor ? position || null : null,
      isCounselor ? specialization || null : null,
      isCounselor ? employeeId || null : null,
    ]
  );

  const userId = result.insertId;
  await logAction(req, "create_user", "user", userId, {
    name: fullName,
    email,
    role,
    college: college || null,
    department: department || null,
  });

  if (isCounselorOrRep) {
    await createAndSendInvitation({ id: userId, name: fullName, email, role });
  }

  const rows = await query(`SELECT ${SELECT_FIELDS} FROM users WHERE id = ?`, [userId]);
  return res.status(201).json(rows[0]);
};

export const resendInvitation = async (req, res) => {
  const { id } = req.params;
  const rows = await query("SELECT id, name, email, role, status FROM users WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ message: "User not found" });

  const user = rows[0];
  if (user.status !== "pending_setup") {
    return res.status(400).json({ message: "This user has already completed account setup." });
  }

  await createAndSendInvitation(user);
  await logAction(req, "resend_invitation", "user", id, { email: user.email, role: user.role });
  return res.json({ message: `Invitation setup email sent to ${user.email}.` });
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

export const banUser = async (req, res) => {
  const { id } = req.params;
  if (Number(id) === Number(req.user.id)) {
    return res.status(400).json({ message: "You cannot ban your own account" });
  }
  const target = await query("SELECT id, name, email, role FROM users WHERE id = ?", [id]);
  if (!target.length) return res.status(404).json({ message: "User not found" });
  if (target[0].role === "admin") {
    return res.status(400).json({ message: "Admin accounts cannot be banned" });
  }
  await query("UPDATE users SET status = 'banned' WHERE id = ?", [id]);
  await logAction(req, "ban_user", "user", id, {
    name: target[0].name,
    email: target[0].email,
    role: target[0].role,
  });
  const rows = await query(`SELECT ${SELECT_FIELDS} FROM users WHERE id = ?`, [id]);
  return res.json(rows[0]);
};

export const unbanUser = async (req, res) => {
  const { id } = req.params;
  const target = await query("SELECT id, name, email, role FROM users WHERE id = ?", [id]);
  if (!target.length) return res.status(404).json({ message: "User not found" });
  await query("UPDATE users SET status = 'approved' WHERE id = ?", [id]);
  await logAction(req, "unban_user", "user", id, {
    name: target[0].name,
    email: target[0].email,
    role: target[0].role,
  });
  const rows = await query(`SELECT ${SELECT_FIELDS} FROM users WHERE id = ?`, [id]);
  return res.json(rows[0]);
};
