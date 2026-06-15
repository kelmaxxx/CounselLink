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

// Normalize either:
//   - a raw counseling_sessions row (camel/snake case)
//   - a report_recipients payload (already flat snapshot)
// into a common shape used by buildReportHTML.
export function normalizeSessionReport(input = {}) {
  const get = (camel, snake) => input[camel] ?? input[snake];
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
  const { title = "Student Counseling Session Report" } = opts;
  const r = normalizeSessionReport(report);
  const date =
    r.sessionDate && typeof r.sessionDate === "string"
      ? r.sessionDate.split("T")[0]
      : r.sessionDate || "—";

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
  <div class="subtitle">CounselLink &middot; ${escapeHtml(date)}</div>

  <div class="section-heading">Student</div>
  <table>
    ${row("Name", r.studentName)}
    ${row("Student No.", r.studentNumber)}
    ${row("College", r.studentCollege)}
  </table>

  <div class="section-heading">Session</div>
  <table>
    ${row("Session date", date)}
    ${row("Counselor", r.counselorName)}
    ${row("Next session", r.nextSession)}
    ${r.finalizedAt ? row("Finalized at", new Date(r.finalizedAt).toLocaleString()) : ""}
  </table>

  <div class="section-heading">1. Presenting concern</div>
  <p>${formatLine(r.presentingConcern)}</p>

  <div class="section-heading">2. Goals</div>
  <p>${formatLine(r.goals)}</p>

  <div class="section-heading">3. Summary / key points of discussion</div>
  <p>${formatLine(r.summary)}</p>

  <div class="section-heading">4. Plan of action</div>
  <p>${formatLine(r.plan)}</p>

  <div class="section-heading">5. Counselor's comments</div>
  <p>${formatLine(r.comments)}</p>

  <div class="signature">
    <strong>Counselor signature:</strong> ${formatLine(r.counselorSignature)}
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
