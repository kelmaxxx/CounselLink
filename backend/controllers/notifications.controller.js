import { query } from "../config/db.js";

export const listNotifications = async (req, res) => {
  const userId = req.user?.id;
  const rows = await query(
    `SELECT n.id, n.title, n.message, n.status, n.link, n.type, n.image_url AS imageUrl, n.created_at
     FROM notifications n
     LEFT JOIN announcements a ON a.id = n.announcement_id
     WHERE n.user_id = ?
       AND (
         n.announcement_id IS NULL
         OR (
           a.id IS NOT NULL
           AND (a.post_at IS NULL OR a.post_at <= NOW())
           AND (a.remove_at IS NULL OR a.remove_at > NOW())
         )
       )
     ORDER BY n.created_at DESC`,
    [userId]
  );
  return res.json(rows);
};

export const markNotificationRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  await query(
    "UPDATE notifications SET status='read' WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return res.json({ message: "Updated" });
};

export const markAllRead = async (req, res) => {
  const userId = req.user?.id;
  await query("UPDATE notifications SET status='read' WHERE user_id = ?", [userId]);
  return res.json({ message: "Updated" });
};
