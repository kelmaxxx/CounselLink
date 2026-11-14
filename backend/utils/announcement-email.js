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

// Approved users matching the announcement audience. "all" deliberately skips
// the admin who wrote it.
export const resolveAnnouncementRecipients = async (audience, excludeUserId = 0) => {
  const role = ROLE_MAP[audience];
  return role
    ? query("SELECT id, email FROM users WHERE role = ? AND status = 'approved'", [role])
    : query("SELECT id, email FROM users WHERE status = 'approved' AND id <> ?", [excludeUserId]);
};

export const deliverAnnouncementEmails = async (recipients, title, message) => {
  const html = `<h2>${esc(title)}</h2><p>${esc(message).replace(/\n/g, "<br/>")}</p><p>Open CounselLink to view the full announcement.</p>`;
  const text = `${title}\n\n${message}\n\nOpen CounselLink to view the full announcement.`;
  for (const r of recipients) {
    if (!r.email) continue;
    try {
      await sendEmail({ to: r.email, subject: title, html, text });
    } catch (err) {
      console.warn(`[announcement-email] Failed to email ${r.email}:`, err.message);
    }
  }
};

// Emails scheduled announcements once their post time passes. Runs every minute
// from server.js. Only catches up 24 hours, so a long outage doesn't blast
// stale announcements at users — the in-app copy is still there for those.
export const sweepScheduledAnnouncements = async () => {
  const due = await query(
    `SELECT id, content, send_to AS sendTo FROM announcements
     WHERE post_at IS NOT NULL AND emailed_at IS NULL
       AND post_at <= NOW() AND post_at > NOW() - INTERVAL 1 DAY
       AND (remove_at IS NULL OR remove_at > NOW())`
  );

  for (const a of due) {
    // content is stored as "title\n\nmessage" by createAnnouncement.
    const split = a.content.indexOf("\n\n");
    const title = split === -1 ? a.content : a.content.slice(0, split);
    const message = split === -1 ? "" : a.content.slice(split + 2);

    const recipients = await resolveAnnouncementRecipients(a.sendTo, 0);
    await deliverAnnouncementEmails(recipients, title, message);
    // Marked after sending: a crash mid-send retries rather than silently
    // dropping the rest of the audience.
    await query("UPDATE announcements SET emailed_at = NOW() WHERE id = ?", [a.id]);
  }

  return due.length;
};
