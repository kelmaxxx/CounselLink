// Source of truth for the official "Client Feedback Form" (see
// CLIENT FEEDBACK FORM.docx) — used by both the student-facing form and the
// counselor-facing Feedback Tally page so labels never drift between them.

export const LIKERT_SCALE = [
  { value: 5, label: "Strongly Agree" },
  { value: 4, label: "Somewhat Agree" },
  { value: 3, label: "Neither Agree nor Disagree" },
  { value: 2, label: "Somewhat Disagree" },
  { value: 1, label: "Strongly Disagree" },
];

export const SATISFACTION_SCALE = [
  { value: 5, label: "Very Satisfied" },
  { value: 4, label: "Somewhat Satisfied" },
  { value: 3, label: "No Strong Feeling" },
  { value: 2, label: "Somewhat Dissatisfied" },
  { value: 1, label: "Strongly Dissatisfied" },
];

export const RECOMMEND_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
];

export const RELATIONSHIP_ITEMS = [
  { key: "q1", text: "My counselor listened to me effectively" },
  { key: "q2", text: "My counselor understood things from my point of view" },
  { key: "q3", text: "My counselor focused on what was important to me" },
  { key: "q4", text: "My counselor accepted what I said without judging me" },
  { key: "q5", text: "My counselor showed warmth towards me" },
  { key: "q6", text: "My counselor fostered a safe and trusting environment" },
  { key: "q7", text: "My counselor began and finished our sessions on time" },
  { key: "q8", text: "My counselor followed my lead during our sessions whenever that was appropriate" },
  { key: "q9", text: "My counselor provided leadership during our sessions when/if that was appropriate" },
  { key: "q10", text: "My counselor challenged me when/if that was appropriate" },
];

export const OUTCOME_ITEMS = [
  {
    key: "q11",
    text: "The sessions with my counselor helped me with whatever originally led me to seek counseling",
  },
  {
    key: "q12",
    text: "Any challenges which might have occurred in me as a result of my counseling have been positive and welcome",
  },
];

export const ALL_LIKERT_ITEMS = [...RELATIONSHIP_ITEMS, ...OUTCOME_ITEMS];

export const RESPONSE_KEYS = ALL_LIKERT_ITEMS.map((i) => i.key);
