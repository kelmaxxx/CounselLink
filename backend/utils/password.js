// Shared password policy. The frontend mirrors this rule in utils/password.js so
// users get instant feedback, but the server check is the one that counts.
// Applies to new passwords only — existing accounts can still log in.
export function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters" };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: "Password must contain a lowercase letter" };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: "Password must contain an uppercase letter" };
  }
  if (!/\d/.test(password)) {
    return { ok: false, message: "Password must contain a number" };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: "Password must contain a symbol" };
  }
  return { ok: true };
}
