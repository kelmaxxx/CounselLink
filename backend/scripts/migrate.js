// Applies any backend/migrations/*.sql files that haven't been applied yet
// to the database backend/.env points at, tracking progress in a
// schema_migrations table. Wired into "npm run dev" and "npm start" so local
// and deployed databases can't drift out of sync with the code that depends
// on them.
//
// The first time this runs against ANY database (fresh or pre-existing), it
// creates the tracking table and baselines every migration file currently on
// disk as already applied — schema.sql/db:setup already fold in everything
// that exists at that point, and a pre-existing deployed DB is assumed to
// already reflect it too. Only migration files added AFTER that baseline get
// executed automatically.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { withRetries, describeDbConfig } from "../utils/dbRetry.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
const migrationsDir = path.join(backendRoot, "migrations");

const ssl =
  process.env.DB_SSL === "true"
    ? process.env.DB_CA_PATH
      ? { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true }
      : { rejectUnauthorized: false }
    : undefined;

const run = async () => {
  console.log("Connecting with:", describeDbConfig(process.env));
  const connection = await withRetries(
    () =>
      mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT || 3306),
        ...(ssl ? { ssl } : {}),
        connectTimeout: 20000,
        multipleStatements: true,
      }),
    {
      onAttemptFailed: (err, attempt, attempts) =>
        console.warn(`DB connection attempt ${attempt}/${attempts} failed (${err.code || err.message}), retrying...`),
    }
  );

  try {
    const [tables] = await connection.query("SHOW TABLES LIKE 'schema_migrations'");
    const tableExisted = tables.length > 0;

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql") || f.endsWith(".js"))
      .sort();

    if (!tableExisted) {
      if (files.length > 0) {
        await connection.query("INSERT INTO schema_migrations (filename) VALUES ?", [
          files.map((f) => [f]),
        ]);
        console.log(`Baselined ${files.length} existing migration(s) as already applied.`);
      }
      return;
    }

    const [appliedRows] = await connection.query("SELECT filename FROM schema_migrations");
    const applied = new Set(appliedRows.map((r) => r.filename));
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    for (const file of pending) {
      process.stdout.write(`Applying ${file}... `);
      if (file.endsWith(".js")) {
        const { up } = await import(pathToFileURL(path.join(migrationsDir, file)).href);
        await up(connection);
      } else {
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8").trim();
        if (sql) await connection.query(sql);
      }
      await connection.query("INSERT INTO schema_migrations (filename) VALUES (?)", [file]);
      console.log("done");
    }
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error("\nMigration failed:");
  console.error(err);
  process.exit(1);
});