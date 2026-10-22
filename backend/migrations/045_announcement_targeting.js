// Migration 045: Announcement targeting + notification links.
// - announcements.send_to records the chosen audience so the public landing
//   page can show only "all users" announcements.
// - notifications.announcement_id links broadcast notifications to their
//   announcement so deleting/expiring it also hides the bell item.
// Idempotent because announcement_id already exists on some databases.

const hasColumn = async (connection, table, column) => {
  const [rows] = await connection.query(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1",
    [table, column]
  );
  return rows.length > 0;
};

const hasIndex = async (connection, table, index) => {
  const [rows] = await connection.query(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
    [table, index]
  );
  return rows.length > 0;
};

export const up = async (connection) => {
  if (!(await hasColumn(connection, "announcements", "send_to"))) {
    await connection.query(
      "ALTER TABLE announcements ADD COLUMN send_to VARCHAR(20) NOT NULL DEFAULT 'all' AFTER remove_at"
    );
  }

  if (!(await hasColumn(connection, "notifications", "announcement_id"))) {
    await connection.query(
      "ALTER TABLE notifications ADD COLUMN announcement_id INT NULL AFTER type"
    );
  }
  if (!(await hasIndex(connection, "notifications", "idx_notifications_announcement"))) {
    await connection.query(
      "ALTER TABLE notifications ADD INDEX idx_notifications_announcement (announcement_id)"
    );
  }

  // Link existing announcement notifications to their announcement so expiry
  // and deletion hide them from the bell.
  await connection.query(`
    UPDATE notifications n
    JOIN announcements a ON a.content LIKE CONCAT(n.title, CHAR(10), '%')
    SET n.announcement_id = a.id
    WHERE n.link = '/notifications' AND n.announcement_id IS NULL
  `);

  // One-time cleanup: bell items whose announcement was already deleted.
  await connection.query(`
    DELETE n FROM notifications n
    WHERE n.link = '/notifications' AND n.announcement_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM announcements a
        WHERE a.content LIKE CONCAT(n.title, CHAR(10), '%')
      )
  `);
};
