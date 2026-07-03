import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { createNotification } from "../utils/notify.js";

const RESPONSE_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "q11", "q12"];
const RECOMMEND_VALUES = ["yes", "no", "not_sure"];

const isValidScore = (v) => Number.isInteger(v) && v >= 1 && v <= 5;

const parseResponses = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// Returns session IDs and test IDs for which the student already submitted feedback.
// Used by the student's My Records page to hide the feedback button once submitted.
export const getMySubmittedSessions = async (req, res) => {
  const studentId = req.user?.id;
  const rows = await query(
    "SELECT session_id, test_id FROM client_feedback_forms WHERE student_id = ? AND (session_id IS NOT NULL OR test_id IS NOT NULL)",
    [studentId]
  );
  return res.json({
    submittedSessionIds: rows.filter((r) => r.session_id).map((r) => r.session_id),
    submittedTestIds: rows.filter((r) => r.test_id).map((r) => r.test_id),
  });
};

// Lightweight, role-agnostic lookup so students can show a counselor's
// average star rating on their public profile. Returns only average + count —
// never individual entries. All sessions count (no per-student dedup).
export const getCounselorRating = async (req, res) => {
  const { counselorId } = req.query;
  if (!counselorId) {
    return res.status(400).json({ message: "counselorId is required" });
  }

  const rows = await query(
    "SELECT rating FROM client_feedback_forms WHERE counselor_id = ?",
    [counselorId]
  );
  const valid = rows.map((r) => Number(r.rating)).filter((v) => isValidScore(v));
  const average = valid.length ? valid.reduce((sum, v) => sum + v, 0) / valid.length : null;

  return res.json({ count: valid.length, average });
};

export const submitClientFeedback = async (req, res) => {
  const { counselorId, sessionId, testId, appointmentId, responses, overallSatisfaction, wouldRecommend, rating, comments } =
    req.body || {};
  const studentId = req.user?.id;

  if (!counselorId) {
    return res.status(400).json({ message: "counselorId is required" });
  }
  if (!sessionId && !testId) {
    return res.status(400).json({ message: "Either sessionId or testId is required" });
  }

  if (!responses || typeof responses !== "object") {
    return res.status(400).json({ message: "responses is required" });
  }
  const responseKeys = Object.keys(responses);
  const hasAllKeys =
    responseKeys.length === RESPONSE_KEYS.length && RESPONSE_KEYS.every((k) => k in responses);
  if (!hasAllKeys || !RESPONSE_KEYS.every((k) => isValidScore(Number(responses[k])))) {
    return res.status(400).json({ message: "All 12 statements must be answered with a value from 1 to 5" });
  }

  const satisfactionNum = Number(overallSatisfaction);
  if (!isValidScore(satisfactionNum)) {
    return res.status(400).json({ message: "overallSatisfaction (1-5) is required" });
  }

  if (!RECOMMEND_VALUES.includes(wouldRecommend)) {
    return res.status(400).json({ message: "wouldRecommend must be 'yes', 'no', or 'not_sure'" });
  }

  const ratingNum = Number(rating);
  if (!isValidScore(ratingNum)) {
    return res.status(400).json({ message: "rating (1-5) is required" });
  }

  const counselor = await query("SELECT id FROM users WHERE id = ? AND role = 'counselor'", [counselorId]);
  if (!counselor.length) {
    return res.status(404).json({ message: "Counselor not found" });
  }

  // One feedback per session/test — reject if already submitted
  if (sessionId) {
    const existing = await query(
      "SELECT id FROM client_feedback_forms WHERE student_id = ? AND session_id = ?",
      [studentId, sessionId]
    );
    if (existing.length) {
      return res.status(409).json({ message: "You have already submitted feedback for this session" });
    }
  }
  if (testId) {
    const existing = await query(
      "SELECT id FROM client_feedback_forms WHERE student_id = ? AND test_id = ?",
      [studentId, testId]
    );
    if (existing.length) {
      return res.status(409).json({ message: "You have already submitted feedback for this test result" });
    }
  }

  const normalizedResponses = {};
  RESPONSE_KEYS.forEach((k) => {
    normalizedResponses[k] = Number(responses[k]);
  });

  const result = await query(
    `INSERT INTO client_feedback_forms
       (student_id, counselor_id, session_id, test_id, appointment_id, responses, overall_satisfaction, would_recommend, rating, comments)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studentId,
      counselorId,
      sessionId || null,
      testId || null,
      appointmentId || null,
      JSON.stringify(normalizedResponses),
      satisfactionNum,
      wouldRecommend,
      ratingNum,
      comments || null,
    ]
  );

  await createNotification({
    userId: counselorId,
    title: "New client feedback received",
    message: "A student submitted the Client Feedback Form. View the tally summary for the latest figures.",
    link: "/counselor/feedback-tally",
    type: "info",
  });

  await logAction(req, "submit_client_feedback", "client_feedback_form", result.insertId, {
    counselorId,
    sessionId: sessionId || null,
    testId: testId || null,
  });

  return res.status(201).json({ message: "Feedback submitted", id: result.insertId });
};

export const getClientFeedbackTally = async (req, res) => {
  const callerId = req.user?.id;
  const callerRole = req.user?.role;
  let { counselorId, from, to } = req.query;

  if (counselorId === "me") counselorId = callerId;
  if (!counselorId) {
    return res.status(400).json({ message: "counselorId is required" });
  }

  if (callerRole === "counselor" && Number(counselorId) !== callerId) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (callerRole !== "counselor" && callerRole !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Build query — each row is one session's feedback; no per-student dedup needed.
  const where = ["counselor_id = ?"];
  const params = [counselorId];
  if (from) {
    where.push("created_at >= ?");
    params.push(from);
  }
  if (to) {
    where.push("created_at < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(to);
  }

  const rows = await query(
    `SELECT responses, overall_satisfaction, would_recommend, rating, comments, created_at
     FROM client_feedback_forms
     WHERE ${where.join(" AND ")}
     ORDER BY created_at DESC`,
    params
  );

  const perQuestion = {};
  RESPONSE_KEYS.forEach((k) => {
    perQuestion[k] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, average: null };
  });
  const overallSatisfaction = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, average: null };
  const rating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, average: null };
  const recommend = { yes: 0, no: 0, not_sure: 0 };
  const comments = [];

  for (const row of rows) {
    const r = parseResponses(row.responses) || {};
    RESPONSE_KEYS.forEach((k) => {
      const v = Number(r[k]);
      if (isValidScore(v)) perQuestion[k][v] += 1;
    });
    const sat = Number(row.overall_satisfaction);
    if (isValidScore(sat)) overallSatisfaction[sat] += 1;
    const rv = Number(row.rating);
    if (isValidScore(rv)) rating[rv] += 1;
    if (RECOMMEND_VALUES.includes(row.would_recommend)) recommend[row.would_recommend] += 1;
    if (row.comments && row.comments.trim()) comments.push(row.comments.trim());
  }

  const averageOf = (counts) => {
    const total = [1, 2, 3, 4, 5].reduce((sum, v) => sum + counts[v], 0);
    if (!total) return null;
    const weighted = [1, 2, 3, 4, 5].reduce((sum, v) => sum + v * counts[v], 0);
    return weighted / total;
  };

  RESPONSE_KEYS.forEach((k) => { perQuestion[k].average = averageOf(perQuestion[k]); });
  overallSatisfaction.average = averageOf(overallSatisfaction);
  rating.average = averageOf(rating);

  return res.json({
    count: rows.length,
    from: from || null,
    to: to || null,
    perQuestion,
    overallSatisfaction,
    rating,
    recommend,
    comments,
  });
};
