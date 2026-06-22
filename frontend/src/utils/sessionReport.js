// Builds a printable / Word-compatible representation of an individual student
// counseling Session Report. Used by:
//   - Counselor Reports page (view + download per-student report sent to rep)
//   - Rep Reports page (download received per-student report)
//   - Student Records drawer / Session Records list (download a single record)

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s) =>
  (s ?? "").toString().replace(/[&<>"']/g, (c) => ESC_MAP[c]);

const formatLine = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return escapeHtml(value).replace(/\n/g, "<br/>");
};

const row = (label, value) =>
  `<tr>
     <td style="padding:8px;border:1px solid #ddd;font-weight:600;width:30%;background:#fafafa;">${escapeHtml(
       label
     )}</td>
     <td style="padding:8px;border:1px solid #ddd;">${formatLine(value)}</td>
   </tr>`;

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
    try {
      formData = JSON.parse(formData);
    } catch {
      formData = null;
    }
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

// A college-wide summary payload (type: "college_summary") has a different
// shape than a per-student session report, so it renders its own document.
function buildCollegeSummaryHTML(report, { title = "College Counseling Summary" } = {}) {
  const t = report.totals || {};
  const generated = report.generatedAt
    ? new Date(report.generatedAt).toLocaleString()
    : "—";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: 'Times New Roman', Georgia, serif; color: #111; line-height: 1.45; padding: 24px; }
    h1 { font-size: 18pt; text-align: center; margin: 0 0 4px; }
    .subtitle { text-align: center; color: #555; font-size: 10pt; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11pt; }
    .section-heading { font-size: 12pt; font-weight: 700; margin: 18px 0 6px; border-bottom: 1px solid #999; padding-bottom: 2px; }
    .signature { margin-top: 32px; font-size: 11pt; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle">CounselLink &middot; Generated ${escapeHtml(generated)}</div>

  <div class="section-heading">College</div>
  <table>
    ${row("College", report.college)}
    ${row("Students enrolled", report.studentCount)}
    ${row("Prepared by", report.counselorName)}
  </table>

  <div class="section-heading">Counseling activity</div>
  <table>
    ${row("Total sessions", t.totalSessions)}
    ${row("Active cases", t.activeCases)}
    ${row("Completed", t.completed)}
  </table>

  <div class="section-heading">Counselor's summary</div>
  <p>${formatLine(report.narrative)}</p>

  <div class="signature">
    <strong>Prepared by:</strong> ${formatLine(report.counselorName)}
  </div>
</body>
</html>`;
}

export function buildReportHTML(report, opts = {}) {
  if (report?.type === "college_summary") return buildCollegeSummaryHTML(report, opts);
  const { title = "Student Counseling Form" } = opts;
  const r = normalizeSessionReport(report);
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

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
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
