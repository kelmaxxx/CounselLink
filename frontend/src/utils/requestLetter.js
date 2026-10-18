// Builds the formal, print-ready REQUEST LETTER + DATA PRIVACY NOTICE used by
// the college data-request flow (adviser/client requirement):
//   - College rep files a signed letter (individual / department / college).
//   - Counselor reviews the letter, approves/declines with remarks + signature.
//   - Rep agrees to the RA 10173 privacy notice before opening released data.
// Reuses the official MSU/DSA/Guidance header + PDF pipeline from sessionReport.
import {
  OFFICIAL_HEADER_STYLES,
  buildOfficialHeaderHTML,
  resolveSignatureDataUrl,
} from "./sessionReport.js";
import { saveHtmlAsPdfFile } from "./htmlToPdf.js";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) =>
  (s ?? "").toString().replace(/[&<>"']/g, (c) => ESC_MAP[c]);
const line = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  return esc(v).replace(/\n/g, "<br/>");
};
const fmtDate = (v) => {
  if (!v) return "—";
  try {
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return esc(String(v).split("T")[0]);
    return esc(d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }));
  } catch {
    return esc(String(v));
  }
};

export const LETTER_SUBJECTS = {
  individual: "Request for Individual Counseling Data",
  department: "Request for Department Counseling Data",
  college: "Request for College Counseling Data",
};

export const subjectForType = (t) => LETTER_SUBJECTS[t] || LETTER_SUBJECTS.individual;

// Merge a report_requests list row (with letter_snapshot + live status cols)
// into one flat letter object the HTML builder + preview understand.
export function letterFromRequest(row = {}) {
  let snap = row.letter_snapshot ?? row.letterSnapshot ?? null;
  if (typeof snap === "string") {
    try { snap = JSON.parse(snap); } catch { snap = null; }
  }
  snap = snap && typeof snap === "object" ? snap : {};
  const type = row.request_type || snap.scopeType || "individual";
  return {
    subject: snap.subject || subjectForType(type),
    scopeType: type,
    studentName: snap.studentName ?? row.student_name ?? null,
    studentIdentifier: snap.studentIdentifier ?? row.student_identifier ?? null,
    studentProgram: snap.studentProgram ?? null,
    studentDepartment: snap.studentDepartment ?? null,
    studentCollege: snap.studentCollege ?? null,
    department: snap.department ?? row.department ?? null,
    college: snap.college ?? (type === "college" ? row.requesterCollege : null) ?? null,
    reason: snap.reason ?? row.reason ?? "",
    requesterName: snap.requesterName ?? row.requesterName ?? "",
    requesterPosition: snap.requesterPosition ?? row.requesterPosition ?? "College Representative",
    requesterDepartment: snap.requesterDepartment ?? row.requesterDepartment ?? null,
    requesterCollege: snap.requesterCollege ?? row.requesterCollege ?? "",
    repSignatureUrl: snap.repSignatureUrl ?? row.rep_signature_url ?? row.requesterSignatureUrl ?? null,
    requestedAt: snap.requestedAt ?? row.created_at ?? null,
    status: row.status ?? "pending",
    remarks: row.response_note ?? null,
    counselorName: row.counselorName ?? null,
    counselorPosition: row.counselorPosition ?? null,
    counselorSignatureUrl: row.counselorSignatureUrl ?? null,
    respondedAt: row.responded_at ?? null,
    privacyAckAt: row.privacy_ack_at ?? null,
  };
}

// Draft letter for the live preview on the rep's request form.
export function draftLetterFromForm(form = {}, currentUser = {}, student = null) {
  const type = form.requestType || "individual";
  return {
    subject: subjectForType(type),
    scopeType: type,
    studentName: student?.name ?? null,
    studentIdentifier: student?.studentId ?? student?.student_id ?? null,
    studentProgram: student?.program ?? null,
    studentDepartment: student?.department ?? null,
    studentCollege: student?.college ?? null,
    department: type === "department" ? form.department || null : null,
    college: type === "college" ? currentUser?.college || null : null,
    reason: form.reason || "",
    requesterName: currentUser?.name || "",
    requesterPosition: currentUser?.position || "College Representative",
    requesterDepartment: currentUser?.department || null,
    requesterCollege: currentUser?.college || "",
    repSignatureUrl: currentUser?.signatureUrl || null,
    requestedAt: new Date().toISOString(),
    status: "pending",
    remarks: null,
    counselorName: null,
    counselorPosition: null,
    counselorSignatureUrl: null,
    respondedAt: null,
    privacyAckAt: null,
  };
}

