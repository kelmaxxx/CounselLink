import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { sendEmail } from "../services/email.service.js";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => (s ?? "").toString().replace(/[&<>"']/g, (c) => ESC_MAP[c]);

// Announcement emails are fire-and-forget: the broadcast is already saved and
// shown in-app, so a slow/down mail provider must not delay the response.
const emailRecipients = (recipients, title, message) => {
  const html = `<h2>${esc(title)}</h2><p>${esc(message).replace(/\n/g, "<br/>")}</p><p>Open CounselLink to view the full announcement.</p>`;
  const text = `${title}\n\n${message}\n\nOpen CounselLink to view the full announcement.`;
  (async () => {
    for (const r of recipients) {
      if (!r.email) continue;
      try {
        await sendEmail({ to: r.email, subject: title, html, text });
      } catch (err) {
        console.warn(`[announcement-email] Failed to email ${r.email}:`, err.message);
      }
    }
  })();
};

const ROLE_MAP = {
  all: null,
  students: "student",
  counselors: "counselor",
  reps: "college_rep",
  student: "student",
  counselor: "counselor",
  college_rep: "college_rep",
};

const parseDatetime = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
};

export const createAnnouncement = async (req, res) => {
  const { title, message, sendTo, imageUrl, postAt, removeAt } = req.body;
  const adminId = req.user?.id;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  const targetRole = ROLE_MAP[sendTo ?? "all"];
  const audience = sendTo ?? "all";
  const pubmatUrl = imageUrl || null;
  const dbPostAt = parseDatetime(postAt);
  const dbRemoveAt = parseDatetime(removeAt);

  const result = await query(
    "INSERT INTO announcements (admin_id, content, image_url, post_at, remove_at, send_to) VALUES (?, ?, ?, ?, ?, ?)",
    [adminId, `${title}\n\n${message}`, pubmatUrl, dbPostAt, dbRemoveAt, audience]
  );

  const recipients = targetRole
    ? await query("SELECT id, email FROM users WHERE role = ? AND status = 'approved'", [targetRole])
    : await query("SELECT id, email FROM users WHERE status = 'approved' AND id <> ?", [adminId]);

  if (recipients.length) {
    const values = recipients.map(() => "(?, ?, ?, 'unread', ?, ?, ?, COALESCE(?, NOW()))").join(", ");
    const params = recipients.flatMap((r) => [
      r.id,
      title,
      message,
      "/notifications",
      pubmatUrl,
      result.insertId,
      dbPostAt,
    ]);
    await query(
      `INSERT INTO notifications (user_id, title, message, status, link, image_url, announcement_id, created_at) VALUES ${values}`,
      params
    );
  }

  // Scheduled announcements are hidden until post_at, so emailing now would
  // arrive early. Keep them in-app only until a scheduler exists.
  // shortcut: scheduled announcements send no email, add a cron/sweep when needed.
  const isLive = !dbPostAt || new Date(dbPostAt.replace(" ", "T") + "Z") <= new Date();
  if (isLive) emailRecipients(recipients, title, message);

  await logAction(req, "create_announcement", "announcement", result.insertId, {
    title,
    sendTo: sendTo ?? "all",
    recipientCount: recipients.length,
    postAt: dbPostAt,
    removeAt: dbRemoveAt,
  });

  return res.status(201).json({
    message: "Announcement created",
    id: result.insertId,
    recipientCount: recipients.length,
  });
};

export const listAnnouncements = async (_req, res) => {
  const rows = await query(
    `SELECT a.id, a.content, a.image_url AS imageUrl, a.date_posted, a.post_at AS postAt, a.remove_at AS removeAt, a.send_to AS sendTo, u.name AS adminName
     FROM announcements a
     LEFT JOIN users u ON a.admin_id = u.id
     ORDER BY a.date_posted DESC`
  );
  return res.json(rows);
};

export const updateAnnouncement = async (req, res) => {
  const { id } = req.params;
  const { title, message, imageUrl, postAt, removeAt } = req.body;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  const existing = await query("SELECT id, image_url AS imageUrl, post_at AS postAt, remove_at AS removeAt FROM announcements WHERE id = ?", [id]);
  if (!existing.length) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  const pubmatUrl = imageUrl !== undefined ? (imageUrl || null) : existing[0].imageUrl;
  const dbPostAt = postAt !== undefined ? parseDatetime(postAt) : existing[0].postAt;
  const dbRemoveAt = removeAt !== undefined ? parseDatetime(removeAt) : existing[0].removeAt;

  await query("UPDATE announcements SET content = ?, image_url = ?, post_at = ?, remove_at = ? WHERE id = ?", [
    `${title}\n\n${message}`,
    pubmatUrl,
    dbPostAt,
    dbRemoveAt,
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

  await query("DELETE FROM notifications WHERE announcement_id = ?", [id]);
  await query("DELETE FROM announcements WHERE id = ?", [id]);
  await logAction(req, "delete_announcement", "announcement", id, {});

  return res.json({ message: "Announcement deleted", id: Number(id) });
};

export const listPublicAnnouncements = async (_req, res) => {
  try {
    const rows = await query(
      `SELECT a.id, a.content, a.image_url AS imageUrl, a.date_posted, a.post_at AS postAt, a.remove_at AS removeAt
       FROM announcements a
       WHERE a.image_url IS NOT NULL AND a.image_url != ''
         AND a.send_to = 'all'
         AND (a.post_at IS NULL OR a.post_at <= NOW())
         AND (a.remove_at IS NULL OR a.remove_at > NOW())
       ORDER BY a.date_posted DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error("listPublicAnnouncements error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

