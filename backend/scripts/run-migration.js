// Applies a single migration file from backend/migrations against the database
// that backend/.env points at. Usage:
//   node scripts/run-migration.js 013_report_request_types.sql
//
// Unlike db:setup (which applies the full schema.sql for fresh databases), this
// replays one incremental migration against an EXISTING database. Uses
// multipleStatements because migrations may contain PREPARE/EXECUTE guards.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.js <migration-file.sql>");
  process.exit(1);
}

const ssl =
  process.env.DB_SSL === "true"
    ? process.env.DB_CA_PATH
      ? { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true }
      : { rejectUnauthorized: false }
    : undefined;

const run = async () => {
  const filePath = path.join(backendRoot, "migrations", file);
  const sql = fs.readFileSync(filePath, "utf8").trim();
  if (!sql) {
    console.log("Migration file is empty; nothing to do.");
    return;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 3306),
    ...(ssl ? { ssl } : {}),
    multipleStatements: true,
  });

  try {
    process.stdout.write(`Applying ${file}... `);
    await connection.query(sql);
    console.log("done");
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error("\nMigration failed:", err.message);
  process.exit(1);
});
