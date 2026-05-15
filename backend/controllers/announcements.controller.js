import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";

const ROLE_MAP = {
  all: null,
  students: "student",
  counselors: "counselor",
  reps: "college_rep",
  student: "student",
  counselor: "counselor",
  college_rep: "college_rep",
};

export const createAnnouncement = async (req, res) => {
  const { title, message, sendTo } = req.body;
  const adminId = req.user?.id;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  const targetRole = ROLE_MAP[sendTo ?? "all"];

  const result = await query(
    "INSERT INTO announcements (admin_id, content) VALUES (?, ?)",
    [adminId, `${title}\n\n${message}`]
  );

  const recipients = targetRole
    ? await query("SELECT id FROM users WHERE role = ? AND status = 'approved'", [targetRole])
    : await query("SELECT id FROM users WHERE status = 'approved' AND id <> ?", [adminId]);

  if (recipients.length) {
    const values = recipients.map(() => "(?, ?, ?, 'unread', ?)").join(", ");
    const params = recipients.flatMap((r) => [r.id, title, message, "/notifications"]);
    await query(
      `INSERT INTO notifications (user_id, title, message, status, link) VALUES ${values}`,
      params
    );
  }

  await logAction(req, "create_announcement", "announcement", result.insertId, {
    title,
    sendTo: sendTo ?? "all",
    recipientCount: recipients.length,
  });

  return res.status(201).json({
    message: "Announcement sent",
    id: result.insertId,
    recipientCount: recipients.length,
  });
};

export const listAnnouncements = async (_req, res) => {
  const rows = await query(
    `SELECT a.id, a.content, a.date_posted, u.name AS adminName
     FROM announcements a
     LEFT JOIN users u ON a.admin_id = u.id
     ORDER BY a.date_posted DESC`
  );
  return res.json(rows);
};
