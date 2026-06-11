// Shared password policy. The frontend mirrors this rule in Login.jsx so users
// get instant feedback, but the server check is the one that counts.
// Applies to new passwords only — existing accounts can still log in.
export function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters" };
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return { ok: false, message: "Password must contain at least one letter and one number" };
  }
  return { ok: true };
}
