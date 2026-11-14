// Announcement email delivery, shared by the create request (live announcements)
// and the scheduled sweep in server.js. Emails are sent one recipient at a time
// and failures are logged rather than thrown, so one bad address cannot stop
// the rest of the broadcast.
import { query } from "../config/db.js";
import { sendEmail } from "../services/email.service.js";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => (s ?? "").toString().replace(/[&<>"']/g, (c) => ESC_MAP[c]);

const ROLE_MAP = {
  all: null,
  students: "student",
  counselors: "counselor",
  reps: "college_rep",
  student: "student",
  counselor: "counselor",
  college_rep: "college_rep",
};

// Approved users matching the announcement audience, plus the admin who posted
// it — they get a copy so they can confirm what was delivered.
export const resolveAnnouncementRecipients = async (audience, adminId = 0) => {
  const role = ROLE_MAP[audience];
  const recipients = role
    ? await query("SELECT id, email FROM users WHERE role = ? AND status = 'approved'", [role])
    : await query("SELECT id, email FROM users WHERE status = 'approved' AND id <> ?", [adminId]);

  if (adminId && !recipients.some((r) => r.id === adminId)) {
    const [admin] = await query("SELECT id, email FROM users WHERE id = ?", [adminId]);
    if (admin) recipients.push(admin);
  }
  return recipients;
};

export const deliverAnnouncementEmails = async (recipients, title, message) => {
  const html = `<h2>${esc(title)}</h2><p>${esc(message).replace(/\n/g, "<br/>")}</p><p>Open CounselLink to view the full announcement.</p>`;
  const text = `${title}\n\n${message}\n\nOpen CounselLink to view the full announcement.`;
  const result = { sent: 0, failed: 0, firstError: null };
  for (const r of recipients) {
    if (!r.email) continue;
    try {
      await sendEmail({ to: r.email, subject: title, html, text });
      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      result.firstError ??= err.message;
      console.warn(`[announcement-email] Failed to email ${r.email}:`, err.message);
    }
  }
  return result;
};

// Emails scheduled announcements once their post time passes. Runs every minute
// from server.js. Only catches up 24 hours, so a long outage doesn't blast
// stale announcements at users — the in-app copy is still there for those.
export const sweepScheduledAnnouncements = async () => {
  const due = await query(
    `SELECT id, content, send_to AS sendTo, admin_id AS adminId FROM announcements
     WHERE post_at IS NOT NULL AND emailed_at IS NULL
       AND post_at <= NOW() AND post_at > NOW() - INTERVAL 1 DAY
       AND (remove_at IS NULL OR remove_at > NOW())`
  );

  for (const a of due) {
    // content is stored as "title\n\nmessage" by createAnnouncement.
    const split = a.content.indexOf("\n\n");
    const title = split === -1 ? a.content : a.content.slice(0, split);
    const message = split === -1 ? "" : a.content.slice(split + 2);

    const recipients = await resolveAnnouncementRecipients(a.sendTo, a.adminId);
    const result = await deliverAnnouncementEmails(recipients, title, message);
    console.log(
      `[announcement-email] #${a.id} (${a.sendTo}): ${recipients.length} recipients, ` +
        `${result.sent} sent, ${result.failed} failed` +
        (result.firstError ? ` — first error: ${result.firstError}` : "")
    );
    // Marked after sending: a crash mid-send retries rather than silently
    // dropping the rest of the audience.
    await query("UPDATE announcements SET emailed_at = NOW() WHERE id = ?", [a.id]);
  }

  return due.length;
};
