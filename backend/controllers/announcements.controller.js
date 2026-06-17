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
  const { title, message, sendTo, imageUrl } = req.body;
  const adminId = req.user?.id;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  const targetRole = ROLE_MAP[sendTo ?? "all"];
  const pubmatUrl = imageUrl || null;

  const result = await query(
    "INSERT INTO announcements (admin_id, content, image_url) VALUES (?, ?, ?)",
    [adminId, `${title}\n\n${message}`, pubmatUrl]
  );

  const recipients = targetRole
    ? await query("SELECT id FROM users WHERE role = ? AND status = 'approved'", [targetRole])
    : await query("SELECT id FROM users WHERE status = 'approved' AND id <> ?", [adminId]);

  if (recipients.length) {
    const values = recipients.map(() => "(?, ?, ?, 'unread', ?, ?)").join(", ");
    const params = recipients.flatMap((r) => [r.id, title, message, "/notifications", pubmatUrl]);
    await query(
      `INSERT INTO notifications (user_id, title, message, status, link, image_url) VALUES ${values}`,
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
    `SELECT a.id, a.content, a.image_url AS imageUrl, a.date_posted, u.name AS adminName
     FROM announcements a
     LEFT JOIN users u ON a.admin_id = u.id
     ORDER BY a.date_posted DESC`
  );
  return res.json(rows);
};

export const updateAnnouncement = async (req, res) => {
  const { id } = req.params;
  const { title, message, imageUrl } = req.body;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  const existing = await query("SELECT id, image_url AS imageUrl FROM announcements WHERE id = ?", [id]);
  if (!existing.length) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  const pubmatUrl = imageUrl !== undefined ? (imageUrl || null) : existing[0].imageUrl;

  await query("UPDATE announcements SET content = ?, image_url = ? WHERE id = ?", [
    `${title}\n\n${message}`,
    pubmatUrl,
    id,
  ]);

  await logAction(req, "update_announcement", "announcement", id, { title });

  return res.json({ message: "Announcement updated", id: Number(id) });
};

export const deleteAnnouncement = async (req, res) => {
  const { id } = req.params;
  const existing = await query("SELECT id FROM announcements WHERE id = ?", [id]);
  if (!existing.length) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  await query("DELETE FROM announcements WHERE id = ?", [id]);
  await logAction(req, "delete_announcement", "announcement", id, {});

  return res.json({ message: "Announcement deleted", id: Number(id) });
};
