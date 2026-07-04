// Seeds throwaway DEMO counseling activity on top of the demo students created
// by seed-demo-students.js, so the counselor/admin/rep dashboards, Student
// Records, and report pages have realistic data to render. Everything here is
// cosmetic/test data only — safe to delete any time.
//
//   Prereq:   npm run seed:demo-students   (creates the demo.<code>.<n>@msu.edu.ph students)
//   Run:      npm run seed:demo-activity   (from backend/)
//   Wipe:     npm run seed:demo-activity -- --clean
//
// What it creates, all attached to the demo students so they clean up together:
//   • appointments        (counseling + psychological_test, mixed statuses)
//   • counseling_sessions  (finalized Session Reports -> Student Record entries)
//   • test_results         (released psychological test results)
//   • feedback             (student ratings/comments on completed sessions)
//   • referrals            (rep -> counselor referrals, mixed statuses)
//   • report_recipients    (Session Reports fanned out to a College Rep)
//
// How deletion works (used by --clean and by every re-run before re-inserting):
//   Rows in the first five tables are removed by demo student_id. report_recipients
//   has no student_id, so those rows are tagged with a "[DEMO] " title prefix and
//   removed by that marker:
//     DELETE FROM report_recipients WHERE title LIKE '[DEMO]%';
//
// IMPORTANT: run this script's --clean BEFORE seed-demo-students --clean, otherwise
// the demo students can't be deleted (these rows reference them via foreign keys).
//
// Re-running is safe: it clears prior demo activity first, then re-inserts.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const DEMO_STUDENT_EMAIL = "demo.%@msu.edu.ph"; // matches seed-demo-students.js
const REPORT_TITLE_MARKER = "[DEMO] "; // report_recipients cleanup marker

// ---- Content pools (index-picked for reproducible, varied output) -----------

const CONCERNS = [
  "Academic stress and difficulty keeping up with course requirements.",
  "Persistent anxiety affecting sleep and class attendance.",
  "Family conflict at home creating emotional strain.",
  "Uncertainty about career direction and choice of program.",
  "Relationship difficulties impacting concentration on studies.",
  "Grief following the loss of a close family member.",
  "Adjustment difficulties as a first-year transitioning to campus life.",
  "Financial stress affecting focus and overall wellbeing.",
  "Poor time management leading to missed deadlines.",
  "Low self-esteem and negative self-talk.",
];

const GOALS = [
  "Develop healthier study routines and manage academic workload.",
  "Learn coping strategies to reduce anxiety before assessments.",
  "Improve communication with family members.",
  "Clarify career interests and explore suitable pathways.",
  "Build resilience and a supportive peer network.",
  "Process grief in a healthy, supported way.",
  "Establish a realistic weekly schedule and stick to it.",
  "Strengthen self-worth through achievable goals.",
];

const SUMMARIES = [
  "Student was cooperative and engaged. We identified key stressors and reviewed current coping strategies.",
  "Explored the presenting concern in depth; student showed insight into contributing factors.",
  "Discussed recent events and their emotional impact. Student appeared more settled by the end of the session.",
  "Reviewed progress since the last meeting; noted improvement in mood and outlook.",
  "Session focused on practical problem-solving around the student's immediate concerns.",
];

const PLANS = [
  "Practice the breathing exercises discussed and journal daily. Follow-up in two weeks.",
  "Draft a weekly study plan and share it at the next session.",
  "Try one small step toward the goal before the next meeting.",
  "Continue monitoring mood; reach out sooner if things worsen.",
  "Connect with the peer-support group and report back next session.",
];

const COMMENTS = [
  "Student is motivated and receptive to support.",
  "Recommend continued follow-up over the coming weeks.",
  "No safety concerns identified at this time.",
  "Referral to be considered if concerns persist.",
  "",
];

const TESTS = [
  "16 Personality Factor Questionnaire (16PF)",
  "Myers-Briggs Type Indicator (MBTI)",
  "Beck Depression Inventory (BDI-II)",
  "Beck Anxiety Inventory (BAI)",
  "Sentence Completion Test (SCT)",
  "Raven's Standard Progressive Matrices",
  "Panukat ng Ugali at Pagkatao (PUP)",
  "Self-Directed Search (SDS)",
];

const TEST_SUMMARIES = [
  "Results fall within the average range. No areas of clinical concern were flagged.",
  "Profile suggests mild elevation in stress-related items; overall functioning intact.",
  "Responses indicate strong interpersonal orientation and adaptive coping.",
  "Scores are consistent with the student's self-report during intake.",
  "Cognitive results place the student in the above-average band for their cohort.",
];

const TEST_RECOMMENDATIONS = [
  "Discuss results with the student and revisit in a follow-up counseling session.",
  "No further testing required at this time; monitor as needed.",
  "Recommend a brief follow-up to review coping strategies.",
  "Encourage the student to explore the highlighted career interests.",
  "Share summary with the student and file in their record.",
];

