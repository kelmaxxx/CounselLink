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

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    ...(ssl ? { ssl } : {}),
  });

  const emailToDelete = "lalalonto19@gmail.com";
  console.log(`Searching for user with email: ${emailToDelete}...`);

  const [users] = await conn.query("SELECT id, name, email, role, status FROM users WHERE email = ?", [emailToDelete]);

  if (users.length === 0) {
    console.log("No user found with that email.");
  } else {
    for (const u of users) {
      console.log(`Found user ID ${u.id}: ${u.name} (${u.role}, ${u.status}). Deleting related invitations and user...`);
      await conn.query("DELETE FROM account_invitations WHERE user_id = ?", [u.id]);
      await conn.query("DELETE FROM users WHERE id = ?", [u.id]);
      console.log(`User ID ${u.id} deleted successfully!`);
    }
  }

  await conn.end();
}

run().catch(console.error);
