// Retries a flaky one-shot operation (DB connect at startup) with backoff.
// Outbound connections to the hosted MySQL (Aiven) intermittently hit
// ETIMEDOUT/ENOTFOUND even when the host is reachable seconds later — a
// single failed attempt shouldn't kill `npm run dev`/`npm start`.
export async function withRetries(fn, { attempts = 4, delaysMs = [2000, 4000, 8000], onAttemptFailed } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === attempts) throw err;
      onAttemptFailed?.(err, attempt, attempts);
      const delay = delaysMs[attempt - 1] ?? delaysMs[delaysMs.length - 1];
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Connection params, minus the password, for diagnostic logging.
export function describeDbConfig(env) {
  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    database: env.DB_NAME,
    ssl: env.DB_SSL === "true",
    caPath: env.DB_CA_PATH || "(none)",
    password: env.DB_PASSWORD ? `set (${env.DB_PASSWORD.length} chars)` : "MISSING",
  };
}
