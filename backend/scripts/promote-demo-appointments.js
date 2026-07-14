// Promotes a portion of pending counseling appointments to approved / rescheduled /
// follow-up so the counselor dashboard has realistic session variety, while keeping
// at least 50 in pending. Also seeds referral appointments from college reps.
//
//   Run:  node scripts/promote-demo-appointments.js
//
// Safe to re-run: it only UPDATEs existing appointments and INSERTs new referrals;
// it does not delete anything.

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
  if (
    s === "afternoon" ||
    s.startsWith("1:") ||
    s.startsWith("2:") ||
    s.startsWith("3:")
  )
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
    // ── 1. Promote pending appointments ──────────────────────────────────────
    const [pending] = await connection.query(
      `SELECT id FROM appointments
       WHERE status = 'pending' AND appointment_type = 'counseling' AND is_urgent = 0
       ORDER BY created_at ASC`
    );

    console.log(`Found ${pending.length} pending non-urgent counseling appointments.`);

    const KEEP_PENDING = 50;
    const toPromote = pending.length > KEEP_PENDING
      ? pending.slice(0, pending.length - KEEP_PENDING)
      : [];

    console.log(
      `Promoting ${toPromote.length} (leaving ${Math.min(pending.length, KEEP_PENDING)} pending).`
    );

    const [counselors] = await connection.query(
      "SELECT id FROM users WHERE role = 'counselor' AND status = 'approved' ORDER BY id"
    );
    if (!counselors.length) {
      console.log("No approved counselors found — aborting.");
      return;
    }

    // Track queue numbers per date+slot so we don't exceed 10 per slot.
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

    let cntApproved = 0, cntRescheduled = 0, cntFollowUp = 0;

    for (let i = 0; i < toPromote.length; i++) {
      const { id } = toPromote[i];
      const counselor = pick(counselors, i);
      const slot = pick(SLOTS, i);
      const qSlot = getQueueSlot(slot);
      // Spread across the next 20 working days
      const schedDate = daysFromNow(1 + (i % 20));
      const qNum = await nextQueue(schedDate, qSlot);

      // Distribute: 40 % approved, 30 % rescheduled, 30 % follow-up
      const bucket = i % 10;
      let newStatus, overrideReason;

      if (bucket < 4) {
        newStatus = "approved";
        overrideReason = null;
        cntApproved++;
      } else if (bucket < 7) {
        newStatus = "rescheduled";
        overrideReason = null;
        cntRescheduled++;
      } else {
        newStatus = "approved";
        overrideReason = "Follow-up Session";
        cntFollowUp++;
      }

      if (overrideReason) {
        await connection.query(
          `UPDATE appointments
           SET status = ?, counselor_id = ?, scheduled_date = ?, scheduled_time = ?,
               queue_date = ?, queue_slot = ?, queue_number = ?, reason = ?
           WHERE id = ?`,
          [newStatus, counselor.id, schedDate, slot, schedDate, qSlot, qNum, overrideReason, id]
        );
      } else {
        await connection.query(
          `UPDATE appointments
           SET status = ?, counselor_id = ?, scheduled_date = ?, scheduled_time = ?,
               queue_date = ?, queue_slot = ?, queue_number = ?
           WHERE id = ?`,
          [newStatus, counselor.id, schedDate, slot, schedDate, qSlot, qNum, id]
        );
      }
    }

    console.log(
      `  → approved: ${cntApproved}  rescheduled: ${cntRescheduled}  follow-up: ${cntFollowUp}`
    );

    // ── 2. Seed referral appointments from college reps ──────────────────────
    const [reps] = await connection.query(
      "SELECT id, college FROM users WHERE role = 'college_rep' AND status = 'approved' ORDER BY id"
    );
    const [students] = await connection.query(
      `SELECT id, name, college FROM users
       WHERE role = 'student' AND status = 'approved'
       ORDER BY RAND() LIMIT 40`
    );

    if (!reps.length) {
      console.log("No college_rep accounts found — skipping referrals.");
      return;
    }
    if (!students.length) {
      console.log("No approved students found — skipping referrals.");
      return;
    }

    const REFERRAL_TARGET = 10;
    let refCount = 0;

    for (let ri = 0; ri < reps.length && refCount < REFERRAL_TARGET; ri++) {
      const rep = reps[ri];
      // Prefer students from the same college; fall back to any student.
      const pool = students.filter((s) => s.college === rep.college);
      const pickFrom = pool.length >= 2 ? pool : students;

      // Each rep creates 2–3 referrals
      const perRep = Math.ceil(REFERRAL_TARGET / reps.length);

      for (let j = 0; j < perRep && refCount < REFERRAL_TARGET; j++) {
        const student = pick(pickFrom, ri * 13 + j);
        const counselor = pick(counselors, ri + j);
        const concern = pick(CONCERNS, ri + j);
        const slot = pick(SLOTS, ri + j);
        const qSlot = getQueueSlot(slot);

        // Alternate between pending and accepted referrals
        const isAccepted = j % 2 !== 0;
        const schedDate = daysFromNow(2 + (j % 12));

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

        // Create the approved appointment for accepted referrals
        if (isAccepted) {
          const qNum = await nextQueue(schedDate, qSlot);
          await connection.query(
            `INSERT INTO appointments
               (student_id, counselor_id, referral_id, appointment_type, status, reason,
                scheduled_date, scheduled_time, queue_date, queue_slot, queue_number,
                is_urgent, created_at)
             VALUES (?, ?, ?, 'counseling', 'approved', ?, ?, ?, ?, ?, ?, 0, NOW())`,
            [
              student.id,
              counselor.id,
              refRes.insertId,
              concern,
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
          `  referral #${refCount}: ${student.name} (${isAccepted ? "accepted → appointment created" : "pending"})`
        );
      }
    }

    console.log(`\nCreated ${refCount} referrals.`);
    console.log("Done.");
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
