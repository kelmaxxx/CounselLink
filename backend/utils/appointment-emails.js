import { query } from "../config/db.js";
import { sendEmail } from "../services/email.service.js";
import { formatManilaDate } from "./scheduling.js";

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
const buildContent = ({ status, date, timeSlot, note, isUrgent, isTest, counselorName, queueNo }) => {
  const when = date && timeSlot ? `${formatManilaDate(date)} at ${timeSlot}` : null;
  const counselorStr = counselorName ? ` by Counselor ${escapeHtml(counselorName)}` : " by the counselor";
  const queueStr = queueNo ? ` Your queue number is #${escapeHtml(queueNo)}.` : "";
  const pleaseAttendStr = " Please attend the session at your preferred schedule.";
  const pleaseAttendReschedStr = " Please attend the session at your new schedule.";

  switch (status) {
    case "completed":
      return isTest
        ? {
          subject: "Your CounselLink psychological test is complete",
          heading: "Psychological Test Completed",
          lead: "Your psychological test has been marked as <strong>completed</strong> by the counselor. You may view the details in your account.",
          ctaPath: "/student/consent",
          ctaLabel: "View my records",
        }
        : {
          subject: "Your CounseLink counseling session is complete",
          heading: "Counseling Session Completed",
          lead: "Your counseling session has been marked as <strong>completed</strong> by the counselor. Thank you for coming in.",
        };
    case "session_completed":
      return {
        subject: "Your CounselLink counseling session is complete",
        heading: "Counseling Session Completed",
        lead: `Your counseling session${date ? ` on <strong>${escapeHtml(formatManilaDate(date))}</strong>` : ""} has been formally <strong>completed</strong>. Thank you for taking part — take care of yourself.`,
        ctaPath: "/student/appointments",
        ctaLabel: "View my appointments",
      };
    case "session_terminated":
      return {
        subject: "Update on your CounselLink counseling sessions",
        heading: "Counseling Sessions Concluded",
        greeting: "THANK YOU!",
        lead: `For trusting and using our service. Your counseling sessions${date ? ` as of <strong>${escapeHtml(formatManilaDate(date))}</strong>` : ""} have <strong>concluded</strong>. This may mean your goals have been met, or your counselor has recommended a different kind of support. You are welcome to request another appointment at any time.`,
        ctaPath: "/student/request-appointment",
        ctaLabel: "Request an appointment",
      };
    case "approved":
      return {
        subject: "Your CounseLink appointment was approved",
        heading: "Appointment Approved",
        lead: isUrgent
          ? `Your urgent appointment request has been <strong>approved</strong>${counselorStr}.${queueStr} Please proceed to the counselor's office.`
          : `Your counseling appointment has been <strong>approved</strong>${counselorStr}${when ? ` for <strong>${escapeHtml(when)}</strong>` : ""
          }.${queueStr}${pleaseAttendStr}`,
      };
    case "rescheduled":
      return {
        subject: "Your CounseLink appointment was rescheduled",
        heading: "Appointment Rescheduled",
        lead: `Your counseling appointment has been <strong>rescheduled</strong>${counselorStr}${when ? ` to <strong>${escapeHtml(when)}</strong>` : ""
          }.${queueStr}${pleaseAttendReschedStr}`,
      };
    case "rejected":
      return {
        subject: "Update on your CounseLink appointment",
        heading: "Appointment Rejected",
        lead: `Unfortunately, your counseling appointment request was <strong>not approved</strong>${counselorStr}. You may submit a new request at any time.`,
      };
    case "followup":
      return {
        subject: "A follow-up session has been scheduled for you",
        heading: "Follow-up Session Scheduled",
        lead: `Your counselor has scheduled a <strong>follow-up session</strong>${when ? ` for <strong>${escapeHtml(when)}</strong>` : ""
          }.`,
      };
    default:
      return null;
  }
};

const renderHtml = ({ name, heading, greeting = "Hello", lead, note, ctaPath, ctaLabel }) => `
  <div style="font-family:'Figtree',Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827">
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h2>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px">${escapeHtml(greeting)} ${escapeHtml(name)},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px">${lead}</p>
    ${note
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

const renderText = ({ name, greeting = "Hello", lead, note, ctaPath, ctaLabel }) => {
  const plainLead = lead.replace(/<[^>]+>/g, "");
  return [
    `${greeting} ${name},`,
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

// Fire-and-forget attendance warning email for the monitoring rules. Contains
// only the count and a supportive next step — never counseling notes/results.
export const sendAttendanceWarningEmail = ({ studentId, type, count }) => {
  if (!studentId) return;

  (async () => {
    try {
      const rows = await query("SELECT name, email FROM users WHERE id = ? LIMIT 1", [studentId]);
      const student = rows[0];
      if (!student?.email) return;

      const missed = type === "missed_streak";
      const heading = missed ? "Attendance Concern" : "Appointment Cancellations";
      const lead = missed
        ? `You have missed <strong>${count} consecutive appointments</strong>. We would like to check in and help you continue your sessions — please contact the Guidance and Counseling Section at your convenience.`
        : `You have canceled <strong>${count} consecutive appointments</strong>. If something is making it hard to attend, please reach out so we can help you find a schedule that works.`;
      const name = student.name || "there";
      const ctaPath = "/student/appointments";
      const ctaLabel = "View my appointments";

      await sendEmail({
        to: student.email,
        subject: missed
          ? "We missed you at your counseling appointments"
          : "A note about your counseling appointments",
        html: renderHtml({ name, heading, lead, ctaPath, ctaLabel }),
        text: renderText({ name, lead, ctaPath, ctaLabel }),
      });
    } catch (err) {
      console.warn(`[attendance-email] Failed to email student ${studentId} (${type}):`, err.message);
    }
  })();
};

// Fire-and-forget email for an appointment status change. Mirrors the auth
// controller pattern: never throws to the caller and never blocks the HTTP
// response — failures are logged and swallowed so a down mail provider can't
// break the (already persisted) appointment action or in-app notification.
export const sendAppointmentStatusEmail = ({ studentId, status, date, timeSlot, note, isUrgent, isTest, counselorId, queueNo }) => {
  if (!studentId) return;

  (async () => {
    try {
      const rows = await query("SELECT name, email FROM users WHERE id = ? LIMIT 1", [studentId]);
      const student = rows[0];
      if (!student?.email) return;

      let counselorName = null;
      if (counselorId) {
        const cRows = await query("SELECT name FROM users WHERE id = ? LIMIT 1", [counselorId]);
        if (cRows.length) counselorName = cRows[0].name;
      }

      const content = buildContent({ status, date, timeSlot, note, isUrgent, isTest, counselorName, queueNo });
      if (!content) return;

      const ctaPath = content.ctaPath || "/student/appointments";
      const ctaLabel = content.ctaLabel || "View my appointments";
      const greeting = content.greeting || "Hello";

      const name = student.name || "there";
      await sendEmail({
        to: student.email,
        subject: content.subject,
        html: renderHtml({ name, heading: content.heading, greeting, lead: content.lead, note, ctaPath, ctaLabel }),
        text: renderText({ name, greeting, lead: content.lead, note, ctaPath, ctaLabel }),
      });
    } catch (err) {
      console.warn(`[appointment-email] Failed to email student ${studentId} (${status}):`, err.message);
    }
  })();
};
