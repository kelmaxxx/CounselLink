// Applies the consolidated schema.sql, then seed.sql, to the database that
// backend/.env points at (local or hosted). Run with `npm run db:setup`.
//
// schema.sql is the full current schema (every migration is already folded in),
// so a FRESH database only needs schema.sql + seed.sql. The migrations/ files are
// historical incremental upgrades for EXISTING older databases — replaying them on
// a fresh DB collides (e.g. "Duplicate column 'bio'"), so they are intentionally
// not run here.
//
// Uses a dedicated connection with multipleStatements enabled because schema.sql
// contains multiple statements (including a PREPARE/EXECUTE FK guard).
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");

const ssl =
  process.env.DB_SSL === "true"
    ? process.env.DB_CA_PATH
      ? { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true }
      : { rejectUnauthorized: false }
    : undefined;

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // schema.sql issues its own USE; omit database so CREATE DATABASE works too.
    port: Number(process.env.DB_PORT || 3306),
    ...(ssl ? { ssl } : {}),
    multipleStatements: true,
  });

  const exec = async (label, filePath) => {
    const sql = fs.readFileSync(filePath, "utf8").trim();
    if (!sql) return;
    process.stdout.write(`Applying ${label}... `);
    await connection.query(sql);
    console.log("done");
  };

  try {
    await exec("schema.sql", path.join(backendRoot, "schema.sql"));
    await exec("seed.sql", path.join(backendRoot, "seed.sql"));
    console.log("\nDatabase setup complete.");
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error("\nDatabase setup failed:", err.message);
  process.exit(1);
});