const FEEDBACK_COMMENTS = [
  "Very helpful session, I felt listened to.",
  "My counselor was kind and understanding.",
  "The advice gave me a clear next step.",
  "I feel more confident after our talk.",
  "Great support, thank you.",
  "",
];

const REFERRAL_REASONS = [
  "Student may benefit from specialized counseling support.",
  "Referring for follow-up with an available counselor this term.",
  "Ongoing concerns warrant a dedicated counseling schedule.",
  "Requesting assessment and continued guidance for this student.",
];

const REFERRAL_NOTES = [
  "Student is aware of and agreeable to this referral.",
  "Please prioritize as schedule allows.",
  "Background details shared during intake are on file.",
  "",
];

const TIMES = ["08:00", "09:30", "10:00", "11:00", "13:00", "14:30", "15:00"];
const APPT_STATUSES = ["completed", "approved", "pending", "completed", "rescheduled"];

// ---- Helpers ----------------------------------------------------------------

const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmtDate(d);
};
const daysFromNow = (n) => daysAgo(-n);

const ssl =
  process.env.DB_SSL === "true"
    ? process.env.DB_CA_PATH
      ? { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true }
      : { rejectUnauthorized: false }
    : undefined;

const deleteDemoActivity = async (connection, demoIds) => {
  let removed = 0;
  if (demoIds.length) {
    // Order matters: test_results has a non-cascading FK to appointments, so it
    // must go before appointments. The rest reference students directly.
    for (const table of ["test_results", "feedback", "counseling_sessions", "appointments", "referrals"]) {
      const [res] = await connection.query(
        `DELETE FROM ${table} WHERE student_id IN (?)`,
        [demoIds]
      );
      removed += res.affectedRows;
    }
  }
  const [rep] = await connection.query(
    "DELETE FROM report_recipients WHERE title LIKE ?",
    [`${REPORT_TITLE_MARKER}%`]
  );
  removed += rep.affectedRows;
  return removed;
};

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
    const [students] = await connection.query(
      "SELECT id, name, college FROM users WHERE email LIKE ? ORDER BY id",
      [DEMO_STUDENT_EMAIL]
    );

    // Always clear prior demo activity first (makes re-runs idempotent).
    const removed = await deleteDemoActivity(
      connection,
      students.map((s) => s.id)
    );
    console.log(`Removed ${removed} existing demo activity row(s).`);

    if (clean) {
      console.log("--clean given: done (no new demo activity inserted).");
      return;
    }

    if (!students.length) {
      console.log(
        "\nNo demo students found. Run `npm run seed:demo-students` first, then re-run this."
      );
      return;
    }

    const [counselors] = await connection.query(
      "SELECT id, name FROM users WHERE role = 'counselor' ORDER BY id"
    );
    if (!counselors.length) {
      console.log(
        "\nNo counselor accounts exist, so sessions/tests/reports can't be created."
      );
      console.log("Create at least one counselor account, then re-run this script.");
      return;
    }

    const [reps] = await connection.query(
      "SELECT id, name, college FROM users WHERE role = 'college_rep' ORDER BY id"
    );
    const repByCollege = new Map();
    for (const r of reps) if (r.college && !repByCollege.has(r.college)) repByCollege.set(r.college, r);
    const repFor = (college) => repByCollege.get(college) || reps[0] || null;

    const counts = {
      appointments: 0,
      sessions: 0,
      tests: 0,
      feedback: 0,
      referrals: 0,
      reports: 0,
    };

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const counselor = pick(counselors, i);
      const status = pick(APPT_STATUSES, i);
      const isPast = status === "completed" || status === "approved" || status === "rescheduled";

      // --- 1. A counseling appointment for every demo student ----------------
      const apptDate = isPast ? daysAgo(90 - (i % 80)) : daysFromNow(3 + (i % 20));
      const time = pick(TIMES, i);
      const [apptRes] = await connection.query(
        `INSERT INTO appointments
           (student_id, counselor_id, appointment_type, preferred_date, preferred_time,
            scheduled_date, scheduled_time, status, reason, phone_number, is_urgent, created_at)
         VALUES (?, ?, 'counseling', ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          student.id,
          isPast || status === "rescheduled" ? counselor.id : null,
          apptDate,
          time,
          isPast ? apptDate : null,
          isPast ? time : null,
          status,
          pick(CONCERNS, i),
          `09${pad(i % 10)}${pad((i * 7) % 100)}${pad((i * 3) % 100)}`,
          `${apptDate} ${time}:00`,
        ]
      );
      counts.appointments++;
      const apptId = apptRes.insertId;

      // --- 2. Completed counseling -> finalized session (Student Record) -----
      if (status === "completed") {
        const sessionDate = apptDate;
        const nextSession = i % 5 === 0 ? "termination" : "followup";
        const [sesRes] = await connection.query(
          `INSERT INTO counseling_sessions
             (student_id, counselor_id, appointment_id, session_date, presenting_concern,
              goals, summary, plan, comments, next_session, counselor_signature, form_data,
              finalized_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
          [
            student.id,
            counselor.id,
            apptId,
            sessionDate,
            pick(CONCERNS, i),
            pick(GOALS, i),
            pick(SUMMARIES, i),
            pick(PLANS, i),
            pick(COMMENTS, i) || null,
            nextSession,
            counselor.name,
            `${sessionDate} ${time}:00`,
            `${sessionDate} ${time}:00`,
          ]
        );
        counts.sessions++;

        // --- 3. Feedback on ~half of completed sessions ---------------------
        if (i % 2 === 0) {
          await connection.query(
            `INSERT INTO feedback (student_id, counselor_id, appointment_id, rating, comment, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              student.id,
              counselor.id,
              apptId,
              3 + (i % 3), // 3..5
              pick(FEEDBACK_COMMENTS, i) || null,
              `${sessionDate} ${time}:00`,
            ]
          );
          counts.feedback++;
        }

        // --- 4. Fan out ~1 in 3 finalized sessions to a College Rep ---------
        const rep = repFor(student.college);
        if (rep && i % 3 === 0) {
          const payload = {
            sessionId: sesRes.insertId,
            sessionDate,
            studentName: student.name,
            studentCollege: student.college,
            counselorName: counselor.name,
            presentingConcern: pick(CONCERNS, i),
            goals: pick(GOALS, i),
            summary: pick(SUMMARIES, i),
            plan: pick(PLANS, i),
            comments: pick(COMMENTS, i) || null,
            nextSession,
            counselorSignature: counselor.name,
            formData: null,
          };
          await connection.query(
            `INSERT INTO report_recipients (sender_id, recipient_id, title, summary, report_payload, sent_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              counselor.id,
              rep.id,
              `${REPORT_TITLE_MARKER}Session Report — ${student.name} (${sessionDate})`,
              pick(SUMMARIES, i).slice(0, 160),
              JSON.stringify(payload),
              `${sessionDate} ${time}:00`,
            ]
          );
          counts.reports++;
        }
      }

      // --- 5. Every 3rd student also gets a psychological test --------------
      if (i % 3 === 1) {
        const testCompleted = i % 2 === 1;
        const testDate = testCompleted ? daysAgo(60 - (i % 50)) : daysFromNow(5 + (i % 15));
        const testType = pick(TESTS, i);
        const [testApptRes] = await connection.query(
          `INSERT INTO appointments
             (student_id, counselor_id, appointment_type, test_type, preferred_date, preferred_time,
              scheduled_date, scheduled_time, status, reason, is_urgent, created_at)
           VALUES (?, ?, 'psychological_test', ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [
            student.id,
            testCompleted ? counselor.id : null,
            testType,
            testDate,
            pick(TIMES, i + 1),
            testCompleted ? testDate : null,
            testCompleted ? pick(TIMES, i + 1) : null,
            testCompleted ? "completed" : "pending",
            `Requesting ${testType}.`,
            `${testDate} ${pick(TIMES, i + 1)}:00`,
          ]
        );
        counts.appointments++;

        if (testCompleted) {
          await connection.query(
            `INSERT INTO test_results
               (appointment_id, student_id, counselor_id, test_name, completed_date, summary, recommendations, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              testApptRes.insertId,
              student.id,
              counselor.id,
              testType,
              testDate,
              pick(TEST_SUMMARIES, i),
              pick(TEST_RECOMMENDATIONS, i),
              `${testDate} 12:00:00`,
            ]
          );
          counts.tests++;
        }
      }

      // --- 6. Every 4th student gets a rep -> counselor referral -----------
      const rep = repFor(student.college);
      if (rep && i % 4 === 2) {
        const receiving = pick(counselors, i + 1);
        const refStatus = pick(["pending", "accepted", "rejected", "rescheduled"], i);
        const decided = refStatus !== "pending";
        const decidedDate = daysAgo(30 - (i % 25));
        await connection.query(
          `INSERT INTO referrals
             (student_id, referrer_id, receiving_counselor_id, reason, notes, status, decision_note, decided_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            student.id,
            rep.id,
            receiving.id,
            pick(REFERRAL_REASONS, i),
            pick(REFERRAL_NOTES, i) || null,
            refStatus,
            decided ? (refStatus === "accepted" ? "Accepted; will schedule soon." : "Reviewed.") : null,
            decided ? `${decidedDate} 10:00:00` : null,
            daysAgo(45 - (i % 40)),
          ]
        );
        counts.referrals++;
      }
    }

    console.log(`\nSeeded demo activity across ${students.length} demo students:`);
    console.log(`  appointments        ${counts.appointments}`);
    console.log(`  counseling_sessions ${counts.sessions} (finalized)`);
    console.log(`  test_results        ${counts.tests}`);
    console.log(`  feedback            ${counts.feedback}`);
    console.log(`  referrals           ${counts.referrals}`);
    console.log(`  report_recipients   ${counts.reports}`);
    if (!reps.length) {
      console.log(
        "\nNote: no college_rep accounts exist, so referrals/reports were skipped."
      );
    }
    console.log(`\nWipe it all: npm run seed:demo-activity -- --clean`);
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error("\nSeeding demo activity failed:", err.message);
  process.exit(1);
});
