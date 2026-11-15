import assert from "node:assert/strict";
import test from "node:test";
import { nextActiveId } from "./pendingRegistrations.js";

const users = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("starts on the first entry going forward", () => {
  assert.equal(nextActiveId(users, null, 1), "a");
});

test("starts on the last entry going backward", () => {
  assert.equal(nextActiveId(users, null, -1), "c");
});

test("wraps around both ends", () => {
  assert.equal(nextActiveId(users, "c", 1), "a");
  assert.equal(nextActiveId(users, "a", -1), "c");
});

test("moves one step inside the list", () => {
  assert.equal(nextActiveId(users, "a", 1), "b");
  assert.equal(nextActiveId(users, "c", -1), "b");
});

test("handles an empty list", () => {
  assert.equal(nextActiveId([], null, 1), null);
});
