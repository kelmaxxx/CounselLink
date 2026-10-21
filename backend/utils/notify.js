import { query } from "../config/db.js";
import { notifyUser } from "../events.js";

// Insert an in-app notification AND push a live "notification" signal to the
// recipient so their bell/list refreshes without a page reload. Use this
// instead of writing the INSERT inline so every notification stays real-time.
export const createNotification = async ({ userId, title, message, link, type = "info", dedupeKey = null }) => {
  const result = await query(
    `INSERT INTO notifications (user_id, title, message, link, type, dedupe_key)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [userId, title, message, link, type, dedupeKey]
  );
  // A dedupe key that already exists means this exact event was already
  // announced; don't email again or push a redundant refresh.
  if (dedupeKey && result.affectedRows === 0) return false;
  notifyUser(userId, { type: "notification" });
  return true;
};

// Insert the same notification for many recipients in one round trip (e.g.
// alerting every counselor). Callers are responsible for pushing any
// real-time signal (e.g. notifyRole) since SSE delivery is per-connection.
export const notifyUsers = async (userIds, { title, message, link, type = "info" }) => {
  if (!userIds.length) return;
  const values = userIds.map(() => "(?, ?, ?, ?, ?)").join(", ");
  const params = userIds.flatMap((userId) => [userId, title, message, link, type]);
  await query(
    `INSERT INTO notifications (user_id, title, message, link, type) VALUES ${values}`,
    params
  );
};
