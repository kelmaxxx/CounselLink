import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const ssl =
  process.env.DB_SSL === "true"
    ? process.env.DB_CA_PATH
      ? { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true }
      : { rejectUnauthorized: false }
    : undefined;

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  ...(ssl ? { ssl } : {}),
});

try {
  const [students] = await connection.query(
    "SELECT id FROM users WHERE email LIKE 'demo.%@msu.edu.ph'"
  );
  const demoIds = students.map((s) => s.id);

  if (!demoIds.length) {
    console.log("No demo students found.");
    process.exit(0);
  }

  const [preview] = await connection.query(
    "SELECT COUNT(*) AS cnt FROM appointments WHERE is_urgent = 1 AND student_id IN (?)",
    [demoIds]
  );
  console.log(`Found ${preview[0].cnt} urgent demo appointment(s) to delete.`);

  const [result] = await connection.query(
    "DELETE FROM appointments WHERE is_urgent = 1 AND student_id IN (?)",
    [demoIds]
  );
  console.log(`Deleted ${result.affectedRows} urgent demo appointment(s).`);
} finally {
  await connection.end();
}
