// src/utils/appointmentSlip.js
//
// Builds the appointment / psychological-test-request slip a student sees
// after submitting a request — same official MSU DSA letterhead as the
// Student Counseling Form (see utils/sessionReport.js), reused here so the
// two documents are visually consistent. There is only ever one slip per
// request; the student saves it as a real .pdf file (no print dialog).
import { OFFICIAL_HEADER_STYLES, buildOfficialHeaderHTML } from "./sessionReport.js";
import { saveHtmlAsPdfFile } from "./htmlToPdf.js";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s) => (s ?? "").toString().replace(/[&<>"']/g, (c) => ESC_MAP[c]);
const formatLine = (value) => (value === null || value === undefined || value === "" ? "—" : escapeHtml(value));

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
};

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  accepted: "Approved",
  rescheduled: "Rescheduled",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};

function buildAppointmentSlipHTML(appointment, { studentName } = {}) {
  const isTest = !!appointment.isTest;
  const docTitle = isTest ? "Psychological Test Request Slip" : "Counseling Appointment Slip";
  const submitted = appointment.created_at || appointment.createdAt;
  const preferredSlots = Array.isArray(appointment.preferredSlots)
    ? appointment.preferredSlots.join(", ")
    : appointment.timeSlot || "—";
  const scheduled = appointment.scheduledDate
    ? `${formatDate(appointment.scheduledDate)} ${appointment.scheduledTimeSlot || ""}`.trim()
    : "—";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docTitle)}</title>
  <style>
    body { font-family: 'Times New Roman', Georgia, serif; color: #111; line-height: 1.35; padding: 0; margin: 0; font-size: 10.5pt; background: #fff; }
    /* Real padding, not @page margin — this is captured by html2canvas
       (never printed), which never honors @page rules. See sessionReport.js. */
    .pdf-page { padding: 12mm 14mm; box-sizing: border-box; background: #fff; }
    ${OFFICIAL_HEADER_STYLES}
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5pt; }
    .info-table td { border: 1px solid #000; padding: 4px 6px; }
    .info-table td.label { font-weight: 700; width: 32%; }
    .signature-block { margin-top: 48px; display: flex; justify-content: space-between; gap: 32px; }
    .signature-col { flex: 1; }
    .signature-line { border-top: 1px solid #000; margin-top: 36px; padding-top: 2px; text-align: center; font-size: 9.5pt; }
  </style>
</head>
<body>
  <div class="pdf-page">
  ${buildOfficialHeaderHTML({ docCode: "Appointment / Test Request Slip", date: formatDate(submitted) })}

  <div class="form-title">${escapeHtml(docTitle)}</div>

  <table class="info-table">
    <tr>
      <td class="label">Student's Name</td><td>${formatLine(studentName)}</td>
    </tr>
    <tr>
      <td class="label">Request Type</td>
      <td>${isTest ? `Psychological Test (${formatLine(appointment.testType)})` : "Counseling Appointment"}</td>
    </tr>
    <tr>
      <td class="label">Status</td><td>${formatLine(STATUS_LABELS[appointment.status] || appointment.status)}</td>
    </tr>
    <tr>
      <td class="label">Preferred Date</td><td>${formatDate(appointment.preferredDate)}</td>
    </tr>
    <tr>
      <td class="label">Preferred Time</td><td>${formatLine(preferredSlots)}</td>
    </tr>
    <tr>
      <td class="label">Scheduled</td><td>${formatLine(scheduled)}</td>
    </tr>
    <tr>
      <td class="label">Counselor</td><td>${formatLine(appointment.counselorName || "To be assigned")}</td>
    </tr>
    ${appointment.reason ? `<tr><td class="label">Reason</td><td>${formatLine(appointment.reason)}</td></tr>` : ""}
    ${appointment.counselor_action_note ? `<tr><td class="label">Counselor Note</td><td>${formatLine(appointment.counselor_action_note)}</td></tr>` : ""}
    <tr>
      <td class="label">Submitted</td><td>${submitted ? new Date(submitted).toLocaleString() : "—"}</td>
    </tr>
  </table>

  <div class="signature-block">
    <div class="signature-col">
      <div class="signature-line">Student Signature</div>
    </div>
    <div class="signature-col">
      <div class="signature-line">Counselor Signature</div>
    </div>
  </div>
  </div>
</body>
</html>`;
}

const safeFileBase = (name) =>
  `appointment_slip_${(name || "request").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}`.toLowerCase();

// Saves the appointment/test-request slip straight to disk as a .pdf file —
// no print dialog. Intended to be available once the counselor has acted on
// the request (approved/rescheduled); pending requests are view-only.
export async function saveAppointmentSlipAsPdfFile(appointment, opts = {}) {
  const html = buildAppointmentSlipHTML(appointment, opts);
  await saveHtmlAsPdfFile(html, `${safeFileBase(opts.studentName)}.pdf`, { pageWidthIn: 8.27, pageHeightIn: 11.69 });
}
