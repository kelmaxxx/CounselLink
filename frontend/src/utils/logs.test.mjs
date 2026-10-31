import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryOf,
  censorName,
  displayActorName,
  formatRelativeTime,
  groupLogsByDate,
  targetLabel,
} from "./logs.js";

test("categoryOf routes domain actions to timeline buckets", () => {
  assert.equal(categoryOf({ action: "complete_appointment", targetType: "appointment" }), "appointments");
  assert.equal(categoryOf({ action: "finalize_session", targetType: "counseling_session" }), "sessions");
  assert.equal(categoryOf({ action: "create_user", targetType: "user" }), "users");
  assert.equal(categoryOf({ action: "request_admin_email_change", targetType: "user" }), "security");
  assert.equal(categoryOf({ action: "update_attendance_settings", targetType: "app_settings" }), "system");
});

test("student actor names stay censored", () => {
  assert.equal(censorName("Ana Reyes"), "A*a R***s");
  assert.equal(
    displayActorName({ actorId: 3, actorName: "Ana Reyes", actorRole: "student" }),
    "A*a R***s"
  );
  assert.equal(displayActorName({ actorId: null, actorRole: null }), "Public (unauthenticated)");
});

test("relative time buckets read naturally", () => {
  const now = Date.parse("2026-10-31T12:00:00Z");
  assert.equal(formatRelativeTime("2026-10-31T11:59:40Z", now), "just now");
  assert.equal(formatRelativeTime("2026-10-31T11:36:00Z", now), "24 min ago");
  assert.equal(formatRelativeTime("2026-10-31T09:00:00Z", now), "3 hrs ago");
  assert.equal(formatRelativeTime("2026-10-30T12:00:00Z", now), "1 day ago");
});

test("logs group into date buckets in order", () => {
  const groups = groupLogsByDate([
    { id: 1, createdAt: "2026-10-31T12:00:00Z" },
    { id: 2, createdAt: "2026-10-31T08:00:00Z" },
    { id: 3, createdAt: "2026-10-29T12:00:00Z" },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((g) => g.logs.map((l) => l.id)),
    [[1, 2], [3]]
  );
});

test("target labels fall back to an em dash id", () => {
  assert.equal(targetLabel({ targetType: "user", targetId: 7 }), "user#7");
  assert.equal(targetLabel({ targetType: "app_settings", targetId: null }), "app_settings#—");
  assert.equal(targetLabel({}), null);
});
