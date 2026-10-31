import test from "node:test";
import assert from "node:assert/strict";
import { formatCount, parseCount } from "./countUp.js";

test("plain numbers count up", () => {
  assert.deepEqual(parseCount(42), {
    target: 42,
    prefix: "",
    suffix: "",
    decimals: 0,
    grouped: false,
  });
});

test("currency, grouping and decimals are preserved", () => {
  assert.deepEqual(parseCount("₱1,234.50"), {
    target: 1234.5,
    prefix: "₱",
    suffix: "",
    decimals: 2,
    grouped: true,
  });
  assert.equal(parseCount("87%").suffix, "%");
});

test("non-numbers render untouched", () => {
  for (const value of ["Mar 3", "3 / 5", "—", "", null, undefined, {}]) {
    assert.equal(parseCount(value), null);
  }
});

test("formatting matches the parsed shape", () => {
  assert.equal(formatCount(1234.5, { decimals: 2, grouped: true }), "1,234.50");
  assert.equal(formatCount(12.6, { decimals: 0 }), "13");
});