const LETTER_STYLES = `
  ${OFFICIAL_HEADER_STYLES}
  body { font-family: 'Times New Roman', Georgia, serif; color: #111; line-height: 1.45; font-size: 11pt; background: #fff; margin: 0; padding: 0; }
  .pdf-page { padding: 12mm 14mm; box-sizing: border-box; background: #fff; }
  .doc-title { text-align: center; font-weight: 700; font-size: 14pt; letter-spacing: 1px; margin: 2px 0 10px; text-transform: uppercase; }
  .meta-row { display: flex; justify-content: space-between; font-size: 11pt; margin: 2px 0; }
  .subject-line { margin: 8px 0; font-size: 11pt; }
  .salutation { margin: 10px 0 4px; }
  .body-text { margin: 4px 0 8px; text-align: justify; }
  .section-head { font-weight: 700; margin: 12px 0 4px; }
  .scope-box { border: none; padding: 0; margin: 4px 0 8px; font-size: 11pt; }
  .reason-box { border: none; padding: 0; margin: 4px 0 8px; min-height: auto; white-space: pre-wrap; text-align: justify; }
  .assurance { text-align: justify; margin: 4px 0 8px; }
  .sign-grid { display: flex; justify-content: flex-end; margin-top: 26px; }
  .sign-block { text-align: center; width: 300px; }
  .sign-img { height: 52px; display: block; margin: 0 auto; }
  .sign-line { border-top: 1px solid #000; margin-top: 2px; padding-top: 2px; font-weight: 700; }
  .dsa-box { border: 2px solid #000; margin-top: 18px; padding: 8px 10px; }
  .dsa-title { text-align: center; font-weight: 700; margin-bottom: 6px; }
  .check { display: inline-block; width: 12px; height: 12px; border: 1px solid #000; text-align: center; line-height: 12px; font-size: 10px; margin-right: 4px; }
  .ack-line { margin-top: 10px; font-size: 10pt; }
`;

const cb = (on) => `<span class="check">${on ? "X" : "&nbsp;"}</span>`;

function scopeSection(l) {
  if (l.scopeType === "department") {
    return `<div class="scope-box"><strong>Specific Department</strong><br/>Department Name: ${line(l.department)}<br/>College: ${line(l.requesterCollege)}</div>`;
  }
  if (l.scopeType === "college") {
    return `<div class="scope-box"><strong>Entire College</strong><br/>College Name: ${line(l.college || l.requesterCollege)}</div>`;
  }
  return `<div class="scope-box"><strong>Specific Student</strong><br/>Student Name: ${line(l.studentName)}<br/>Student ID: ${line(l.studentIdentifier)}<br/>Department/Program: ${line(l.studentDepartment || l.studentProgram)}${l.studentProgram && l.studentDepartment ? ` — ${line(l.studentProgram)}` : ""}</div>`;
}

