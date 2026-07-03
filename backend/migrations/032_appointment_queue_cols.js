export const up = async (connection) => {
  const cols = [
    { name: "queue_number", ddl: "ALTER TABLE appointments ADD COLUMN queue_number INT NULL" },
    { name: "queue_slot",   ddl: "ALTER TABLE appointments ADD COLUMN queue_slot ENUM('AM','PM') NULL" },
    { name: "queue_date",   ddl: "ALTER TABLE appointments ADD COLUMN queue_date DATE NULL" },
  ];

  for (const { name, ddl } of cols) {
    const [[{ cnt }]] = await connection.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = ?`,
      [name]
    );
    if (cnt === 0) await connection.query(ddl);
  }
};
