// 1. Trims pending counseling appointments down to exactly 50 (deletes oldest excess).
// 2. Seeds 20 follow-up counseling sessions (approved, reason = "Follow-up Session").
// 3. Seeds 20 referral appointments spread across different college reps.
//
//   Run:  node scripts/trim-and-seed-sessions.js

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

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmtDate(d);
};

const SLOTS = [
  "morning", "afternoon",
  "9:00-10:00", "10:00-11:00", "11:00-12:00",
  "1:00-2:00", "2:00-3:00", "3:00-4:00",
];

const getQueueSlot = (slot) => {
  const s = (slot || "").toLowerCase();
  if (s === "afternoon" || s.startsWith("1:") || s.startsWith("2:") || s.startsWith("3:"))
    return "PM";
  return "AM";
};

const pick = (arr, i) => arr[Math.abs(i) % arr.length];

const CONCERNS = [
  "Academic stress and difficulty keeping up with course requirements.",
  "Persistent anxiety affecting sleep and class attendance.",
  "Family conflict at home creating emotional strain.",
  "Uncertainty about career direction and choice of program.",
  "Relationship difficulties impacting concentration on studies.",
  "Adjustment difficulties as a first-year transitioning to campus life.",
  "Financial stress affecting focus and overall wellbeing.",
  "Low self-esteem and negative self-talk.",
  "Grief following the loss of a close family member.",
  "Poor time management leading to missed deadlines.",
];

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
    // ── 1. Trim pending to 50 ────────────────────────────────────────────────
    const [pending] = await connection.query(
      `SELECT id FROM appointments
       WHERE status = 'pending' AND appointment_type = 'counseling'
       ORDER BY created_at ASC`
    );

    const excess = pending.length - 50;
    if (excess > 0) {
      const toDelete = pending.slice(0, excess).map((r) => r.id);
      await connection.query(
        `DELETE FROM appointments WHERE id IN (?)`,
        [toDelete]
      );
      console.log(`Deleted ${toDelete.length} pending appointments. ${pending.length - toDelete.length} remain.`);
    } else {
      console.log(`Pending count is already ${pending.length} (≤ 50), nothing deleted.`);
    }

    // Shared helpers
    const [counselors] = await connection.query(
      "SELECT id, name FROM users WHERE role = 'counselor' AND status = 'approved' ORDER BY id"
    );
    if (!counselors.length) {
      console.log("No approved counselors found — aborting.");
      return;
    }

    const [students] = await connection.query(
      `SELECT id, name, college FROM users
       WHERE role = 'student' AND status = 'approved'
       ORDER BY RAND() LIMIT 60`
    );
    if (!students.length) {
      console.log("No approved students — aborting.");
      return;
    }

    // Track queue numbers so we don't exceed 10 per slot per day
    const qCounters = {};
    const nextQueue = async (date, slot) => {
      const key = `${date}|${slot}`;
      if (!(key in qCounters)) {
        const [rows] = await connection.query(
          `SELECT COUNT(*) AS cnt FROM appointments
           WHERE queue_date = ? AND queue_slot = ? AND queue_number IS NOT NULL
             AND appointment_type = 'counseling'`,
          [date, slot]
        );
        qCounters[key] = Number(rows[0].cnt);
      }
      if (qCounters[key] >= 10) return null;
      return ++qCounters[key];
    };

    // ── 2. Seed 20 follow-up sessions ────────────────────────────────────────
    console.log("\nSeeding 20 follow-up sessions…");
    for (let i = 0; i < 20; i++) {
      const student = pick(students, i * 3);
      const counselor = pick(counselors, i);
      const slot = pick(SLOTS, i);
      const qSlot = getQueueSlot(slot);
      const schedDate = daysFromNow(1 + (i % 18));
      const qNum = await nextQueue(schedDate, qSlot);

      await connection.query(
        `INSERT INTO appointments
           (student_id, counselor_id, appointment_type, status, reason,
            preferred_date, preferred_slots,
            scheduled_date, scheduled_time,
            queue_date, queue_slot, queue_number,
            phone_number, is_urgent, created_at)
         VALUES (?, ?, 'counseling', 'approved', 'Follow-up Session',
                 ?, ?, ?, ?, ?, ?, ?, '09000000000', 0, NOW())`,
        [
          student.id,
          counselor.id,
          schedDate,
          slot,
          schedDate,
          slot,
          schedDate,
          qSlot,
          qNum,
        ]
      );
      console.log(`  follow-up ${i + 1}: ${student.name} → ${schedDate} ${slot}`);
    }

    // ── 3. Seed 20 referral appointments from different colleges ─────────────
    console.log("\nSeeding 20 referral appointments…");

    const [reps] = await connection.query(
      "SELECT id, name, college FROM users WHERE role = 'college_rep' AND status = 'approved' ORDER BY id"
    );
    if (!reps.length) {
      console.log("No college_rep accounts — skipping referrals.");
      return;
    }

    // Distribute 20 referrals as evenly as possible across available reps/colleges
    const perRep = Math.ceil(20 / reps.length);
    let refCount = 0;

    for (let ri = 0; ri < reps.length && refCount < 20; ri++) {
      const rep = reps[ri];
      // Prefer students from the rep's college, fall back to any student
      const pool = students.filter((s) => s.college === rep.college);
      const pickFrom = pool.length ? pool : students;

      for (let j = 0; j < perRep && refCount < 20; j++) {
        const student = pick(pickFrom, ri * 17 + j);
        const counselor = pick(counselors, ri + j);
        const concern = pick(CONCERNS, ri + j);
        const slot = pick(SLOTS, ri + j);
        const qSlot = getQueueSlot(slot);
        const schedDate = daysFromNow(2 + (refCount % 16));
        const qNum = await nextQueue(schedDate, qSlot);

        // Alternate: ~60% accepted (with appointment), ~40% pending
        const isAccepted = refCount % 5 !== 0;

        const [refRes] = await connection.query(
          `INSERT INTO referrals
             (student_id, referrer_id, receiving_counselor_id, reason, notes,
              status, decision_note, decided_at, created_at)
           VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NOW())`,
          [
            student.id,
            rep.id,
            isAccepted ? counselor.id : null,
            concern,
            isAccepted ? "accepted" : "pending",
            isAccepted ? "Accepted — session scheduled." : null,
            isAccepted
              ? new Date().toISOString().slice(0, 19).replace("T", " ")
              : null,
          ]
        );

        if (isAccepted) {
          await connection.query(
            `INSERT INTO appointments
               (student_id, counselor_id, referral_id, appointment_type, status, reason,
                preferred_date, preferred_slots,
                scheduled_date, scheduled_time,
                queue_date, queue_slot, queue_number,
                phone_number, is_urgent, created_at)
             VALUES (?, ?, ?, 'counseling', 'approved', ?, ?, ?, ?, ?, ?, ?, ?, '09000000000', 0, NOW())`,
            [
              student.id,
              counselor.id,
              refRes.insertId,
              concern,
              schedDate,
              slot,
              schedDate,
              slot,
              schedDate,
              qSlot,
              qNum,
            ]
          );
        }

        refCount++;
        console.log(
          `  referral ${refCount}: ${student.name} from ${rep.college} (${isAccepted ? "accepted → appt created" : "pending"})`
        );
      }
    }

    console.log(`\nDone. Created 20 follow-up sessions and ${refCount} referrals.`);
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
