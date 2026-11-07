// The API backend (Render) sleeps when idle and answers the first requests
// after waking with 502/503. Every data context swallowed that failure, so the
// app stayed a logged-in shell with empty data until the user logged out and
// back in. Retrying idempotent GETs lets the first load recover on its own.
// Writes are never retried: a drop after the server applied them would
// duplicate the write.
export const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);
const DELAYS_MS = [1000, 3000, 7000, 15000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(originalFetch, input, init = {}, delaysMs = DELAYS_MS) {
  const method = (init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "GET") return originalFetch(input, init);

  for (let attempt = 0; ; attempt++) {
    try {
      const response = await originalFetch(input, init);
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= delaysMs.length) return response;
    } catch (err) {
      if (err.name === "AbortError" || attempt >= delaysMs.length) throw err;
    }
    await sleep(delaysMs[attempt]);
  }
}

export function installFetchRetry() {
  if (typeof window === "undefined" || window.__fetchRetryInstalled) return;
  window.__fetchRetryInstalled = true;
  const original = window.fetch.bind(window);
  window.fetch = (input, init) => fetchWithRetry(original, input, init);
}
