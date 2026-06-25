import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import { withRetries, describeDbConfig } from "../utils/dbRetry.js";

dotenv.config();

// Hosted MySQL (Aiven, Railway, etc.) requires TLS. Enable with DB_SSL=true.
// If DB_CA_PATH points to the provider's CA cert, the connection is fully
// verified; otherwise we fall back to an encrypted-but-unverified connection,
// which is acceptable for a shared test DB. Leave DB_SSL unset for local MySQL.
const ssl =
  process.env.DB_SSL === "true"
    ? process.env.DB_CA_PATH && fs.existsSync(process.env.DB_CA_PATH)
      ? { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true }
      : { rejectUnauthorized: false }
    : undefined;

// A stray DB_CA_PATH pointing at a missing file would otherwise silently drop
// to unverified TLS; warn so it isn't mistaken for a fully verified connection.
if (process.env.DB_SSL === "true" && process.env.DB_CA_PATH && !fs.existsSync(process.env.DB_CA_PATH)) {
  console.warn(
    `DB_CA_PATH is set to "${process.env.DB_CA_PATH}" but no file exists there; ` +
      "falling back to encrypted-but-unverified TLS."
  );
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  ...(ssl ? { ssl } : {}),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

// Run multiple writes atomically. The callback receives a query function
// bound to a single pooled connection; throwing from it rolls back.
export const withTransaction = async (fn) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const txQuery = async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params);
      return rows;
    };
    const result = await fn(txQuery);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Used once at server boot. Hosted MySQL (Aiven) connections intermittently
// hit ETIMEDOUT/ENOTFOUND even when the host is reachable moments later, so
// a single failed attempt here shouldn't stop the server from starting.
export const testConnection = async () => {
  console.log("Connecting with:", describeDbConfig(process.env));
  await withRetries(() => pool.query("SELECT 1"), {
    onAttemptFailed: (err, attempt, attempts) =>
      console.warn(`DB connection attempt ${attempt}/${attempts} failed (${err.code || err.message}), retrying...`),
  });
};

export default pool;
