// Counselor-compiled reports: Counseling data, Psychological data, and Student
// Individual Profile. Each report is a flat snapshot (totals + columns + rows)
// so a stored history entry can be re-rendered without re-querying records.
import {
  buildOfficialHeaderHTML,
  OFFICIAL_HEADER_STYLES,
  resolveSignatureDataUrl,
} from "./sessionReport";
import { saveHtmlAsPdfFile } from "./htmlToPdf";
import { isReportableStudent } from "./reportEligibility.js";

export const SEMESTERS = [
  { value: "1st", label: "1st Semester" },
  { value: "2nd", label: "2nd Semester" },
  { value: "midyear", label: "Midyear" },
];

export const REPORT_TYPES = [
  { value: "counseling", label: "Counseling Data" },
  { value: "psychological", label: "Psychological Data" },
  { value: "profile", label: "Student Individual Profile" },
];

// An academic year runs Aug -> Jul; list the current one first.
export function schoolYearOptions(today = new Date()) {
  const start = today.getMonth() + 1 >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  return [0, 1, 2, 3, 4].map((i) => `${start - i}-${start - i + 1}`);
}

export function semesterRange(semester, schoolYear) {
  const [startYear, endYear] = String(schoolYear).split("-").map(Number);
  if (semester === "2nd") {
    return {
      from: `${endYear}-01-01`,
      to: `${endYear}-05-31`,
      label: `2nd Semester ${schoolYear}`,
    };
  }
  if (semester === "midyear") {
    return {
      from: `${endYear}-06-01`,
      to: `${endYear}-07-31`,
      label: `Midyear ${schoolYear}`,
    };
  }
  return {
    from: `${startYear}-08-01`,
    to: `${startYear}-12-31`,
    label: `1st Semester ${schoolYear}`,
  };
}

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC_MAP[c]);
const dash = (v) => (v === null || v === undefined || v === "" ? "—" : esc(v));
const shortDate = (v) => (v ? String(v).split("T")[0] : "—");
const inRange = (date, from, to) => {
  if (!date) return false;
  const d = String(date).split("T")[0];
  return (!from || d >= from) && (!to || d <= to);
};

const REPORT_LABELS = {
  counseling: "Counseling Data Report",
  psychological: "Psychological Data Report",
  profile: "Student Individual Profile",
};

export function buildCompiledPayload({
  type,
  college,
  collegeName,
  counselorName,
  semester,
  schoolYear,
  sessions = [],
  testResults = [],
  inventories = [],
}) {
  const generatedAt = new Date().toISOString();
  const base = {
    type,
    reportLabel: REPORT_LABELS[type],
    college,
    collegeName,
    counselorName,
    generatedAt,
  };

  if (type === "counseling") {
    const { from, to, label } = semesterRange(semester, schoolYear);
    const rows = sessions
      .filter(
        (s) =>
          s.finalizedAt &&
          s.studentCollege === college &&
          inRange(s.sessionDate, from, to) &&
          isReportableStudent(s)
      )
      .sort((a, b) => String(b.sessionDate).localeCompare(String(a.sessionDate)))
      .map((s) => [
        shortDate(s.sessionDate),
        s.studentName || "—",
        s.counselorName || "—",
        s.presentingConcern || "—",
        s.summary || "—",
        s.nextSession === "termination" ? "Termination" : "Follow-up",
      ]);
    const students = new Set(rows.map((r) => r[1]));
    return {
      ...base,
      periodLabel: label,
      dateFrom: from,
      dateTo: to,
      totals: [
        { label: "Counseling sessions", value: rows.length },
        { label: "Students served", value: students.size },
        { label: "Follow-up", value: rows.filter((r) => r[5] === "Follow-up").length },
        { label: "Termination", value: rows.filter((r) => r[5] === "Termination").length },
      ],
      columns: ["Date", "Student", "Counselor", "Presenting concern", "Summary", "Next step"],
      rows,
    };
  }

  if (type === "psychological") {
    const { from, to, label } = semesterRange(semester, schoolYear);
    const rows = testResults
      .filter(
        (r) =>
          r.college === college &&
          inRange(r.completedDate, from, to) &&
          isReportableStudent(r)
      )
      .sort((a, b) => String(b.completedDate).localeCompare(String(a.completedDate)))
      .map((r) => [
        shortDate(r.completedDate),
        r.studentName || "—",
        r.counselorName || "—",
        r.testName || "—",
        r.summary || "—",
        r.recommendations || "—",
      ]);
    const students = new Set(rows.map((r) => r[1]));
    const tests = new Set(rows.map((r) => r[3]));
    return {
      ...base,
      periodLabel: label,
      dateFrom: from,
      dateTo: to,
      totals: [
        { label: "Tests released", value: rows.length },
        { label: "Students tested", value: students.size },
        { label: "Different tests", value: tests.size },
      ],
      columns: ["Date", "Student", "Counselor", "Test", "Summary", "Recommendations"],
      rows,
    };
  }

  const rows = inventories
    .map((inv) => {
      const p = inv.formData?.personal || {};
      return [
        inv.studentName || "—",
        inv.studentNumber || "—",
        [p.course, p.yearLevel].filter(Boolean).join(" · ") || "—",
        [p.emailAddress, p.mobileNo].filter(Boolean).join(" · ") || "—",
        [p.presentAddress, p.hometownAddress].filter(Boolean).join(" · ") || "—",
      ];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));
  return {
    ...base,
    periodLabel: "Current records",
    dateFrom: null,
    dateTo: null,
    totals: [
      { label: "Students with profile", value: rows.length },
      { label: "With contact info", value: rows.filter((r) => r[3] !== "—").length },
    ],
    columns: ["Student", "Student No.", "Course · Year", "Email · Mobile", "Address"],
    rows,
  };
}

