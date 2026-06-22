// Builds a printable / Word-compatible representation of an individual student
// counseling Session Report, matching the official MSU DSA Guidance and
// Counseling Section "Student Counseling Form" (MSU DSA GCS Form 3.3). Used by:
//   - Counselor Reports page (view + download per-student report sent to rep)
//   - Rep Reports page (download received per-student report)
//   - Student Records drawer / Session Records list (download a single record)
import msuSeal from "../assets/officialForm/msuSealDataUri.js";
import guidanceLogo from "../assets/officialForm/guidanceLogoDataUri.js";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s) =>
  (s ?? "").toString().replace(/[&<>"']/g, (c) => ESC_MAP[c]);

const formatLine = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return escapeHtml(value).replace(/\n/g, "<br/>");
};

const checkbox = (checked) => (checked ? "☑" : "☐");

const formatDateOnly = (value) => {
  if (!value) return "—";
  const iso = typeof value === "string" ? value.split("T")[0] : value;
  return iso || "—";
};

// Checkbox helper for the print layout (bordered span instead of a Unicode
// glyph, since ☐/☑ render inconsistently across browsers/printers).
const cb = (isChecked) =>
  `<span style="display:inline-block; width:11px; height:11px; border:1px solid #000; text-align:center; line-height:11px; font-size:9px; margin-right:3px;">${
    isChecked ? "X" : "&nbsp;"
  }</span>`;

const ROUTINE_ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

// Normalize either:
//   - a raw counseling_sessions row (camel/snake case)
//   - a report_recipients payload (already flat snapshot)
// into a common shape used by buildReportHTML.
export function normalizeSessionReport(input = {}) {
  const get = (camel, snake) => input[camel] ?? input[snake];
  let formData = get("formData", "form_data");
  if (typeof formData === "string") {
<<<<<<< HEAD
    try { formData = JSON.parse(formData); } catch { formData = null; }
=======
    try {
      formData = JSON.parse(formData);
    } catch {
      formData = null;
    }
>>>>>>> proper-and-printable-counseling-form
  }
  const reason = formData?.reason || {};
  return {
    studentName: get("studentName", "student_name"),
    studentCollege: get("studentCollege", "student_college"),
    studentNumber: get("studentNumber", "student_number"),
    counselorName: get("counselorName", "counselor_name"),
    sessionDate: get("sessionDate", "session_date"),
    presentingConcern: get("presentingConcern", "presenting_concern"),
    goals: get("goals", "goals"),
    summary: get("summary", "summary"),
    plan: get("plan", "plan"),
    comments: get("comments", "comments"),
    nextSession: get("nextSession", "next_session"),
    counselorSignature: get("counselorSignature", "counselor_signature"),
    finalizedAt: get("finalizedAt", "finalized_at"),
    reasonRoutine: !!reason.routine,
    reasonRoutineNth: reason.routineNth || "",
    reasonStudentInitiated: !!reason.studentInitiated,
    reasonInstituteInitiated: !!reason.instituteInitiated,
  };
}

const LETTERHEAD_STYLES = `
    body { font-family: 'Times New Roman', Georgia, serif; color: #111; line-height: 1.4; padding: 24px 32px; font-size: 11pt; }
    .letterhead-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    .letterhead-table td { vertical-align: middle; padding: 0 6px; }
    .letterhead-seal { width: 78px; text-align: center; }
    .letterhead-seal img { height: 64px; }
    .letterhead-text { text-align: center; }
    .letterhead-text .uni { font-weight: 700; font-size: 13pt; letter-spacing: 0.3px; }
    .letterhead-text div { font-size: 10.5pt; }
    .letterhead-rule { border-top: 2px solid #111; margin-bottom: 4px; }
    .doc-control { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 10px; }
    .doc-control td { border: 1px solid #999; padding: 2px 6px; }
    .doc-control td.label { font-weight: 600; width: 14%; }
    .doc-control td.value { width: 36%; }
    .form-title { text-align: center; font-weight: 700; font-size: 13pt; letter-spacing: 0.5px; margin: 4px 0 12px; text-transform: uppercase; border-top: 1px solid #111; border-bottom: 1px solid #111; padding: 4px 0; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11pt; }
    .info-table td { padding: 3px 0; }
    .section-label { font-weight: 700; margin: 12px 0 3px; }
    .section-body { margin: 0 0 4px; min-height: 16px; }
    .reason-line { margin: 2px 0; }
    table.data-table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 10pt; }
    table.data-table th, table.data-table td { border: 1px solid #999; padding: 5px 7px; text-align: left; vertical-align: top; }
    table.data-table th { background: #f2f2f2; font-weight: 700; }
    .signature-block { margin-top: 40px; }
    .signature-line { border-top: 1px solid #111; width: 280px; margin: 28px 0 2px; }
    .signature-caption { font-size: 9.5pt; }
    @media print { body { padding: 0 18px; } }
`;

function renderLetterhead() {
  return `
  <table class="letterhead-table">
    <tr>
      <td class="letterhead-seal"><img src="${msuSeal}" alt="MSU seal" /></td>
      <td class="letterhead-text">
        <div class="uni">MINDANAO STATE UNIVERSITY &ndash; MAIN CAMPUS</div>
        <div>Division of Student Affairs</div>
        <div>Guidance and Counseling Section</div>
      </td>
      <td class="letterhead-seal"><img src="${guidanceLogo}" alt="Guidance and Counseling logo" /></td>
    </tr>
  </table>
  <div class="letterhead-rule"></div>`;
}

function renderDocControl({ dateLabel = "—" } = {}) {
  return `
  <table class="doc-control">
    <tr>
      <td class="label">Doc. Code:</td><td class="value">MSU DSA GCS Form 3.3</td>
      <td class="label">Page No.</td><td class="value">Page 1</td>
    </tr>
    <tr>
      <td class="label">Issue Date</td><td class="value">04/04/2024</td>
      <td class="label">Date:</td><td class="value">${escapeHtml(dateLabel)}</td>
    </tr>
    <tr>
      <td class="label">Revision No.</td><td class="value">0</td>
      <td class="label">Control No.</td><td class="value">&nbsp;</td>
    </tr>
  </table>`;
}

// A college-wide summary payload (type: "college_summary") has a different
// shape than a per-student session report, so it renders its own document.
function buildCollegeSummaryHTML(report, { title } = {}) {
  const t = report.totals || {};
  const generated = report.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString()
    : "—";
  const docTitle = title || `College Summary — ${report.college || ""}`;
  const sessions = Array.isArray(report.sessions) ? report.sessions : [];

  const sessionRows = sessions.length
    ? sessions
        .map(
          (s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(formatDateOnly(s.sessionDate))}</td>
          <td>${formatLine(s.presentingConcern)}</td>
          <td>${formatLine(s.summary)}</td>
          <td>${formatLine(s.plan)}</td>
          <td>${escapeHtml(s.nextSession === "termination" ? "Termination" : "Follow-up")}</td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="6" style="text-align:center;color:#666;">No finalized sessions on file for this college yet.</td></tr>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docTitle)}</title>
  <style>${LETTERHEAD_STYLES}</style>
</head>
<body>
  ${renderLetterhead()}
  ${renderDocControl({ dateLabel: generated })}
  <div class="form-title">${escapeHtml(docTitle)}</div>

  <table class="info-table">
    <tr><td><strong>College:</strong> ${formatLine(report.college)}</td><td><strong>Students enrolled:</strong> ${formatLine(report.studentCount)}</td></tr>
    <tr><td colspan="2"><strong>Prepared by:</strong> ${formatLine(report.counselorName)} &nbsp; <strong>Date prepared:</strong> ${escapeHtml(generated)}</td></tr>
  </table>

  <div class="section-label">Counseling Activity Overview</div>
  <table class="data-table">
    <tr><th>Total sessions</th><th>Active cases</th><th>Completed</th></tr>
    <tr><td>${formatLine(t.totalSessions)}</td><td>${formatLine(t.activeCases)}</td><td>${formatLine(t.completed)}</td></tr>
  </table>

  <div class="section-label">Individual Session Summaries (student names withheld)</div>
  <table class="data-table">
    <thead>
      <tr><th>#</th><th>Session date</th><th>Reason</th><th>Summary</th><th>Plan of action</th><th>Next step</th></tr>
    </thead>
    <tbody>
      ${sessionRows}
    </tbody>
  </table>

  <div class="section-label">Counselor's Summary</div>
  <p class="section-body">${formatLine(report.narrative)}</p>

  <div class="signature-block">
    <div class="signature-line"></div>
    <div class="signature-caption">${formatLine(report.counselorName)}<br/>Signature of Counselor</div>
  </div>
</body>
</html>`;
}

export function buildReportHTML(report, opts = {}) {
  if (report?.type === "college_summary") return buildCollegeSummaryHTML(report, opts);
  const { title = "Student Counseling Form" } = opts;
  const r = normalizeSessionReport(report);
<<<<<<< HEAD
  const date = formatDateOnly(r.sessionDate);
  const isFollowup = (r.nextSession || "followup") !== "termination";
=======
  const date =
    r.sessionDate && typeof r.sessionDate === "string"
      ? r.sessionDate.split("T")[0]
      : r.sessionDate || "—";
  const isFollowup = (r.nextSession || "followup") !== "termination";

  // Construct absolute paths for logos so they load in the print popup
  // (mirrors the pattern used by utils/inventoryReport.js for the
  // Inventory form's official MSU DSA letterhead).
  const msuLogoUrl = `${window.location.origin}/msu-logo.png`;
  const dsaLogoUrl = `${window.location.origin}/dsa-logo.png`;
  const guidanceLogoUrl = `${window.location.origin}/guidance-logo.jpg`;

  const normalizedNth = (r.reasonRoutineNth || "").trim().toLowerCase();
  const matchedNthIndex = ROUTINE_ORDINALS.findIndex((o) => o.toLowerCase() === normalizedNth);
  const routineOverflow = r.reasonRoutineNth && matchedNthIndex === -1 ? r.reasonRoutineNth : "";
  const routineBoxes = ROUTINE_ORDINALS.map((o, i) => `${cb(i === matchedNthIndex)}${o}`).join(" ");
>>>>>>> proper-and-printable-counseling-form

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
<<<<<<< HEAD
  <style>${LETTERHEAD_STYLES}</style>
</head>
<body>
  ${renderLetterhead()}
  ${renderDocControl({ dateLabel: date })}
  <div class="form-title">Student Counseling Form</div>

  <table class="info-table">
    <tr>
      <td style="width:65%"><strong>Student's Name:</strong> ${formatLine(r.studentName)}</td>
      <td><strong>Date:</strong> ${escapeHtml(date)}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>Counselor's Name:</strong> ${formatLine(r.counselorName)}</td>
    </tr>
  </table>

  <div class="section-label">1. REASON FOR COUNSELING:</div>
  <p class="reason-line">
    ${checkbox(r.reasonRoutine)} Routine${r.reasonRoutineNth ? ` (${escapeHtml(r.reasonRoutineNth)} visit)` : ""}
    &nbsp;&nbsp;&nbsp; ${checkbox(r.reasonStudentInitiated)} Student Initiated
    &nbsp;&nbsp;&nbsp; ${checkbox(r.reasonInstituteInitiated)} Institute Initiated
  </p>
  <p class="reason-line">Identify reason: ${formatLine(r.presentingConcern)}</p>

  <div class="section-label">2. Goals:</div>
  <p class="section-body">${formatLine(r.goals)}</p>

  <div class="section-label">3. Summary of Counseling / Key Points of Discussion:</div>
  <p class="section-body">${formatLine(r.summary)}</p>

  <div class="section-label">4. Plan of Action:</div>
  <p class="section-body">${formatLine(r.plan)}</p>

  <div class="section-label">5. Counselor's Comments:</div>
  <p class="section-body">${formatLine(r.comments)}</p>

  <p class="reason-line"><strong>Next Counseling Session:</strong>
    &nbsp; ${checkbox(isFollowup)} Follow-up
    &nbsp;&nbsp;&nbsp; ${checkbox(!isFollowup)} Termination
  </p>

  <div class="signature-block">
    <div class="signature-line"></div>
    <div class="signature-caption">${formatLine(r.counselorSignature)}<br/>Signature of Counselor</div>
=======
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    body { font-family: 'Times New Roman', Georgia, serif; color: #111; line-height: 1.35; padding: 0; margin: 0; font-size: 10.5pt; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; background: #c3d69b; }
    .header-table td { padding: 6px 8px; vertical-align: middle; }
    .header-logo { width: 70px; text-align: center; }
    .header-logo img { height: 56px; }
    .header-text { text-align: center; }
    .header-text .uni { font-weight: 700; font-size: 10.5pt; }
    .header-text .dsa { font-size: 9pt; }
    .header-text .gcs { font-weight: 800; font-size: 14pt; margin-top: 1px; }
    .doc-control { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 10px; }
    .doc-control td { border: 1px solid #999; padding: 2px 6px; }
    .doc-control td.label { font-weight: 600; width: 16%; }
    .doc-control td.value { width: 34%; }
    .form-title { text-align: center; font-weight: 700; font-size: 13pt; margin: 2px 0 10px; text-transform: uppercase; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5pt; }
    .info-table td { border: 1px solid #000; padding: 4px 6px; }
    .section-label { font-weight: 700; margin: 8px 0 2px; }
    .section-body { margin: 0 0 4px; min-height: 14px; white-space: pre-wrap; }
    .reason-line { margin: 2px 0 2px 16px; }
    .routine-boxes { font-size: 9.5pt; white-space: nowrap; }
    .signature-block { margin-top: 36px; text-align: right; }
    .signature-line { border-top: 1px solid #000; width: 240px; margin: 0 0 0 auto; padding-top: 2px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td class="header-logo"><img src="${msuLogoUrl}" alt="MSU seal" onerror="this.style.display='none'" /></td>
      <td class="header-text">
        <div class="uni">MINDANAO STATE UNIVERSITY &ndash; MAIN CAMPUS</div>
        <div class="dsa">Division of Student Affairs</div>
        <div class="gcs">Guidance and Counseling Section</div>
      </td>
      <td class="header-logo"><img src="${dsaLogoUrl}" alt="Division of Student Affairs logo" onerror="this.style.display='none'" /></td>
      <td class="header-logo"><img src="${guidanceLogoUrl}" alt="Guidance and Counseling logo" onerror="this.style.display='none'" /></td>
    </tr>
  </table>

  <table class="doc-control">
    <tr>
      <td class="label">Doc. Code:</td><td class="value">MSU DSA GCS Form 3.3</td>
      <td class="label">Page No.</td><td class="value">Page 1</td>
    </tr>
    <tr>
      <td class="label">Issue Date</td><td class="value">04/04/2024</td>
      <td class="label">Date:</td><td class="value">${escapeHtml(date)}</td>
    </tr>
    <tr>
      <td class="label">Revision No.</td><td class="value">0</td>
      <td class="label">Control No.</td><td class="value">&nbsp;</td>
    </tr>
  </table>

  <div class="form-title">Student Counseling Form</div>

  <table class="info-table">
    <tr>
      <td style="width:65%"><strong>Student's Name:</strong> ${formatLine(r.studentName)}</td>
      <td><strong>Date:</strong> ${escapeHtml(date)}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>Counselor's Name:</strong> ${formatLine(r.counselorName)}</td>
    </tr>
  </table>

  <div class="section-label">1. REASON FOR COUNSELING:</div>
  <p class="reason-line">
    ${cb(r.reasonRoutine)} Routine
    (<span class="routine-boxes">${routineBoxes}</span>&nbsp;...&nbsp;<span style="display:inline-block;border-bottom:1px solid #000;min-width:40px;">${escapeHtml(routineOverflow)}</span>)
  </p>
  <p class="reason-line">${cb(r.reasonStudentInitiated)} Student Initiated</p>
  <p class="reason-line">${cb(r.reasonInstituteInitiated)} Institute Initiated</p>
  <div class="section-label">Identify reason:</div>
  <p class="section-body">${formatLine(r.presentingConcern)}</p>

  <div class="section-label">2. Goals:</div>
  <p class="section-body">${formatLine(r.goals)}</p>

  <div class="section-label">3. Summary of Counseling/Key Points of Discussion:</div>
  <p class="section-body">${formatLine(r.summary)}</p>

  <div class="section-label">4. Plan of Action:</div>
  <p class="section-body">${formatLine(r.plan)}</p>

  <div class="section-label">5. Counselor's Comments:</div>
  <p class="section-body">${formatLine(r.comments)}</p>

  <p class="section-label">6. Next Counseling Session (${cb(isFollowup)} Follow-up &nbsp; ${cb(!isFollowup)} Termination):</p>

  <div class="signature-block">
    <div class="signature-line">Signature of Counselor</div>
>>>>>>> proper-and-printable-counseling-form
  </div>
</body>
</html>`;
}

function safeFileBase(report) {
  if (report?.type === "college_summary") {
    const college = (report.college || "college").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
    const date = (report.generatedAt || new Date().toISOString()).split("T")[0];
    return `college-summary_${college}_${date}`.toLowerCase();
  }
  const r = normalizeSessionReport(report);
  const name = (r.studentName || "session").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  const date =
    r.sessionDate && typeof r.sessionDate === "string"
      ? r.sessionDate.split("T")[0]
      : new Date().toISOString().split("T")[0];
  return `session-report_${name}_${date}`.toLowerCase();
}

export function downloadReportAsDocx(report, opts = {}) {
  const html = buildReportHTML(report, opts);
  // Word reads HTML files served as application/msword with a .doc extension
  // (the common "Word-compatible export" trick — no library required).
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFileBase(report)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// Opens a print window pre-populated with the report HTML. The user picks
// "Save as PDF" from the browser print dialog — works in Chrome, Edge,
// Firefox, Safari without an external library.
export function downloadReportAsPdf(report, opts = {}) {
  const html = buildReportHTML(report, opts);
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site to download as PDF.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give the new window a tick to render before triggering print.
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* user cancelled */
    }
  }, 250);
}