export function buildRequestLetterHTML(letter = {}, opts = {}) {
  const l = { ...letter };
  const dateStr = fmtDate(l.requestedAt);
  const decided = ["fulfilled", "declined"].includes(l.status);
  const approved = l.status === "fulfilled";
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><title>${esc(l.subject || "Request Letter")}</title>
<style>@page { size: A4 portrait; margin: 0; } ${LETTER_STYLES}</style></head>
<body><div class="pdf-page">
  ${buildOfficialHeaderHTML({ docCode: "MSU DSA GCS Request Letter", pageLabel: "Page 1", date: typeof l.requestedAt === "string" ? l.requestedAt.split("T")[0] : dateStr })}
  <div class="doc-title">Request Letter</div>
  <div class="meta-row"><span>Date: ${dateStr}</span></div>
  <div class="subject-line"><strong>To:</strong> The Division of Student Affairs, Mindanao State University – Marawi City<br/><strong>Subject:</strong> ${line(l.subject)}</div>
  <p class="salutation">Dear Counselors,</p>
  <p class="body-text">I respectfully request access to the necessary student counseling-related data for official academic monitoring, student welfare, documentation, or accreditation purposes. The details of my request are provided below.</p>
  <div class="section-head">1. Scope of Request</div>
  ${scopeSection(l)}
  <div class="section-head">2. Reason for Request</div>
  <div class="reason-box">${line(l.reason)}</div>
  <div class="section-head">3. Requested Information</div>
  <p class="assurance">I understand that student counseling records contain confidential information. I agree to comply with applicable university policies and data privacy requirements. I will use the approved information solely for the stated official purpose and will not disclose it to unauthorized individuals.</p>
  <p class="assurance">I acknowledge that this request is subject to review and approval by the authorized DSA personnel before any information is released.</p>
  <p class="body-text">Thank you for your consideration.</p>
  <p>Respectfully yours,</p>
  <div class="sign-grid"><div class="sign-block">
    ${opts.repSignatureImageUrl ? `<img class="sign-img" src="${opts.repSignatureImageUrl}" alt="College representative signature" />` : ""}
    <div class="sign-line">${line(l.requesterName)}</div>
    <div>Name of College Representative</div>
    <div style="margin-top:6px">Date Signed: ${dateStr}</div>
  </div></div>
  <div class="dsa-box">
    <div class="dsa-title">FOR DSA USE ONLY</div>
    <div>${cb(approved)} Approved &nbsp;&nbsp; ${cb(l.status === "declined")} Rejected</div>
    <div style="margin-top:6px">Reviewed/Approved by: ${line(decided ? l.counselorName : "")}</div>
    ${opts.counselorSignatureImageUrl ? `<img class="sign-img" style="margin:4px 0 0 0" src="${opts.counselorSignatureImageUrl}" alt="Counselor signature" />` : ""}
    <div>Date: ${decided && l.respondedAt ? fmtDate(l.respondedAt) : "____________________________"}</div>
    <div>Remarks: ${line(decided ? l.remarks || (approved ? "Approved." : "") : "")}</div>
  </div>
</div></body></html>`;
}

export function buildPrivacyNoticeHTML(letter = {}, opts = {}) {
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><title>Confidentiality and Data Privacy Notice</title>
<style>@page { size: A4 portrait; margin: 0; } ${LETTER_STYLES}</style></head>
<body><div class="pdf-page">
  ${buildOfficialHeaderHTML({ docCode: "MSU DSA GCS Privacy Notice", pageLabel: "Page 1", date: new Date().toISOString().split("T")[0] })}
  <div class="doc-title">Confidentiality and Data Privacy Notice</div>
  <p class="body-text"><strong>Legal Basis:</strong> Republic Act No. 10173, or the Data Privacy Act of 2012.</p>
  <p class="body-text">Your request for student counseling-related data (<strong>${line(letter.subject)}</strong>${letter.studentName ? ` — <strong>${line(letter.studentName)}</strong>` : ""}) has been reviewed and approved by the authorized counselor of the Division of Student Affairs (DSA).</p>
  <p class="body-text">In accordance with the Data Privacy Act of 2012, you are reminded of your responsibility to protect personal and sensitive personal information from unauthorized access, use, or disclosure.</p>
  <p class="body-text">By proceeding, you agree to the following conditions:</p>
  <ol>
    <li>Use the approved data only for the stated and authorized purpose.</li>
    <li>Maintain strict confidentiality and do not share the information with unauthorized persons.</li>
    <li>Do not copy, distribute, or disclose the data beyond the scope of your approved request.</li>
    <li>Comply with applicable data privacy laws and university policies.</li>
  </ol>
  <p class="body-text">Please confirm your agreement before accessing the requested information.</p>
  <p class="ack-line">${cb(!!opts.agreed)} I have read and understood this notice, and I agree to comply with the stated confidentiality and data privacy requirements.</p>
  <div class="sign-grid"><div class="sign-block">
    ${opts.repSignatureImageUrl ? `<img class="sign-img" src="${opts.repSignatureImageUrl}" alt="College representative signature" />` : ""}
    <div class="sign-line">${line(letter.requesterName)}</div>
    <div>${line(letter.requesterPosition)}, ${line(letter.requesterCollege)}</div>
    <div>Date Signed: ${fmtDate(opts.agreedAt || new Date().toISOString())}</div>
  </div></div>
</div></body></html>`;
}

export { resolveSignatureDataUrl };

const safeBase = (s) =>
  `request_letter_${(s || "letter").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}`.toLowerCase();

export async function saveLetterAsPdfFile(letter, opts = {}) {
  const [rep, coun] = await Promise.all([
    opts.repSignatureImageUrl || resolveSignatureDataUrl(letter?.repSignatureUrl),
    opts.counselorSignatureImageUrl || resolveSignatureDataUrl(letter?.counselorSignatureUrl),
  ]);
  const html = buildRequestLetterHTML(letter, {
    ...opts,
    repSignatureImageUrl: rep,
    counselorSignatureImageUrl: coun,
  });
  await saveHtmlAsPdfFile(html, `${safeBase(letter?.subject)}.pdf`, { pageWidthIn: 8.27, pageHeightIn: 11.69 });
}
