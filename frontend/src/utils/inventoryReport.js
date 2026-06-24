// src/utils/inventoryReport.js
//
// Print / Save-as-PDF for the Student Individual Inventory Record.
//
// To guarantee the printed page is *identical* to the downloadable Word file,
// we don't rebuild the layout in HTML — we render the very same generated .docx
// (from backend/utils/inventory-docx.js, via the /docx endpoint) in the browser
// with docx-preview and send that to the printer. Choosing "Save as PDF" in the
// print dialog then yields a PDF that matches the Word document.
//
// docx-preview is loaded on demand (dynamic import) so it only ships when a user
// actually prints, keeping it out of the main bundle.

const HOST_ID = "inventory-docx-print-host";
const STYLE_ID = "inventory-docx-print-style";

// Injected once: during @media print, hide the whole app and show only the
// rendered document; strip docx-preview's on-screen page chrome (gray gutter,
// drop shadows) so pages print clean on A4.
const PRINT_CSS = `
#${HOST_ID} {
  position: fixed; inset: 0; z-index: -1; opacity: 0; overflow: hidden; pointer-events: none;
}
@media print {
  /* The .docx page already carries the form's own margins as padding, so zero
     the sheet margin to avoid doubling them. */
  @page { size: A4 portrait; margin: 0; }
  body > *:not(#${HOST_ID}) { display: none !important; }
  #${HOST_ID} { position: static; opacity: 1; z-index: auto; overflow: visible; }
  #${HOST_ID} .docx-wrapper { background: none !important; padding: 0 !important; }
  #${HOST_ID} .docx-wrapper > section.docx { box-shadow: none !important; margin: 0 auto !important; }
}
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = PRINT_CSS;
  document.head.appendChild(style);
}

function cleanup(host, onAfter) {
  if (host && host.parentNode) host.parentNode.removeChild(host);
  if (onAfter) window.removeEventListener("afterprint", onAfter);
}

// Renders a generated inventory .docx Blob into an off-screen host and opens the
// browser print dialog. Returns { success, message }.
export async function printInventoryDocxBlob(blob) {
  if (!blob) return { success: false, message: "No document to print" };

  ensureStyle();

  // Fresh host each time so re-prints don't stack old content.
  const existing = document.getElementById(HOST_ID);
  if (existing) existing.remove();
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  try {
    const { renderAsync } = await import("docx-preview");
    await renderAsync(blob, host, host, {
      className: "docx",
      inWrapper: true,
      ignoreLastRenderedPageBreak: true,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
    });
  } catch (err) {
    console.error("Failed to render inventory document for print:", err);
    cleanup(host);
    return { success: false, message: "Could not render the document for printing" };
  }

  const afterPrint = () => cleanup(host, afterPrint);
  window.addEventListener("afterprint", afterPrint);

  // Give the browser a beat to lay out pages and decode embedded logos before
  // the print dialog snapshots the page.
  await new Promise((r) => setTimeout(r, 400));
  try {
    window.print();
  } catch {
    cleanup(host, afterPrint);
  }
  return { success: true };
}

// Kept as an alias for any older call sites/imports.
export const downloadInventoryAsPdf = printInventoryForm;

// "Export PDF" — renders page 1 and page 2 into a hidden iframe, captures
// each as its own canvas, and saves an actual two-page .pdf file straight
// to disk — no print dialog in the way.
//
// Each form is captured and placed on its own jsPDF page deliberately,
// instead of rendering both as one tall canvas and letting a page-break
// calculation slice it: html2canvas's text layout doesn't always match the
// pixel height the same CSS produces in the browser's native print engine,
// so a height-based split is liable to spill onto a 3rd, mostly-blank page.
// One canvas per page is exact by construction — always 2 pages.
//
// The iframe (rather than an off-screen <div>) matters too: html2canvas
// clones and rasterizes starting at (0,0). A <div> pushed off-screen via
// `top: -10000px` sits at a *negative* coordinate in the parent document,
// outside any capturable canvas region, and silently renders as a 0-height
// image. An iframe's contentDocument has its own (0,0)-origin coordinate
// system regardless of where the iframe sits in the parent page.
export async function exportInventoryAsPdfFile(inventoryData, studentProfile = {}, consent = null) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const PAGE_PX_WIDTH = 816; // 8.5in @ 96dpi
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "0";
  iframe.style.width = `${PAGE_PX_WIDTH}px`;
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>${SHARED_STYLES} html,body{margin:0;background:#fff;}</style></head><body>${renderPage1(inventoryData, studentProfile)}${renderPage2(inventoryData, consent)}</body></html>`);
  doc.close();

  // Let layout (and the letterhead logo <img> tags) settle before capture.
  await new Promise((resolve) => {
    const imgs = Array.from(doc.images);
    if (!imgs.length) return resolve();
    let pending = imgs.length;
    const done = () => { if (--pending <= 0) resolve(); };
    imgs.forEach((img) => (img.complete ? done() : (img.addEventListener("load", done), img.addEventListener("error", done))));
    setTimeout(resolve, 1500);
  });

  try {
    const pageEls = Array.from(doc.querySelectorAll(".form-page"));
    const pdf = new jsPDF({ unit: "in", format: [8.5, 13], orientation: "portrait" });

    for (let i = 0; i < pageEls.length; i++) {
      const canvas = await html2canvas(pageEls[i], { scale: 2, useCORS: true, windowWidth: doc.body.scrollWidth });
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      if (i > 0) pdf.addPage([8.5, 13], "portrait");
      // Fit the captured page to the full 8.5x13 sheet (each .form-page is
      // already laid out for exactly one long-bond page).
      const imgHeightIn = (canvas.height / canvas.width) * 8.5;
      pdf.addImage(imgData, "JPEG", 0, 0, 8.5, Math.min(imgHeightIn, 13));
    }

    pdf.save(`${safeFileBase(studentProfile?.name, inventoryData?.personal?.idNumber)}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}
