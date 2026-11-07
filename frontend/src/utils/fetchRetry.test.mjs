import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry } from "./fetchRetry.js";

test("retries a GET while the backend wakes up", async () => {
  const statuses = [503, 502, 200];
  let calls = 0;
  const fakeFetch = async () => ({ status: statuses[calls++] });

  const response = await fetchWithRetry(fakeFetch, "/api/appointments", {}, [0, 0]);

  assert.equal(response.status, 200);
  assert.equal(calls, 3);
});

test("gives up after the last delay and returns the failing response", async () => {
  let calls = 0;
  const fakeFetch = async () => {
    calls++;
    return { status: 502 };
  };

  const response = await fetchWithRetry(fakeFetch, "/api/appointments", {}, [0]);

  assert.equal(response.status, 502);
  assert.equal(calls, 2);
});

test("never retries non-GET requests", async () => {
  let calls = 0;
  const fakeFetch = async () => {
    calls++;
    return { status: 502 };
  };

  await fetchWithRetry(fakeFetch, "/api/appointments", { method: "POST" }, [0, 0]);

  assert.equal(calls, 1);
});

test("retries network errors, then throws the last one", async () => {
  let calls = 0;
  const fakeFetch = async () => {
    calls++;
    throw new Error("offline");
  };

  await assert.rejects(fetchWithRetry(fakeFetch, "/api/users", {}, [0]), /offline/);
  assert.equal(calls, 2);
});

test("aborted requests stop immediately", async () => {
  let calls = 0;
  const fakeFetch = async () => {
    calls++;
    const err = new Error("aborted");
    err.name = "AbortError";
    throw err;
  };

  await assert.rejects(fetchWithRetry(fakeFetch, "/api/users", {}, [0, 0]), /aborted/);
  assert.equal(calls, 1);
});
