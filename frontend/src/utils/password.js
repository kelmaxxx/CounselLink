// Shared client password policy (mirrors backend/utils/password.js).
export const passwordChecks = (pw = "") => ({
  length: pw.length >= 8,
  lower: /[a-z]/.test(pw),
  upper: /[A-Z]/.test(pw),
  number: /\d/.test(pw),
  symbol: /[^A-Za-z0-9]/.test(pw),
});

export const isStrongPassword = (pw) =>
  typeof pw === "string" && Object.values(passwordChecks(pw)).every(Boolean);
