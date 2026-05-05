import { query } from "../config/db.js";

export const listNotifications = async (req, res) => {
  const userId = req.user?.id;
  const rows = await query(
    "SELECT id, title, message, status, link, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
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
