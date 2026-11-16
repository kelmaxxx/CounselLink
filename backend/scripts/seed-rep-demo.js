// Seeds a small, safe-to-delete demo set for ONE college representative:
// sent referrals, report requests (mixed statuses), received college summaries,
// and notifications — enough to make the College pages look lived-in.
//
//   Run:     npm run seed:rep-demo
//   Pick:    npm run seed:rep-demo -- --rep=someone@email
//   Wipe:    npm run seed:rep-demo -- --clean [--rep=...]
//
// Rows are tagged so re-runs clean up after themselves without any visible
// label:
//   • referrals        notes start with "DEMO-SEED"
//   • report_requests  letter_snapshot.demoSeed = true
//   • report_recipients report_payload.demoSeed = true
//   • notifications    type = 'demo_seed'
//
// The data is attached to real approved students in the rep's college, so those
// students may see the referrals on their side too. Use a staging database.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const DEFAULT_REP_EMAIL = "ghapz11@gmail.com";
const NOTE_MARKER = "DEMO-SEED";

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

const placeholderName = /(^|\s)(test|sample|demo|maheer|koko|blue|malakas)(\s|$)/i;

const run = async () => {
  const clean = process.argv.includes("--clean");
  const email = arg("rep") || DEFAULT_REP_EMAIL;

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
      `SELECT id, name, email, college, department, position, signature_url
       FROM users WHERE role = 'college_rep' AND status = 'approved' AND email = ?`,
      [email]
    );
    const rep = reps[0];
    if (!rep) {
      console.log(`No approved college representative with email "${email}".`);
      return;
    }
    if (!rep.college) {
      console.log(`${rep.name} has no college assigned; nothing to seed.`);
      return;
    }
    console.log(`College rep: ${rep.name} <${rep.email}> (id ${rep.id}, ${rep.college})`);

    // Always clear this rep's previous demo rows first.
    const [refDel] = await connection.query(
      "DELETE FROM referrals WHERE referrer_id = ? AND notes LIKE ?",
      [rep.id, `${NOTE_MARKER}%`]
    );
    const [recipDel] = await connection.query(
      "DELETE FROM report_recipients WHERE recipient_id = ? AND JSON_EXTRACT(report_payload, '$.demoSeed') = true",
      [rep.id]
    );
    const [reqDel] = await connection.query(
      "DELETE FROM report_requests WHERE requester_id = ? AND JSON_EXTRACT(letter_snapshot, '$.demoSeed') = true",
      [rep.id]
    );
    const [notifDel] = await connection.query(
      "DELETE FROM notifications WHERE user_id = ? AND type = 'demo_seed'",
      [rep.id]
    );
    console.log(
      `Removed ${refDel.affectedRows} demo referral(s), ${reqDel.affectedRows} request(s), ` +
        `${recipDel.affectedRows} received report(s), ${notifDel.affectedRows} notification(s).`
    );

    if (clean) {
      console.log("--clean given: done (no new rows inserted).");
      return;
    }

    const [studentRows] = await connection.query(
      `SELECT u.id, u.name, u.student_id, u.department, u.phone,
              sc.referral_sharing_consent AS consent,
              EXISTS(SELECT 1 FROM counseling_sessions cs
                     WHERE cs.student_id = u.id AND cs.finalized_at IS NOT NULL) AS hasSession
       FROM users u
       LEFT JOIN student_consents sc ON sc.student_id = u.id
       WHERE u.role = 'student' AND u.status = 'approved' AND u.college = ?
       ORDER BY u.id`,
      [rep.college]
    );
    const students = studentRows.filter((s) => !placeholderName.test(s.name));
    if (students.length < 4) {
      console.log(
        `Need at least 4 named approved students in ${rep.college}; found ${students.length}.`
      );
      return;
    }
    const consentedStudent =
      students.find((s) => s.consent === "yes" && s.hasSession) || students[0];
    const declinedStudent =
      students.find((s) => s.consent === "no") || students[1] || students[0];
    const otherStudent =
      students.find((s) => s.id !== consentedStudent.id && s.id !== declinedStudent.id) ||
      students[2];

    const [counselors] = await connection.query(
      `SELECT id, name, signature_url FROM users
       WHERE role = 'counselor' AND status = 'approved' ORDER BY id`
    );
    if (!counselors.length) {
      console.log("No approved counselors found.");
      return;
    }
    const counselorA = counselors[0];
    const counselorB = counselors[1] || counselorA;
    const counselorC = counselors[2] || counselorA;

    const snapshotFor = (request) => ({
      subject: request.subject,
      scopeType: request.type,
      studentName: request.student?.name || null,
      studentIdentifier: request.student?.student_id || null,
      studentProgram: null,
      studentDepartment: request.student?.department || null,
      studentCollege: request.student ? rep.college : null,
      department: request.department || null,
      college: request.type === "college" ? rep.college : null,
      reason: request.reason,
      requesterName: rep.name,
      requesterPosition: rep.position || "College Representative",
      requesterDepartment: rep.department || null,
      requesterCollege: rep.college,
      repSignatureUrl: rep.signature_url || null,
      requestedAt: request.createdAt,
      demoSeed: true,
    });

    const payloadFor = (request, totals, studentCount, sessions, counselor) => ({
      demoSeed: true,
      type: "college_summary",
      requestId: request.id,
      college: rep.college,
      department: request.department || null,
      totals,
      studentCount,
      sessions,
      narrative: request.narrative,
      counselorName: counselor.name,
      counselorSignatureUrl: counselor.signature_url || null,
      generatedAt: request.respondedAt,
    });

    const anonymizedSessions = (seed) => [
      {
        sessionDate: addDays(-3),
        presentingConcern: "Academic stress and difficulty managing deadlines.",
        summary: `Student reported ${seed} pressure from overlapping requirements; explored time management and coping strategies.`,
        plan: "Weekly check-in and study schedule; monitor progress.",
        nextSession: "followup",
      },
      {
        sessionDate: addDays(-9),
        presentingConcern: "Anxiety affecting sleep and class attendance.",
        summary: "Student described restlessness and occasional missed classes; practiced grounding techniques.",
        plan: "Continue breathing exercises; refer to peer support.",
        nextSession: "followup",
      },
      {
        sessionDate: addDays(-16),
        presentingConcern: "Family concerns interfering with focus.",
        summary: "Discussed family expectations and boundaries; identified two immediate action steps.",
        plan: "Follow up after two weeks; coordinate with adviser.",
        nextSession: "followup",
      },
      {
        sessionDate: addDays(-24),
        presentingConcern: "Career direction and program fit.",
        summary: "Reviewed strengths and interests; student decided to stay in the program with a lighter load.",
        plan: "Monitor academic standing; close case if stable.",
        nextSession: "termination",
      },
      {
        sessionDate: addDays(-32),
        presentingConcern: "Relationship difficulty affecting concentration.",
        summary: "Student processed a recent conflict and identified healthy communication strategies.",
        plan: "No further sessions unless concerns return.",
        nextSession: "termination",
      },
    ];

    await connection.beginTransaction();
    let seeded = 0;

    // ── Referrals (pending + mixed history) ────────────────────────────────
    const referrals = [
      {
        student: students[0],
        status: "pending",
        counselorId: null,
        reason: "Academic difficulty and missed requirements in two major subjects.",
        requestedDate: addDays(3),
        requestedTime: "morning",
        createdDaysAgo: 1,
      },
      {
        student: students[1],
        status: "accepted",
        counselorId: counselorA.id,
        reason: "Persistent stress affecting class participation and attendance.",
        decisionNote: "Scheduled for an initial counseling session.",
        requestedDate: addDays(5),
        requestedTime: "afternoon",
        createdDaysAgo: 5,
      },
      {
        student: students[2],
        status: "rescheduled",
        counselorId: counselorB.id,
        reason: "Family concerns affecting focus on coursework.",
        decisionNote: "Moved to next week because of a schedule conflict.",
        requestedDate: addDays(7),
        requestedTime: "morning",
        createdDaysAgo: 7,
      },
      {
        student: students[3],
        status: "rejected",
        counselorId: counselorC.id,
        reason: "Requested support for exam anxiety.",
        decisionNote: "Student already has an active case with another counselor; coordinate with the Guidance Office.",
        requestedDate: addDays(4),
        requestedTime: "afternoon",
        createdDaysAgo: 10,
      },
      {
        student: students[students.length - 1],
        status: "cancelled",
        counselorId: null,
        reason: "Consultation about organization activities and student welfare.",
        requestedDate: addDays(2),
        requestedTime: "morning",
        createdDaysAgo: 13,
      },
    ];

    for (const r of referrals) {
      await connection.query(
        `INSERT INTO referrals
           (student_id, referrer_id, receiving_counselor_id, reason, notes, status,
            decision_note, decided_at, student_department, requested_date,
            requested_time, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.student.id,
          rep.id,
          r.counselorId,
          r.reason,
          `${NOTE_MARKER}: demo referral for dashboard preview.`,
          r.status,
          r.decisionNote || null,
          r.status !== "pending" && r.status !== "cancelled" ? daysAgoAt(r.createdDaysAgo - 1, "10:00:00") : null,
          r.student.department,
          r.requestedDate,
          r.requestedTime,
          daysAgoAt(r.createdDaysAgo),
        ]
      );
      seeded++;
    }

    // ── Report requests (fulfilled summaries, pending, declined, cancelled) ─
    const requests = [
      {
        type: "college",
        subject: "Request for College Counseling Data",
        counselorId: counselorA.id,
        status: "fulfilled",
        department: null,
        student: null,
        reason: "Requesting aggregate counseling data for the CICS student body for the first semester.",
        narrative:
          "Counseling and testing activity in CICS remained steady this semester. Most sessions involved academic stress, time management, and career direction. Follow-up sessions are being sustained for students with ongoing concerns, and the office recommends continued coordination with college advisers.",
        createdDaysAgo: 18,
        respondedDaysAgo: 15,
      },
      {
        type: "department",
        subject: "Request for Department Counseling Data",
        counselorId: counselorB.id,
        status: "fulfilled",
        department: "Department of Information Sciences",
        student: null,
        reason: "Requesting a department-level summary of counseling activity for planning student support.",
        narrative:
          "Department-level activity is concentrated on academic adjustment and anxiety around major requirements. The office suggests a short workshop on study planning and stress management for the department.",
        createdDaysAgo: 12,
        respondedDaysAgo: 9,
      },
      {
        type: "individual",
        subject: "Request for Individual Counseling Data",
        counselorId: counselorA.id,
        status: "pending",
        department: null,
        student: consentedStudent,
        reason: "Following up on the student's academic performance and attendance this semester.",
        createdDaysAgo: 2,
        respondedDaysAgo: null,
      },
      {
        type: "individual",
        subject: "Request for Individual Counseling Data",
        counselorId: counselorC.id,
        status: "declined",
        department: null,
        student: declinedStudent,
        reason: "Requesting a brief update on the student's counseling progress.",
        responseNote: "The student has not consented to share counseling details at this time.",
        createdDaysAgo: 21,
        respondedDaysAgo: 19,
      },
      {
        type: "individual",
        subject: "Request for Individual Counseling Data",
        counselorId: null,
        status: "cancelled",
        department: null,
        student: otherStudent,
        reason: "Initial request for a counseling update; withdrawn after the student asked to handle it directly.",
        createdDaysAgo: 27,
        respondedDaysAgo: null,
      },
    ];

    const summaryCounts = [
      { totalSessions: 48, counselingSessions: 31, testingSessions: 17, followupSessions: 12, terminationSessions: 6, activeCases: 9, completed: 22 },
      { totalSessions: 19, counselingSessions: 12, testingSessions: 7, followupSessions: 5, terminationSessions: 3, activeCases: 4, completed: 8 },
    ];

    for (let i = 0; i < requests.length; i++) {
      const r = requests[i];
      const createdAt = daysAgoAt(r.createdDaysAgo, "09:30:00");
      const respondedAt = r.respondedDaysAgo ? daysAgoAt(r.respondedDaysAgo, "14:00:00") : null;
      const record = { ...r, createdAt, respondedAt };
      const snapshot = snapshotFor(record);

      const [res] = await connection.query(
        `INSERT INTO report_requests
           (requester_id, counselor_id, request_type, student_id, student_name,
            student_identifier, department, reason, status, response_note,
            responded_at, letter_snapshot, rep_signature_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rep.id,
          r.counselorId,
          r.type,
          r.student?.id || null,
          r.student?.name || null,
          r.student?.student_id || null,
          r.department || null,
          r.reason,
          r.status,
          r.responseNote || null,
          respondedAt,
          JSON.stringify(snapshot),
          rep.signature_url || null,
          createdAt,
        ]
      );
      const requestId = res.insertId;
      seeded++;

      if (r.status !== "fulfilled") continue;

      const counselor = counselors.find((c) => c.id === r.counselorId) || counselorA;
      const payload = payloadFor(
        { ...record, id: requestId },
        summaryCounts[i] || summaryCounts[0],
        r.type === "college" ? 312 : 86,
        anonymizedSessions(r.type === "college" ? "college-wide" : "department-level"),
        counselor
      );

      await connection.query(
        `INSERT INTO report_recipients
           (sender_id, recipient_id, title, summary, report_payload, status,
            sent_at, acknowledged_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          counselor.id,
          rep.id,
          r.type === "college"
            ? `College Summary — ${rep.college}`
            : `Department Summary — ${r.department} (${rep.college})`,
          r.narrative.slice(0, 160),
          JSON.stringify(payload),
          i === 0 ? "sent" : "acknowledged",
          respondedAt,
          i === 0 ? null : daysAgoAt(r.respondedDaysAgo - 1, "09:00:00"),
        ]
      );
      seeded++;
    }

    // ── Notifications (mixed read/unread) ──────────────────────────────────
    const notifications = [
      {
        title: "College summary received",
        message: `College Summary — ${rep.college} is now available.`,
        status: "unread",
        link: "/rep/counseling-data",
        daysAgo: 15,
      },
      {
        title: "Report request declined",
        message:
          "Your individual request was declined. Note: The student has not consented to share counseling details at this time.",
        status: "unread",
        link: "/rep/request-report",
        daysAgo: 19,
      },
      {
        title: "Referral accepted",
        message: "Your referral was accepted and scheduled by the counselor.",
        status: "read",
        link: "/rep/referrals",
        daysAgo: 4,
      },
    ];

    for (const n of notifications) {
      await connection.query(
        `INSERT INTO notifications (user_id, title, message, status, link, type, created_at)
         VALUES (?, ?, ?, ?, ?, 'demo_seed', ?)`,
        [rep.id, n.title, n.message, n.status, n.link, daysAgoAt(n.daysAgo, "11:00:00")]
      );
      seeded++;
    }

    await connection.commit();

    console.log(`\nInserted ${seeded} demo row(s) for ${rep.name}:`);
    console.log("  referrals: 1 pending, plus accepted / rescheduled / rejected / cancelled");
    console.log("  report requests: 2 fulfilled, 1 pending, 1 declined, 1 cancelled");
    console.log("  received reports: 1 unacknowledged college summary, 1 acknowledged department summary");
    console.log("  notifications: 2 unread, 1 read");
    console.log(`\nWipe: npm run seed:rep-demo -- --clean --rep=${rep.email}`);
  } catch (err) {
    await connection.rollback().catch(() => undefined);
    throw err;
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error("\nSeeding college rep demo data failed:", err.message);
  process.exit(1);
});
