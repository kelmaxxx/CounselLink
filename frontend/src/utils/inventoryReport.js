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

export async function saveInventoryDocxAsPdfFile(blob, filename) {
  if (!blob) throw new Error("No document to convert");

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;top:0;left:-10000px;width:816px;background:#fff;";
  document.body.appendChild(host);

  try {
    const { renderAsync } = await import("docx-preview");
    await renderAsync(blob, host, host, {
      className: "docx",
      inWrapper: true,
      ignoreLastRenderedPageBreak: true,
      breakPages: true,
    });

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const sections = host.querySelectorAll(".docx-wrapper > section.docx");
    const pages = sections.length ? Array.from(sections) : [host];

    const captures = [];
    for (const el of pages) {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgHeightIn = (canvas.height / canvas.width) * 8.5;
      captures.push({
        imgData: canvas.toDataURL("image/jpeg", 0.95),
        imgHeightIn,
        pageHeightIn: Math.max(imgHeightIn, 13),
      });
    }

    const pdf = new jsPDF({
      unit: "in",
      format: [8.5, captures[0].pageHeightIn],
      orientation: "portrait",
    });
    captures.forEach(({ imgData, imgHeightIn, pageHeightIn }, i) => {
      if (i > 0) pdf.addPage([8.5, pageHeightIn], "portrait");
      pdf.addImage(imgData, "JPEG", 0, 0, 8.5, imgHeightIn);
    });
    pdf.save(filename);
  } finally {
    host.remove();
  }
}
