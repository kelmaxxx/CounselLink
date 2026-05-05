import { query } from "../config/db.js";

export const listConversations = async (req, res) => {
  const userId = req.user?.id;
  const rows = await query(
    `SELECT m.*,
            u.name AS senderName,
            v.name AS recipientName
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     JOIN users v ON m.recipient_id = v.id
     WHERE m.id IN (
       SELECT MAX(id)
       FROM messages
       WHERE sender_id = ? OR recipient_id = ?
       GROUP BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)
     )
     ORDER BY m.created_at DESC`,
    [userId, userId]
  );
  return res.json(rows);
};

export const listConversationMessages = async (req, res) => {
  const userId = req.user?.id;
  const { userId: otherUserId } = req.params;

  const rows = await query(
    `SELECT m.*,
            u.name AS senderName,
            v.name AS recipientName
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     JOIN users v ON m.recipient_id = v.id
     WHERE (m.sender_id = ? AND m.recipient_id = ?)
        OR (m.sender_id = ? AND m.recipient_id = ?)
     ORDER BY m.created_at ASC`,
    [userId, otherUserId, otherUserId, userId]
  );
  return res.json(rows);
};

export const sendMessage = async (req, res) => {
  const senderId = req.user?.id;
  const { recipientId, content } = req.body;

  if (!recipientId || !content?.trim()) {
    return res.status(400).json({ message: "Recipient and content are required" });
  }

  const result = await query(
    "INSERT INTO messages (sender_id, recipient_id, content, status) VALUES (?, ?, ?, 'unread')",
    [senderId, recipientId, content.trim()]
  );

  return res.status(201).json({
    message: "Message sent",
    id: result.insertId,
  });
};

export const markConversationRead = async (req, res) => {
  const userId = req.user?.id;
  const { userId: otherUserId } = req.params;

  await query(
    "UPDATE messages SET status='read' WHERE sender_id = ? AND recipient_id = ?",
    [otherUserId, userId]
  );

  return res.json({ message: "Conversation marked as read" });
};
