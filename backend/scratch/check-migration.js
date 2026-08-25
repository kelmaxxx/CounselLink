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

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    ...(ssl ? { ssl } : {}),
  });

  console.log("Connected to DB. Checking columns of announcements...");
  const [cols] = await conn.query("SHOW COLUMNS FROM announcements");
  console.log("Columns:", cols.map(c => c.Field));

  const colNames = cols.map(c => c.Field);
  if (!colNames.includes("post_at")) {
    console.log("Adding post_at column...");
    await conn.query("ALTER TABLE announcements ADD COLUMN post_at DATETIME NULL AFTER date_posted");
  }
  if (!colNames.includes("remove_at")) {
    console.log("Adding remove_at column...");
    await conn.query("ALTER TABLE announcements ADD COLUMN remove_at DATETIME NULL AFTER post_at");
  }

  const [colsAfter] = await conn.query("SHOW COLUMNS FROM announcements");
  console.log("Updated Columns:", colsAfter.map(c => c.Field));

  await conn.end();
}

check().catch(console.error);
