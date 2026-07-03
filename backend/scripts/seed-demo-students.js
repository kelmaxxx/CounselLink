// Seeds throwaway DEMO students across every MSU college so the admin dashboard
// charts ("Students by college") have data to render. These are cosmetic/test
// accounts only — safe to delete any time.
//
//   Run:      npm run seed:demo-students     (from backend/)
//   Password: demo123   (same for every demo account)
//
// Every row is tagged by a recognizable email pattern so you can find and remove
// them later without touching real accounts:
//
//   Query:    SELECT id, name, email, college FROM users
//               WHERE email LIKE 'demo.%@msu.edu.ph' ORDER BY college;
//   Delete:   DELETE FROM users WHERE email LIKE 'demo.%@msu.edu.ph';
//   (or)      npm run seed:demo-students -- --clean   (removes them, inserts nothing)
//
// Re-running is safe: it clears prior demo students first, then re-inserts.
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MSU_COLLEGES } from "../../frontend/src/data/msuColleges.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMAIL_MARKER = "demo."; // demo.<code>.<n>@msu.edu.ph
const PASSWORD = "demo123";

// A varied count per college so the ranked bar chart shows a real distribution
// instead of every bar being equal. Codes not listed default to `fallback`.
const COUNTS = {
  CICS: 24, COE: 21, CBAA: 19, CHS: 16, CED: 15, CNSM: 13, CSSH: 12,
  CHTM: 11, COA: 9, CPA: 8, CFAS: 7, CFES: 6, COL: 5, COM: 5,
  CSPEAR: 4, KFCIAAS: 3,
};
const FALLBACK_COUNT = 5;

const FIRST_NAMES = [
  "Amina", "Omar", "Farah", "Yusuf", "Nadia", "Rashid", "Laila", "Kareem",
  "Sittie", "Abdul", "Jamila", "Hassan", "Norhata", "Ibrahim", "Sarah",
  "Mohammad", "Aisha", "Datu", "Bai", "Sultan", "Johaira", "Norodin",
];
const LAST_NAMES = [
  "Macatanong", "Dimaporo", "Alonto", "Mangondato", "Sarangani", "Balindong",
  "Pangandaman", "Lucman", "Adiong", "Sinsuat", "Ampatuan", "Macarambon",
  "Disomangcop", "Radiamoda", "Guro", "Marohombsar", "Basman", "Tomawis",
];
const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const ssl =
  process.env.DB_SSL === "true"
    ? process.env.DB_CA_PATH
      ? { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true }
      : { rejectUnauthorized: false }
    : undefined;

const pick = (arr, i) => arr[i % arr.length];

const run = async () => {
  const clean = process.argv.includes("--clean");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    ...(ssl ? { ssl } : {}),
  });

  try {
    const [del] = await connection.query(
      "DELETE FROM users WHERE email LIKE ?",
      [`${EMAIL_MARKER}%@msu.edu.ph`]
    );
    console.log(`Removed ${del.affectedRows} existing demo student(s).`);

    if (clean) {
      console.log("--clean given: done (no new demo students inserted).");
      return;
    }

    const hash = await bcrypt.hash(PASSWORD, 10);
    const rows = [];
    let n = 0;
    for (const college of MSU_COLLEGES) {
      const count = COUNTS[college.code] ?? FALLBACK_COUNT;
      const firstDept = college.departments?.[0];
      const program = firstDept?.programs?.[0] || null;
      const department = firstDept?.name || null;
      for (let i = 1; i <= count; i++) {
        n++;
        const name = `${pick(FIRST_NAMES, n)} ${pick(LAST_NAMES, n + 3)}`;
        rows.push([
          name,
          `${EMAIL_MARKER}${college.code.toLowerCase()}.${i}@msu.edu.ph`,
          hash,
          "student",
          "approved",
          college.code,
          `DEMO-${college.code}-${String(i).padStart(3, "0")}`,
          program,
          department,
          pick(YEAR_LEVELS, n),
        ]);
      }
    }

    await connection.query(
      `INSERT INTO users
         (name, email, password, role, status, college, student_id, program, department, year_level)
       VALUES ?`,
      [rows]
    );

    const collegeCount = MSU_COLLEGES.length;
    console.log(`Inserted ${rows.length} demo students across ${collegeCount} colleges.`);
    console.log(`Login with any generated email + password "${PASSWORD}".`);
    console.log(`\nQuery them:  SELECT college, COUNT(*) FROM users WHERE email LIKE '${EMAIL_MARKER}%@msu.edu.ph' GROUP BY college;`);
    console.log(`Delete them: DELETE FROM users WHERE email LIKE '${EMAIL_MARKER}%@msu.edu.ph';`);
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error("\nSeeding demo students failed:", err.message);
  process.exit(1);
});
