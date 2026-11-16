// Seeds a small, safe-to-delete demo set for ONE counselor's Appointments page:
// pending requests (upcoming + overdue), counseling sessions, and psychological
// tests. Rows are attached to real approved student accounts so the page shows
// recognizable names instead of demo users.
//
//   Run:    npm run seed:counselor-demo
//   Pick a counselor:  npm run seed:counselor-demo -- --counselor=someone@email
//   Wipe:   npm run seed:counselor-demo -- --clean [--counselor=...]
//
// Cleanup works without a visible "[DEMO]" label:
//   • appointments are tagged with outcome_marked_by = -1 (a field the UI never
//     reads, so nothing looks fake). Re-running clears them first.
//   • the single referral is matched by its exact demo reason text.
//
// The data also appears on those students' own appointment pages, so use a
// staging/development database.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const APPT_MARKER = -1; // sentinel in outcome_marked_by, invisible in the UI
const REFERRAL_REASON =
  "Referred by the college for initial counseling and academic support.";
const REFERRAL_NOTE = "Student is aware of the referral and available this week.";
const SLOTS = ["9:00-12:00", "1:00-5:00"];

const ssl =
  process.env.DB_SSL === "true"
    ? process.env.DB_CA_PATH
      ? { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true }
      : { rejectUnauthorized: false }
    : undefined;

const arg = (name) => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((a) => a.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmtDate(d);
};
const daysAgoAt = (n, time = "09:00:00") => `${addDays(-n)} ${time}`;
const queueSlot = (slot) => (slot.startsWith("1") || slot.startsWith("2") || slot.startsWith("3") || slot.startsWith("4") ? "PM" : "AM");

