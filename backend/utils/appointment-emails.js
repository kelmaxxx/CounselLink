import { query } from "../config/db.js";
import { sendEmail } from "../services/email.service.js";

// Base URL of the student-facing app, used to build the "Open CounselLink"
// button. Falls back to the first configured CORS origin (dev default 5173).
const APP_URL = (
  process.env.APP_URL ||
  (process.env.CORS_ORIGINS || "http://localhost:5173").split(",")[0]
).trim().replace(/\/+$/, "");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Build the subject + human-readable body for each appointment status. Kept in
// one place so the wording stays consistent with the in-app notifications.
const buildContent = ({ status, date, timeSlot, note, isUrgent, isTest }) => {
  const when = date && timeSlot ? `${date} at ${timeSlot}` : null;

  switch (status) {
    case "completed":
      return isTest
        ? {
            subject: "Your CounselLink psychological test is complete",
            heading: "Psychological Test Completed",
            lead: "Your psychological test has been marked as <strong>completed</strong> by the counselor. You may view the details in your account.",
            ctaPath: "/student/tests",
            ctaLabel: "View my tests",
          }
        : {
            subject: "Your CounselLink counseling session is complete",
            heading: "Counseling Session Completed",
            lead: "Your counseling session has been marked as <strong>completed</strong> by the counselor. Thank you for coming in.",
          };
    case "approved":
      return {
        subject: "Your CounselLink appointment was approved",
        heading: "Appointment Approved",
        lead: isUrgent
          ? "Your urgent appointment request has been <strong>approved</strong>. Please proceed to the counselor's office."
          : `Your counseling appointment has been <strong>approved</strong>${
              when ? ` for <strong>${escapeHtml(when)}</strong>` : ""
            }.`,
      };
    case "rescheduled":
      return {
        subject: "Your CounselLink appointment was rescheduled",
        heading: "Appointment Rescheduled",
        lead: `Your counseling appointment has been <strong>rescheduled</strong>${
          when ? ` to <strong>${escapeHtml(when)}</strong>` : ""
        }. Please take note of the new schedule.`,
      };
    case "rejected":
      return {
        subject: "Update on your CounselLink appointment",
        heading: "Appointment Rejected",
        lead: "Unfortunately, your counseling appointment request was <strong>not approved</strong>. You may submit a new request at any time.",
      };
    case "followup":
      return {
        subject: "A follow-up session has been scheduled for you",
        heading: "Follow-up Session Scheduled",
        lead: `Your counselor has scheduled a <strong>follow-up session</strong>${
          when ? ` for <strong>${escapeHtml(when)}</strong>` : ""
        }.`,
      };
    default:
      return null;
  }
};

const renderHtml = ({ name, heading, lead, note, ctaPath, ctaLabel }) => `
  <div style="font-family:'Figtree',Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827">
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h2>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Hello ${escapeHtml(name)},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px">${lead}</p>
    ${
      note
        ? `<div style="background:#f3f4f6;border-radius:8px;padding:12px 16px;margin:0 0 16px">
             <p style="font-size:13px;color:#6b7280;margin:0 0 4px">Note from your counselor:</p>
             <p style="font-size:14px;color:#111827;margin:0;white-space:pre-wrap">${escapeHtml(note)}</p>
           </div>`
        : ""
    }
    <a href="${APP_URL}${ctaPath}"
       style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px">
       ${escapeHtml(ctaLabel)}
    </a>
    <p style="color:#6b7280;font-size:12px;line-height:1.5;margin-top:24px">
      You're receiving this because you have a CounselLink account. This is an automated message — please do not reply.
    </p>
  </div>`;

const renderText = ({ name, lead, note, ctaPath, ctaLabel }) => {
  const plainLead = lead.replace(/<[^>]+>/g, "");
  return [
    `Hello ${name},`,
    "",
    plainLead,
    note ? `\nNote from your counselor: ${note}` : "",
    "",
    `${ctaLabel}: ${APP_URL}${ctaPath}`,
    "",
    "This is an automated message from CounselLink — please do not reply.",
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");
};

// Fire-and-forget email for an appointment status change. Mirrors the auth
// controller pattern: never throws to the caller and never blocks the HTTP
// response — failures are logged and swallowed so a down mail provider can't
// break the (already persisted) appointment action or in-app notification.
export const sendAppointmentStatusEmail = ({ studentId, status, date, timeSlot, note, isUrgent, isTest }) => {
  const content = buildContent({ status, date, timeSlot, note, isUrgent, isTest });
  if (!content || !studentId) return;

  const ctaPath = content.ctaPath || "/student/appointments";
  const ctaLabel = content.ctaLabel || "View my appointments";

  (async () => {
    try {
      const rows = await query("SELECT name, email FROM users WHERE id = ? LIMIT 1", [studentId]);
      const student = rows[0];
      if (!student?.email) return;

      const name = student.name || "there";
      await sendEmail({
        to: student.email,
        subject: content.subject,
        html: renderHtml({ name, heading: content.heading, lead: content.lead, note, ctaPath, ctaLabel }),
        text: renderText({ name, lead: content.lead, note, ctaPath, ctaLabel }),
      });
    } catch (err) {
      console.warn(`[appointment-email] Failed to email student ${studentId} (${status}):`, err.message);
    }
  })();
};
