// Shared formatting and categorisation for the audit trail.

export const ROLE_LABELS = {
  admin: "Admin",
  counselor: "Counselor",
  student: "Student",
  college_rep: "College representative",
};

export const ACTION_LABELS = {
  approve_registration: "Approved registration",
  reject_registration: "Rejected registration",
  create_user: "Created user",
  update_user: "Updated user",
  delete_user: "Deleted user",
  ban_user: "Banned user",
  unban_user: "Restored user",
  resend_invitation: "Resent invitation",
  request_admin_email_change: "Requested email change",
  change_admin_email: "Changed admin email",
  create_announcement: "Created announcement",
  update_announcement: "Updated announcement",
  delete_announcement: "Deleted announcement",
  upload_test_result: "Uploaded test result",
  accept_appointment: "Accepted appointment",
  reject_appointment: "Rejected appointment",
  reschedule_appointment: "Rescheduled appointment",
  student_reschedule_appointment: "Requested reschedule",
  complete_appointment: "Completed appointment",
  mark_appointment_missed: "Marked appointment missed",
  cancel_appointment: "Cancelled appointment",
  create_session: "Created session",
  update_session: "Updated session",
  delete_session: "Deleted session",
  finalize_session: "Finalized session",
  create_referral: "Created referral",
  referral_cancelled: "Cancelled referral",
  create_report_request: "Requested report",
  send_individual_report: "Sent individual report",
  report_request_cancelled: "Cancelled report request",
  record_consent: "Recorded consent",
  upload_consent_scan: "Uploaded consent scan",
  delete_consent_scan: "Deleted consent scan",
  set_referral_sharing_consent: "Updated sharing consent",
  revoke_consent: "Revoked consent",
  revoke_authorization: "Revoked authorization",
  create_college_summary: "Created college summary",
  send_report: "Sent report",
  acknowledge_report_privacy: "Acknowledged privacy",
  upload_inventory_scan: "Uploaded inventory scan",
  delete_inventory_scan: "Deleted inventory scan",
  download_inventory_docx: "Downloaded inventory",
  upsert_inventory: "Updated inventory",
  accept_test: "Accepted test request",
  reject_test: "Rejected test request",
  reschedule_test: "Rescheduled test request",
  student_reschedule_test: "Requested test reschedule",
  urgent_counseling_request: "Urgent counseling request",
  submit_client_feedback: "Submitted feedback",
  submit_revocation_request: "Submitted revocation request",
  update_attendance_settings: "Updated attendance settings",
  login: "Signed in",
  logout: "Signed out",
  login_failed: "Failed sign-in",
  password_reset: "Reset password",
};

export function actionLabel(action) {
  if (!action) return "System event";
  return (
    ACTION_LABELS[action] ||
    action.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

// Students' names are masked in the audit trail, matching the previous table.
export function censorName(name) {
  if (!name) return name;
  return name
    .split(" ")
    .map((w) => (w.length <= 2 ? w : w[0] + "*".repeat(w.length - 2) + w[w.length - 1]))
    .join(" ");
}

export function displayActorName(log) {
  if (!log) return "Unknown actor";
  if (log.actorId == null) return "Public (unauthenticated)";
  const name = log.actorName || "(deleted user)";
  const shown = log.actorRole === "student" ? censorName(name) : name;
  return log.actorTitle ? `${shown}, ${log.actorTitle}` : shown;
}

export function targetLabel(log) {
  if (!log?.targetType) return null;
  return `${log.targetType}#${log.targetId ?? "—"}`;
}

// Priority order matters: e.g. an email-change action is security, not users.
const CATEGORY_RULES = [
  ["security", /login|logout|auth|password|email|revoke/],
  ["appointments", /appointment/],
  ["sessions", /session/],
  ["users", /user|registration|invitation/],
];

export function categoryOf(log) {
  const action = String(log?.action || "").toLowerCase();
  const target = String(log?.targetType || "").toLowerCase();
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(action) || pattern.test(target)) return category;
  }
  return "system";
}

export function formatAbsoluteTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const minutes = Math.floor(Math.max(0, now - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} yr${years === 1 ? "" : "s"} ago`;
}

export function groupLogsByDate(logs = []) {
  const groups = [];
  const byKey = new Map();
  for (const log of logs) {
    const d = new Date(log.createdAt);
    const valid = !Number.isNaN(d.getTime());
    const key = valid ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "unknown";
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        label: valid
          ? d
              .toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
              .toUpperCase()
          : "UNKNOWN DATE",
        logs: [],
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.logs.push(log);
  }
  return groups;
}
