import rateLimit from "express-rate-limit";

const limiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

// Brute-force protection for credential endpoints. Limits are per IP;
// server.js sets `trust proxy` so this keys on the real client IP behind
// Render/Vercel proxies.
export const loginLimiter = limiter(
  5 * 60 * 1000,
  10,
  "Too many login attempts. Try again in 5 minutes."
);

export const registerLimiter = limiter(
  60 * 60 * 1000,
  5,
  "Too many registration attempts. Try again in an hour."
);

// Complements the per-user 5/hour limit inside the controller.
export const forgotLimiter = limiter(
  15 * 60 * 1000,
  5,
  "Too many password reset requests. Try again in 15 minutes."
);

export const otpLimiter = limiter(
  15 * 60 * 1000,
  10,
  "Too many verification attempts. Try again in 15 minutes."
);

// This endpoint is public and triggers emails to every counselor, so keep
// the per-IP limit tight.
export const urgentCounselingLimiter = limiter(
  15 * 60 * 1000,
  3,
  "Too many urgent requests submitted. If this is an emergency, please go directly to the Guidance and Counseling Office."
);
