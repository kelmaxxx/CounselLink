// Migration 049: track which announcements have already been emailed, so the
// scheduled-announcement sweep sends each one exactly once.

const hasColumn = async (connection, table, column) => {
  const [rows] = await connection.query(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1",
    [table, column]
  );
  return rows.length > 0;
};

export const up = async (connection) => {
  if (!(await hasColumn(connection, "announcements", "emailed_at"))) {
    await connection.query(
      "ALTER TABLE announcements ADD COLUMN emailed_at TIMESTAMP NULL AFTER send_to"
    );
  }
};
