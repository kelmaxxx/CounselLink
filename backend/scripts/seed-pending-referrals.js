// Inserts fresh pending referrals (null counselor) from each college rep
// so all counselors can see incoming referrals in their dashboard/referrals tab.
//
//   Run:  node scripts/seed-pending-referrals.js

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

const CONCERNS = [
  "Academic Concern\n\nStudent is struggling with course requirements and at risk of failing.",
  "Mental Health Concern\n\nStudent has shown signs of persistent anxiety and withdrawal from peers.",
  "Family Problem\n\nStudent disclosed ongoing conflict at home affecting focus and attendance.",
  "Behavioral Concern\n\nStudent has been disruptive in class and unresponsive to faculty intervention.",
  "Social/Relationship Concern\n\nStudent is experiencing difficulty with peer relationships and social isolation.",
  "Academic Concern\n\nSignificant drop in academic performance observed over the past semester.",
  "Mental Health Concern\n\nStudent expressed feelings of hopelessness and low motivation.",
  "Family Problem\n\nStudent is under financial strain due to family situation.",
];

const pick = (arr, i) => arr[Math.abs(i) % arr.length];

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    ...(ssl ? { ssl } : {}),
  });

  try {
    const [reps] = await connection.query(
      "SELECT id, name, college FROM users WHERE role = 'college_rep' AND status = 'approved' ORDER BY id"
    );
    if (!reps.length) { console.log("No college_rep accounts found."); return; }

    const [students] = await connection.query(
      `SELECT u.id, u.name, u.college FROM users u
       WHERE u.role = 'student' AND u.status = 'approved'
       ORDER BY RAND() LIMIT 50`
    );
    if (!students.length) { console.log("No students found."); return; }

    let count = 0;
    for (let i = 0; i < reps.length; i++) {
      const rep = reps[i];
      const pool = students.filter((s) => s.college === rep.college);
      const pickFrom = pool.length ? pool : students;

      // 2 pending referrals per rep (one per concern type)
      for (let j = 0; j < 2; j++) {
        const student = pick(pickFrom, i * 7 + j);
        const concern = pick(CONCERNS, i + j);
        const dept = ["BS Computer Science", "BS Engineering", "BS Education", "BS Nursing", "BS Agriculture"][pick([0,1,2,3,4], i+j)];

        await connection.query(
          `INSERT INTO referrals
             (student_id, referrer_id, receiving_counselor_id, reason, notes,
              status, student_department, created_at)
           VALUES (?, ?, NULL, ?, NULL, 'pending', ?, NOW())`,
          [student.id, rep.id, concern, dept]
        );
        count++;
        console.log(`  referral ${count}: ${student.name} from ${rep.college} (pending, broadcast)`);
      }
    }

    console.log(`\nDone. Inserted ${count} pending broadcast referrals.`);
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
