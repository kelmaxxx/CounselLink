// Minimal, standalone connectivity probe — isolates the mysql2 connection
// step from migrate.js/db.js so DNS/SSL/auth/timeout failures can be told
// apart from migration logic. Prints the exact config used (password
// redacted) before attempting to connect.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const cfg = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL,
  caPath: process.env.DB_CA_PATH,
};

console.log("Resolved connection config:");
console.log({
  ...cfg,
  caPathResolved: cfg.caPath ? fs.existsSync(cfg.caPath) ? "exists" : "MISSING" : "(none)",
  password: process.env.DB_PASSWORD ? "set (" + process.env.DB_PASSWORD.length + " chars)" : "MISSING",
});

const ssl =
  cfg.ssl === "true"
    ? cfg.caPath && fs.existsSync(cfg.caPath)
      ? { ca: fs.readFileSync(cfg.caPath), rejectUnauthorized: true }
      : { rejectUnauthorized: false }
    : undefined;

const start = Date.now();
try {
  const connection = await mysql.createConnection({
    host: cfg.host,
    user: cfg.user,
    password: process.env.DB_PASSWORD,
    database: cfg.database,
    port: cfg.port,
    ...(ssl ? { ssl } : {}),
    connectTimeout: 20000,
  });
  console.log(`Connected in ${Date.now() - start}ms`);
  const [rows] = await connection.query("SELECT 1 AS ok");
  console.log("Query result:", rows);
  await connection.end();
  process.exit(0);
} catch (err) {
  console.error(`Connection failed after ${Date.now() - start}ms`);
  console.error(err.code, err.message);
  process.exit(1);
}
