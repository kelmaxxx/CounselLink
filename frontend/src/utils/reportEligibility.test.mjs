import test from "node:test";
import assert from "node:assert/strict";
import { isReportableStudent } from "./reportEligibility.js";

test("approved students with active consent and authorization are reportable", () => {
  assert.equal(isReportableStudent({ studentStatus: "approved" }), true);
  assert.equal(
    isReportableStudent({ studentStatus: "approved", consentRevoked: 0, authorizationRevoked: 0 }),
    true
  );
});

test("unapproved or revoked students are excluded from reports", () => {
  assert.equal(isReportableStudent({ studentStatus: "pending_approval" }), false);
  assert.equal(isReportableStudent({ studentStatus: "rejected" }), false);
  assert.equal(isReportableStudent({ studentStatus: "approved", consentRevoked: 1 }), false);
  assert.equal(isReportableStudent({ studentStatus: "approved", authorizationRevoked: 1 }), false);
});
