import { query } from "../config/db.js";
import { notifyUser } from "../events.js";

// Insert an in-app notification AND push a live "notification" signal to the
// recipient so their bell/list refreshes without a page reload. Use this
// instead of writing the INSERT inline so every notification stays real-time.
export const createNotification = async ({ userId, title, message, link }) => {
  await query(
    "INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)",
    [userId, title, message, link]
  );
  notifyUser(userId, { type: "notification" });
};
