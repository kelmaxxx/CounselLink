import { query } from "../config/db.js";
import { sendEmail } from "../services/email.service.js";

const buildApprovalEmail = ({ name }) => ({
  subject: "CounselLink: Registration Approved",
  text: `Hi ${name},\n\nYour CounselLink student account has been approved. You may now log in using your MSU email and password.\n\nIf you did not request this, please contact the DSA office.`,
  html: `<p>Hi ${name},</p><p>Your CounselLink student account has been approved. You may now log in using your MSU email and password.</p><p>If you did not request this, please contact the DSA office.</p>`,
});

const buildRejectionEmail = ({ name, reason }) => ({
  subject: "CounselLink: Registration Update",
  text: `Hi ${name},\n\nYour CounselLink student registration was not approved. Reason: ${reason || "Not specified"}.\n\nYou may contact the DSA office if you need assistance.`,
  html: `<p>Hi ${name},</p><p>Your CounselLink student registration was not approved.</p><p><strong>Reason:</strong> ${reason || "Not specified"}</p><p>You may contact the DSA office if you need assistance.</p>`,
});

export const pendingRegistrations = async (_req, res) => {
  const rows = await query(
    "SELECT id, name, email, student_id AS studentId, college, status, cor_url AS corUrl, cor_file_name AS corFileName, cor_file_type AS corFileType FROM users WHERE role='student' AND status='pending_approval'"
  );
  return res.json(rows);
};

export const approveRegistration = async (req, res) => {
  const { id } = req.params;
  const { program, yearLevel } = req.body;

  const rows = await query("SELECT id, name, email FROM users WHERE id = ?", [id]);
  if (!rows.length) {
    return res.status(404).json({ message: "User not found" });
  }

  await query(
    "UPDATE users SET status='approved', program=?, year_level=?, updated_at=NOW() WHERE id = ?",
    [program || null, yearLevel || null, id]
  );

  try {
    const email = buildApprovalEmail({ name: rows[0].name });
    await sendEmail({ to: rows[0].email, subject: email.subject, text: email.text, html: email.html });
  } catch (error) {
    console.error("Approval email failed", error);
  }

  return res.json({ message: "Approved" });
};

export const rejectRegistration = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const rows = await query("SELECT id, name, email FROM users WHERE id = ?", [id]);
  if (!rows.length) {
    return res.status(404).json({ message: "User not found" });
  }

  await query(
    "UPDATE users SET status='rejected', rejection_reason=?, updated_at=NOW() WHERE id = ?",
    [reason || null, id]
  );

  try {
    const email = buildRejectionEmail({ name: rows[0].name, reason });
    await sendEmail({ to: rows[0].email, subject: email.subject, text: email.text, html: email.html });
  } catch (error) {
    console.error("Rejection email failed", error);
  }

  return res.json({ message: "Rejected" });
};
