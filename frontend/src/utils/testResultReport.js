// src/utils/testResultReport.js
//
// Builds the psychological test result document a student sees on their
// "My Records" page — same official MSU DSA letterhead as the Student
// Counseling Form (see utils/sessionReport.js) and the appointment slip
// (utils/appointmentSlip.js), reused here so all three look consistent.
// Saved straight to a real .pdf file (no print dialog).
import { OFFICIAL_HEADER_STYLES, buildOfficialHeaderHTML, resolveSignatureDataUrl } from "./sessionReport.js";
import { saveHtmlAsPdfFile } from "./htmlToPdf.js";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s) => (s ?? "").toString().replace(/[&<>"']/g, (c) => ESC_MAP[c]);
const formatLine = (value) => (value === null || value === undefined || value === "" ? "—" : escapeHtml(value).replace(/\n/g, "<br/>"));

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
};

function buildTestResultHTML(result, { studentName, signatureImageUrl, attachmentImageUrl } = {}) {
  const docTitle = "Psychological Test Result";
  const testName = result.testName ?? result.test_name ?? "";
  const completedRaw = result.completedDate ?? result.completed_date ?? null;
  const counselorName =
    result.counselorName ?? result.counselor_name ?? "";
  const attachedName = result.resultFileName ?? result.result_file_name ?? "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docTitle)}</title>
  <style>
    body { font-family: 'Times New Roman', Georgia, serif; color: #111; line-height: 1.35; padding: 0; margin: 0; font-size: 10.5pt; background: #fff; }
    .pdf-page { padding: 12mm 14mm; box-sizing: border-box; background: #fff; }
    ${OFFICIAL_HEADER_STYLES}
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5pt; }
    .info-table td { border: 1px solid #000; padding: 4px 6px; }
    .info-table td.label { font-weight: 700; width: 32%; }
    .section-label { font-weight: 700; margin: 10px 0 2px; }
    .section-body { margin: 0 0 4px; min-height: 14px; white-space: pre-wrap; }
    .signature-block { margin-top: 48px; text-align: right; }
    .signature-line { border-top: 1px solid #000; width: 240px; margin: 0 0 0 auto; padding-top: 2px; }
    .signature-img { height: 46px; display: block; margin: 0 0 0 auto; }
    .signature-name { font-size: 10.5pt; font-weight: 700; padding-top: 2px; }
  </style>
</head>
<body>
  <div class="pdf-page">
  ${buildOfficialHeaderHTML({ docCode: "Psychological Test Result", date: formatDate(completedRaw) })}

  <div class="form-title">${escapeHtml(docTitle)}</div>

  <table class="info-table">
    <tr>
      <td class="label">Student's Name</td><td>${formatLine(studentName)}</td>
    </tr>
    <tr>
      <td class="label">Test</td><td>${formatLine(testName)}</td>
    </tr>
    <tr>
      <td class="label">Completed</td><td>${formatDate(completedRaw)}</td>
    </tr>
    <tr>
      <td class="label">Counselor</td><td>${formatLine(counselorName)}</td>
    </tr>
  </table>

  ${result.summary ? `<div class="section-label">Summary:</div><p class="section-body">${formatLine(result.summary)}</p>` : ""}
  ${result.recommendations ? `<div class="section-label">Recommendations:</div><p class="section-body">${formatLine(result.recommendations)}</p>` : ""}

  ${attachmentImageUrl ? `<div class="section-label">Attached file${attachedName ? ` (${escapeHtml(attachedName)})` : ""}:</div><p class="section-body"><img src="${attachmentImageUrl}" style="max-width:100%;border:1px solid #999;" alt="Attached test file" /></p>` : attachedName ? `<div class="section-label">Attached file:</div><p class="section-body">${escapeHtml(attachedName)} (view the original file from My Records)</p>` : ""}

  <div class="signature-block">
    ${signatureImageUrl ? `<img class="signature-img" src="${signatureImageUrl}" alt="Counselor signature" />` : ""}
    <div class="signature-line">${formatLine(counselorName)}</div>
    <div style="font-size:9pt;color:#444;">Signature of Counselor</div>
  </div>
  </div>
</body>
</html>`;
}

const safeFileBase = (testName, studentName) =>
  `test_result_${(testName || studentName || "result").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}`.toLowerCase();

export async function saveTestResultAsPdfFile(result, opts = {}) {
  const signatureImageUrl =
    opts.signatureImageUrl ||
    (await resolveSignatureDataUrl(
      opts.signatureUrl ||
        result?.counselorSignatureUrl ||
        result?.counselor_signature_url ||
        result?.counselor_signatureUrl
    ));
  // Inline the counselor's uploaded attachment so the saved PDF carries the
  // same evidence both parties saw on screen. Only images can be embedded —
  // PDFs/Word docs fall back to a filename note in buildTestResultHTML.
  // resolveSignatureDataUrl is a generic fetch-to-dataURL helper despite its name.
  let attachmentImageUrl = null;
  const fileUrl = result?.resultFileUrl ?? result?.result_file_url ?? null;
  const fileType = result?.resultFileType ?? result?.result_file_type ?? "";
  if (fileUrl && (/^image\//i.test(fileType) || /\.(png|jpe?g|webp|gif)$/i.test(fileUrl))) {
    attachmentImageUrl = await resolveSignatureDataUrl(fileUrl);
  }
  const html = buildTestResultHTML(result, { ...opts, signatureImageUrl, attachmentImageUrl });
  const testName = result.testName ?? result.test_name ?? opts.studentName;
  await saveHtmlAsPdfFile(html, `${safeFileBase(testName, opts.studentName)}.pdf`, { pageWidthIn: 8.27, pageHeightIn: 11.69 });
}