const PAGE_ROWS = { counseling: 10, psychological: 10, profile: 16 };

const STYLES = `
  @page { size: A4 portrait; margin: 0; }
  body { font-family: 'Times New Roman', Georgia, serif; color: #111; margin: 0; font-size: 10pt; line-height: 1.3; background: #fff; }
  .pdf-page { padding: 12mm 14mm; box-sizing: border-box; background: #fff; }
  ${OFFICIAL_HEADER_STYLES}
  .meta-table { width: 100%; border-collapse: collapse; margin: 2px 0 10px; font-size: 9.5pt; }
  .meta-table td { padding: 2px 4px; vertical-align: top; }
  .meta-table .label { font-weight: 700; width: 16%; }
  .totals { display: flex; gap: 10px; margin: 0 0 12px; }
  .total { flex: 1; border: 1px solid #999; padding: 6px 8px; text-align: center; }
  .total .n { font-size: 14pt; font-weight: 700; }
  .total .l { font-size: 8pt; color: #444; text-transform: uppercase; letter-spacing: 0.3px; }
  table.data-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  table.data-table th, table.data-table td { border: 1px solid #999; padding: 4px 5px; text-align: left; vertical-align: top; }
  table.data-table th { background: #f2f2f2; font-weight: 700; }
  table.date-first th:first-child, table.date-first td:first-child { white-space: nowrap; }
  table.date-first th:last-child, table.date-first td:last-child { white-space: nowrap; }
  table.profile-table th:nth-child(2), table.profile-table td:nth-child(2) { white-space: nowrap; }
  .continuation { font-size: 9pt; color: #333; margin: 0 0 8px; }
  .signature-block { margin-top: 28px; text-align: right; }
  .signature-line { border-top: 1px solid #111; width: 260px; margin: 0 0 2px auto; }
  .signature-name { font-weight: 700; font-size: 10pt; }
  .signature-caption { font-size: 9pt; color: #333; }
  .signature-img { height: 46px; display: block; margin: 0 0 0 auto; }
`;

export function buildCompiledReportHTML(payload, { signatureImageUrl } = {}) {
  const columns = payload.columns || [];
  const rows = payload.rows || [];
  const perPage = PAGE_ROWS[payload.type] || 12;
  const chunks = [];
  for (let i = 0; i < rows.length; i += perPage) chunks.push(rows.slice(i, i + perPage));
  if (!chunks.length) chunks.push([]);
  const totalPages = chunks.length;
  const date = shortDate(payload.generatedAt);
  const tableHead = `<thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>`;

  const meta = `
    <table class="meta-table">
      <tr>
        <td class="label">College:</td><td>${dash(payload.collegeName || payload.college)}</td>
        <td class="label">Period:</td><td>${dash(payload.periodLabel)}</td>
      </tr>
      <tr>
        <td class="label">Prepared by:</td><td>${dash(payload.counselorName)}</td>
        <td class="label">Generated:</td><td>${esc(date)}</td>
      </tr>
    </table>`;

  const totals = payload.totals?.length
    ? `<div class="totals">${payload.totals
        .map((t) => `<div class="total"><div class="n">${esc(t.value)}</div><div class="l">${esc(t.label)}</div></div>`)
        .join("")}</div>`
    : "";

  const pages = chunks
    .map((chunk, i) => {
      const isLast = i === totalPages - 1;
      const continuation = `<p class="continuation">${dash(payload.collegeName || payload.college)} · ${dash(payload.periodLabel)}</p>`;
      return `
      <div class="pdf-page">
        ${buildOfficialHeaderHTML({
          docCode: "MSU DSA GCS Compiled Report",
          pageLabel: `Page ${i + 1} of ${totalPages}`,
          date,
        })}
        <div class="form-title">${esc(payload.reportLabel)}</div>
        ${i === 0 ? meta + totals : continuation}
        <table class="data-table${payload.type === "profile" ? " profile-table" : " date-first"}">${tableHead}<tbody>${
          chunk
            .map((row) => `<tr>${columns.map((_, ci) => `<td>${dash(row[ci])}</td>`).join("")}</tr>`)
            .join("") || `<tr><td colspan="${columns.length || 1}">No records for this selection.</td></tr>`
        }</tbody></table>
        ${
          isLast
            ? `<div class="signature-block">
                 ${signatureImageUrl ? `<img class="signature-img" src="${signatureImageUrl}" alt="Counselor signature" />` : ""}
                 <div class="signature-line"></div>
                 <div class="signature-name">${dash(payload.counselorName)}</div>
                 <div class="signature-caption">Guidance Counselor</div>
               </div>`
            : ""
        }
      </div>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><title>${esc(payload.reportLabel)}</title><style>${STYLES}</style></head>
<body>${pages}</body>
</html>`;
}

export async function saveCompiledReportAsPdfFile(payload, { signatureUrl } = {}) {
  const signatureImageUrl = await resolveSignatureDataUrl(signatureUrl);
  const html = buildCompiledReportHTML(payload, { signatureImageUrl });
  const base =
    String(`${payload.type}_${payload.college}_${payload.periodLabel || ""}`)
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase() || "compiled_report";
  await saveHtmlAsPdfFile(html, `${base}.pdf`, { pageWidthIn: 8.27, pageHeightIn: 11.69 });
}
