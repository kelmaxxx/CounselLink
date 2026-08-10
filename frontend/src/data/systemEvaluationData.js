// Data for CounselLink System Evaluation Questionnaire (SUS) & Participant Information Sheet

export const RESEARCH_INFO = {
  university: "MINDANAO STATE UNIVERSITY – MARAWI CITY",
  college: "COLLEGE OF INFORMATION AND COMPUTING SCIENCES",
  location: "Marawi City, 9700",
  title: "CounselLink: A Web-Based Guidance Counseling Scheduling and Records System for the Division of Student Affairs of Mindanao State University – Marawi City",
  researchers: [
    { name: "Abdensa C. Macatanong", email: "macatanong.ac854@s.msumain.edu.ph" },
    { name: "Abdulmalik M. Gampong", email: "gampong.am207@s.msumain.edu.ph" },
  ],
  adviser: {
    name: "Prof. Suhaina A. Khalid",
    title: "Department of Information Sciences Chairperson",
    email: "suhaina.khalid@msumain.edu.ph",
  },

  co_adviser: {
    name: " Prof. Amer Hussien T. Macatotong",
    email: "amerhussien.macatototng@msumain.edu.ph",
  },

};

export const SUS_SCALE = [
  { value: 1, label: "Strongly Agree" },
  { value: 2, label: "Agree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Disagree" },
  { value: 5, label: "Strongly Disagree" },
];

export const SUS_QUESTIONS = [
  { id: "q1", number: 1, text: "I think that I would like to use this system frequently.", type: "positive" },
  { id: "q2", number: 2, text: "I found the system unnecessarily complex.", type: "negative" },
  { id: "q3", number: 3, text: "I thought the system was easy to use.", type: "positive" },
  { id: "q4", number: 4, text: "I think that I would need the support of a technical person to be able to use this system.", type: "negative" },
  { id: "q5", number: 5, text: "I found the various functions in this system were well integrated.", type: "positive" },
  { id: "q6", number: 6, text: "I thought there was too much inconsistency in this system.", type: "negative" },
  { id: "q7", number: 7, text: "I would imagine that most people would learn to use this system very quickly.", type: "positive" },
  { id: "q8", number: 8, text: "I found the system very cumbersome to use.", type: "negative" },
  { id: "q9", number: 9, text: "I felt very confident using the system.", type: "positive" },
  { id: "q10", number: 10, text: "I need to learn a lot of things before I could get going with this system.", type: "negative" },
];

/**
 * Calculates raw SUS score (0-100) from an object of answers { q1: 1..5, ..., q10: 1..5 }
 */
export function computeSusScore(answers) {
  if (!answers) return 0;
  let totalPoints = 0;
  SUS_QUESTIONS.forEach((q) => {
    const val = Number(answers[q.id]);
    if (!val) return;
    if (q.type === "positive") {
      totalPoints += (5 - val);
    } else {
      totalPoints += (val - 1);
    }
  });
  return Number((totalPoints * 2.5).toFixed(2));
}

/**
 * Interprets a SUS Score according to standard Bangor, Kortum & Miller benchmarks
 */
export function getSusGrade(score) {
  if (score >= 80.3) {
    return { grade: "A", label: "Excellent", status: "Acceptable", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  }
  if (score >= 68.0) {
    return { grade: "B", label: "Good", status: "Acceptable", color: "text-blue-700 bg-blue-50 border-blue-200" };
  }
  if (score >= 51.0) {
    return { grade: "C", label: "OK", status: "Marginal", color: "text-amber-700 bg-amber-50 border-amber-200" };
  }
  if (score >= 35.7) {
    return { grade: "D", label: "Poor", status: "Unacceptable", color: "text-orange-700 bg-orange-50 border-orange-200" };
  }
  return { grade: "F", label: "Awful", status: "Unacceptable", color: "text-red-700 bg-red-50 border-red-200" };
}
