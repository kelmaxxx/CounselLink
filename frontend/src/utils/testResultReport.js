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

function buildTestResultHTML(result, { studentName, signatureImageUrl, attachmentNote } = {}) {
  const docTitle = "Psychological Test Result";
  const testName = result.testName ?? result.test_name ?? "";
  const completedRaw = result.completedDate ?? result.completed_date ?? null;
  const counselorName =
    result.counselorName ?? result.counselor_name ?? "";

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
  ${attachmentNote ? `<div class="section-label">Attachment:</div><p class="section-body">${formatLine(attachmentNote)}</p>` : ""}

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

// Fetch the attachment blob. Primary path: authenticated API endpoint
// (/api/test-results/:id/attachment). Fallback: public /uploads URL (works
// in local dev where CORS is same-origin, or when the API is unreachable).
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

async function fetchAttachmentBlob(resultId, token, fallbackUrl) {
  // Try the authenticated API endpoint first.
  if (resultId) {
    try {
      const res = await fetch(`${API_BASE}/api/test-results/${resultId}/attachment`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) return await res.blob();
      // 404 means file is genuinely missing — no point trying the fallback.
      if (res.status === 404) return null;
    } catch {
      // Network error (server down, CORS) — fall through to direct URL below.
    }
  }

  // Fallback: fetch the /uploads URL directly (public static, no auth needed).
  if (fallbackUrl) {
    try {
      const absUrl = /^https?:\/\//i.test(fallbackUrl)
        ? fallbackUrl
        : `${API_BASE}${fallbackUrl}`;
      const res = await fetch(absUrl);
      if (res.ok) return await res.blob();
    } catch {
      // Both paths failed.
    }
  }

  return null;
}

const blobToDataUrl = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });

// Downscale a photo to a print-sane width so the saved PDF stays small.
async function photoToPageImage(dataUrl, maxWidth = 1240) {
  const dims = await new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve({ w: probe.naturalWidth, h: probe.naturalHeight });
    probe.onerror = () => resolve(null);
    probe.src = dataUrl;
  });
  if (!dims) return null;
  if (dims.w <= maxWidth) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = maxWidth;
  canvas.height = Math.round((dims.h / dims.w) * maxWidth);
  const ctx = canvas.getContext("2d");
  const img = await new Promise((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = dataUrl;
  });
  if (!img) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

// Rasterize each page of an attached PDF (cap 10 pages) into page images.
async function rasterizePdfAttachment(blob, maxPages = 10) {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      const { default: workerUrl } = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    }
    const pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
    const pages = [];
    try {
      const n = Math.min(pdf.numPages, maxPages);
      for (let p = 1; p <= n; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
        pages.push(canvas.toDataURL("image/jpeg", 0.92));
        page.cleanup();
      }
    } finally {
      await pdf.destroy().catch(() => undefined);
    }
    return pages;
  } catch (err) {
    console.error("Failed to rasterize attached PDF:", err);
    return [];
  }
}

// Render an attached DOCX into one page image per source page via docx-preview
// (already a dep). breakPages:true emits one <section class="docx"> per page.
async function rasterizeDocxAttachment(blob) {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;top:0;left:-10000px;width:794px;background:#fff;";
  document.body.appendChild(host);
  try {
    const { renderAsync } = await import("docx-preview");
    await renderAsync(blob, host, host, {
      className: "docx",
      inWrapper: true,
      ignoreLastRenderedPageBreak: true,
      breakPages: true,
    });
    const { default: html2canvas } = await import("html2canvas");
    const sections = host.querySelectorAll(".docx-wrapper > section.docx");
    const pages = sections.length ? Array.from(sections) : [host];
    const images = [];
    for (const el of pages) {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      images.push(canvas.toDataURL("image/jpeg", 0.92));
    }
    return images;
  } catch (err) {
    console.error("Failed to rasterize attached DOCX:", err);
    return [];
  } finally {
    host.remove();
  }
}

export async function saveTestResultAsPdfFile(result, opts = {}) {
  const signatureImageUrl =
    opts.signatureImageUrl ||
    (await resolveSignatureDataUrl(
      opts.signatureUrl ||
        result?.counselorSignatureUrl ||
        result?.counselor_signature_url ||
        result?.counselor_signatureUrl
    ));

  // Attachment → its own page(s) after the result page.
  // Fetch via the authenticated API endpoint using the result's id so the
  // server resolves the file path from the DB — no cross-origin /uploads fetch.
  let extraPageImages = [];
  let attachmentNote = null;
  const resultId = result?.id ?? null;
  const fileUrl = result?.resultFileUrl ?? result?.result_file_url ?? null;
  const fileType = result?.resultFileType ?? result?.result_file_type ?? "";
  const attachedName = result?.resultFileName ?? result?.result_file_name ?? "Attached file";
  const token = opts.token ?? null;

  if (resultId && fileUrl) {
    const blob = await fetchAttachmentBlob(resultId, token, fileUrl);
    if (!blob) {
      attachmentNote = `${attachedName} could not be retrieved from the server.`;
    } else if (/^image\//i.test(blob.type) || /^image\//i.test(fileType) || /\.(png|jpe?g|webp|gif)$/i.test(fileUrl)) {
      const page = await photoToPageImage(await blobToDataUrl(blob));
      if (page) extraPageImages = [page];
      else attachmentNote = `${attachedName} could not be rendered.`;
    } else if (/application\/pdf/i.test(blob.type) || /application\/pdf/i.test(fileType) || /\.pdf$/i.test(fileUrl)) {
      extraPageImages = await rasterizePdfAttachment(blob);
      if (!extraPageImages.length) attachmentNote = `${attachedName}: the attached PDF could not be rendered.`;
    } else if (/wordprocessingml|msword/i.test(blob.type) || /wordprocessingml|msword/i.test(fileType) || /\.docx?$/i.test(fileUrl)) {
      extraPageImages = await rasterizeDocxAttachment(blob);
      if (!extraPageImages.length) attachmentNote = `${attachedName}: the attached document could not be rendered — open the original file from the record.`;
    } else {
      attachmentNote = `${attachedName}: open the original file from the record to view it.`;
    }
  }

  const html = buildTestResultHTML(result, { ...opts, signatureImageUrl, attachmentNote });
  const testName = result.testName ?? result.test_name ?? opts.studentName;
  await saveHtmlAsPdfFile(html, `${safeFileBase(testName, opts.studentName)}.pdf`, { pageWidthIn: 8.27, pageHeightIn: 11.69, extraPageImages });
}