const run = async () => {
  const clean = process.argv.includes("--clean");
  const email = arg("counselor");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    ...(ssl ? { ssl } : {}),
  });

  try {
    const [counselors] = await connection.query(
      `SELECT id, name, email FROM users
       WHERE role = 'counselor' AND status = 'approved'
       ${email ? "AND email = ?" : ""}
       ORDER BY id ${email ? "" : "LIMIT 1"}`,
      email ? [email] : []
    );
    const counselor = counselors[0];
    if (!counselor) {
      console.log(
        email
          ? `No approved counselor with email "${email}".`
          : "No approved counselor accounts found."
      );
      return;
    }
    console.log(`Counselor: ${counselor.name} <${counselor.email}> (id ${counselor.id})`);

    // Always clear prior demo rows first so re-runs are idempotent.
    const [apptDel] = await connection.query(
      "DELETE FROM appointments WHERE outcome_marked_by = ?",
      [APPT_MARKER]
    );
    const [refDel] = await connection.query(
      "DELETE FROM referrals WHERE receiving_counselor_id = ? AND reason = ?",
      [counselor.id, REFERRAL_REASON]
    );
    console.log(`Removed ${apptDel.affectedRows} demo appointment(s), ${refDel.affectedRows} demo referral(s).`);

    if (clean) {
      console.log("--clean given: done (no new rows inserted).");
      return;
    }

    // Real approved students, preferring ones with college + department filled.
    // Filter out obvious test/placeholder names so the demo looks proper.
    const [studentRows] = await connection.query(
      `SELECT id, name, college, department, phone FROM users
       WHERE role = 'student' AND status = 'approved'
       ORDER BY (college IS NULL OR department IS NULL), id
       LIMIT 60`
    );
    const placeholderName = /(^|\s)(test|sample|demo|maheer|koko|blue|malakas)(\s|$)/i;
    const students = studentRows.filter((s) => !placeholderName.test(s.name));
    if (students.length < 11) {
      console.log(
        `Need at least 11 approved students to spread the demo rows; found ${students.length}.`
      );
      return;
    }

    const [reps] = await connection.query(
      "SELECT id, name, college FROM users WHERE role = 'college_rep' AND status = 'approved' ORDER BY id"
    );

    const insertAppointment = async ({
      student,
      type = "counseling",
      testType = null,
      status,
      counselorId,
      preferredDate,
      slot,
      scheduledDate = null,
      reason,
      urgent = 0,
      createdDaysAgo = 0,
      queueNumber = null,
    }) => {
      const [res] = await connection.query(
        `INSERT INTO appointments
           (student_id, counselor_id, appointment_type, test_type, preferred_date,
            preferred_slots, scheduled_date, scheduled_time, status, reason,
            phone_number, is_urgent, queue_date, queue_slot, queue_number,
            outcome_marked_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student.id,
          counselorId,
          type,
          testType,
          preferredDate,
          slot,
          scheduledDate,
          scheduledDate ? slot : null,
          status,
          reason,
          student.phone || "09000000000",
          urgent,
          scheduledDate,
          scheduledDate ? queueSlot(slot) : null,
          queueNumber,
          APPT_MARKER,
          daysAgoAt(createdDaysAgo),
        ]
      );
      return res.insertId;
    };

    await connection.beginTransaction();
    let n = 0;

    // ── Pending counseling: 2 upcoming + 1 overdue ─────────────────────────
    const pendingCounseling = [
      { student: students[0], date: addDays(3), slot: SLOTS[0], created: 2,
        reason: "Academic stress and difficulty keeping up with course requirements." },
      { student: students[1], date: addDays(5), slot: SLOTS[1], created: 1,
        reason: "Persistent anxiety affecting sleep and class attendance." },
      { student: students[2], date: addDays(-3), slot: SLOTS[0], created: 6,
        reason: "Family conflict at home creating emotional strain." },
    ];
    for (const p of pendingCounseling) {
      await insertAppointment({
        student: p.student,
        status: "pending",
        counselorId: null,
        preferredDate: p.date,
        slot: p.slot,
        reason: p.reason,
        createdDaysAgo: p.created,
      });
      n++;
    }

    // ── Pending psychological tests: 1 upcoming + 1 overdue ────────────────
    const pendingTests = [
      { student: students[3], date: addDays(4), slot: SLOTS[1], created: 2,
        test: "Beck Anxiety Inventory (BAI)" },
      { student: students[4], date: addDays(-2), slot: SLOTS[0], created: 5,
        test: "Sentence Completion Test (SCT)" },
    ];
    for (const p of pendingTests) {
      await insertAppointment({
        student: p.student,
        type: "psychological_test",
        testType: p.test,
        status: "pending",
        counselorId: null,
        preferredDate: p.date,
        slot: p.slot,
        reason: `Requesting ${p.test}.`,
        createdDaysAgo: p.created,
      });
      n++;
    }

    // ── Upcoming counseling sessions: approved, follow-up, rescheduled, urgent
    const sessions = [
      { student: students[5], status: "approved", date: addDays(2), slot: SLOTS[0],
        reason: "Career direction and program choice.", urgent: 0, queue: 1 },
      { student: students[6], status: "approved", date: addDays(5), slot: SLOTS[1],
        reason: "Follow-up Session", urgent: 0, queue: 2 },
      { student: students[7], status: "rescheduled", date: addDays(4), slot: SLOTS[0],
        reason: "Relationship difficulties impacting concentration on studies.", urgent: 0, queue: 3 },
      { student: students[8], status: "approved", date: addDays(2), slot: SLOTS[1],
        reason: "Urgent support after a recent distressing incident.", urgent: 1, queue: 1 },
    ];
    for (const s of sessions) {
      await insertAppointment({
        student: s.student,
        status: s.status,
        counselorId: counselor.id,
        preferredDate: s.date,
        slot: s.slot,
        scheduledDate: s.date,
        reason: s.reason,
        urgent: s.urgent,
        createdDaysAgo: 2,
        queueNumber: s.queue,
      });
      n++;
    }

    // ── Test sessions: 1 approved upcoming + 1 rescheduled (shows as Missed) ─
    const testSessions = [
      { student: students[9], status: "approved", date: addDays(3), slot: SLOTS[1],
        test: "Beck Depression Inventory (BDI-II)" },
      { student: students[10], status: "rescheduled", date: addDays(-4), slot: SLOTS[0],
        test: "Myers-Briggs Type Indicator (MBTI)" },
    ];
    for (const t of testSessions) {
      await insertAppointment({
        student: t.student,
        type: "psychological_test",
        testType: t.test,
        status: t.status,
        counselorId: counselor.id,
        preferredDate: t.date,
        slot: t.slot,
        scheduledDate: t.date,
        reason: `Requesting ${t.test}.`,
        createdDaysAgo: 3,
        queueNumber: 1,
      });
      n++;
    }

    // ── One pending college referral for this counselor ────────────────────
    const referralStudent =
      students.find((s) => s.college && reps.some((r) => r.college === s.college)) ||
      students.find((s) => s.college) ||
      students[0];
    const referrer =
      reps.find((r) => r.college === referralStudent.college) || reps[0] || null;
    if (referrer) {
      await connection.query(
        `INSERT INTO referrals
           (student_id, referrer_id, receiving_counselor_id, reason, notes, status,
            student_department, requested_date, requested_time, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        [
          referralStudent.id,
          referrer.id,
          counselor.id,
          REFERRAL_REASON,
          REFERRAL_NOTE,
          referralStudent.department,
          addDays(4),
          SLOTS[0],
          daysAgoAt(2, "10:00:00"),
        ]
      );
      n++;
    } else {
      console.log("No approved college_rep found — skipped the referral.");
    }

    await connection.commit();

    console.log(`\nInserted ${n} demo row(s) for ${counselor.name}:`);
    console.log("  pending: 3 counseling (2 upcoming, 1 overdue) + 2 tests (1 upcoming, 1 overdue) + 1 referral");
    console.log("  sessions: approved, follow-up, rescheduled, urgent");
    console.log("  tests: approved upcoming, rescheduled/missed");
    console.log(`\nWipe: npm run seed:counselor-demo -- --clean --counselor=${counselor.email}`);
  } catch (err) {
    await connection.rollback().catch(() => undefined);
    throw err;
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error("\nSeeding counselor demo data failed:", err.message);
  process.exit(1);
});
