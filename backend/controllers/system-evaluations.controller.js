import pool from "../config/db.js";

/**
 * Calculates SUS (System Usability Scale) score (0-100)
 * Scale input values: 1 = Strongly Agree, 2 = Agree, 3 = Neutral, 4 = Disagree, 5 = Strongly Disagree
 */
export function calculateSusScore(answers) {
  const { q1, q2, q3, q4, q5, q6, q7, q8, q9, q10 } = answers;
  
  // Positive statements (q1, q3, q5, q7, q9): 1=4pts, 2=3pts, 3=2pts, 4=1pt, 5=0pts -> (5 - val)
  const posPoints = (5 - Number(q1)) + (5 - Number(q3)) + (5 - Number(q5)) + (5 - Number(q7)) + (5 - Number(q9));

  // Negative statements (q2, q4, q6, q8, q10): 1=0pts, 2=1pt, 3=2pts, 4=3pts, 5=4pts -> (val - 1)
  const negPoints = (Number(q2) - 1) + (Number(q4) - 1) + (Number(q6) - 1) + (Number(q8) - 1) + (Number(q10) - 1);

  const totalRaw = posPoints + negPoints;
  const susScore = totalRaw * 2.5;
  return Number(susScore.toFixed(2));
}

/**
 * Submit system evaluation (Public / Guest / Logged-in)
 */
export async function submitSystemEvaluation(req, res) {
  const {
    respondentName,
    respondentType,
    participantSignature,
    q1, q2, q3, q4, q5, q6, q7, q8, q9, q10,
    comments,
  } = req.body;

  if (!respondentName || !respondentName.trim()) {
    return res.status(400).json({ message: "Respondent name is required." });
  }

  const questions = { q1, q2, q3, q4, q5, q6, q7, q8, q9, q10 };
  for (let i = 1; i <= 10; i++) {
    const val = Number(questions[`q${i}`]);
    if (!val || val < 1 || val > 5) {
      return res.status(400).json({ message: `Please answer question #${i} with a valid rating (1-5).` });
    }
  }

  const susScore = calculateSusScore(questions);
  const userId = req.user?.id || null;
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;

  const [result] = await pool.execute(
    `INSERT INTO system_evaluations 
     (respondent_name, respondent_type, participant_signature, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, sus_score, comments, user_id, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      respondentName.trim(),
      respondentType || "student",
      participantSignature || null,
      Number(q1), Number(q2), Number(q3), Number(q4), Number(q5),
      Number(q6), Number(q7), Number(q8), Number(q9), Number(q10),
      susScore,
      comments?.trim() || null,
      userId,
      ipAddress,
    ]
  );

  return res.status(201).json({
    message: "Thank you! Your system evaluation has been submitted successfully.",
    evaluationId: result.insertId,
    susScore,
  });
}

/**
 * Get SUS Tally Summary (Counselor & Admin view)
 */
export async function getSystemEvaluationsTally(req, res) {
  const [rows] = await pool.execute(
    `SELECT * FROM system_evaluations ORDER BY created_at DESC`
  );

  const totalCount = rows.length;

  if (totalCount === 0) {
    return res.json({
      count: 0,
      averageSusScore: 0,
      grade: "N/A",
      acceptability: "N/A",
      perQuestion: {},
      evaluations: [],
    });
  }

  const totalScoreSum = rows.reduce((sum, r) => sum + Number(r.sus_score), 0);
  const averageSusScore = Number((totalScoreSum / totalCount).toFixed(2));

  // Determine Grade & Acceptability based on standard SUS benchmarks
  let grade = "F";
  let acceptability = "Not Acceptable";
  if (averageSusScore >= 80.3) {
    grade = "A";
    acceptability = "Acceptable (Excellent)";
  } else if (averageSusScore >= 68.0) {
    grade = "B";
    acceptability = "Acceptable (Good)";
  } else if (averageSusScore >= 51.0) {
    grade = "C";
    acceptability = "Marginal (OK)";
  } else if (averageSusScore >= 35.7) {
    grade = "D";
    acceptability = "Poor";
  }

  // Tally distribution per question (1-5 counts & average)
  const perQuestion = {};
  for (let i = 1; i <= 10; i++) {
    const qKey = `q${i}`;
    perQuestion[qKey] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, sum: 0, average: 0 };
    rows.forEach((r) => {
      const val = Number(r[qKey]);
      if (val >= 1 && val <= 5) {
        perQuestion[qKey][val] = (perQuestion[qKey][val] || 0) + 1;
        perQuestion[qKey].sum += val;
      }
    });
    perQuestion[qKey].average = Number((perQuestion[qKey].sum / totalCount).toFixed(2));
  }

  return res.json({
    count: totalCount,
    averageSusScore,
    grade,
    acceptability,
    perQuestion,
    evaluations: rows.map((r) => ({
      id: r.id,
      respondentName: r.respondent_name,
      respondentType: r.respondent_type,
      participantSignature: r.participant_signature,
      consentSignedAt: r.consent_signed_at,
      susScore: Number(r.sus_score),
      comments: r.comments,
      createdAt: r.created_at,
      answers: {
        q1: r.q1, q2: r.q2, q3: r.q3, q4: r.q4, q5: r.q5,
        q6: r.q6, q7: r.q7, q8: r.q8, q9: r.q9, q10: r.q10,
      },
    })),
  });
}
