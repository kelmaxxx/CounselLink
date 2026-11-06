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
const PDF_HOST_ID = "inventory-docx-pdf-host";
const PDF_STYLE_ID = "inventory-docx-pdf-style";

// The form is Philippine long bond (8.5 x 13in), not A4.
const PAGE_W_IN = 8.5;
const PAGE_H_IN = 13;

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
  @page { size: 8.5in 13in; margin: 0; }
  body > *:not(#${HOST_ID}) { display: none !important; }
  #${HOST_ID} { position: static; opacity: 1; z-index: auto; overflow: visible; }
  #${HOST_ID} .docx-wrapper { background: none !important; padding: 0 !important; }
  #${HOST_ID} .docx-wrapper > section.docx { box-shadow: none !important; margin: 0 auto !important; }
  /* Word prints the letterhead on page 1 only; docx-preview repeats the header
     part on every section, which would push page 2 onto a third sheet. */
  #${HOST_ID} .docx-wrapper > section.docx:not(:first-of-type) > header { display: none !important; }
}
`;

// Applied to the off-screen export host: fix every section to one long-bond
// sheet and drop the repeated letterhead, so each capture is exactly one page.
const PDF_CSS = `
#${PDF_HOST_ID} section.docx { height: ${PAGE_H_IN}in !important; }
#${PDF_HOST_ID} section.docx:not(:first-of-type) > header { display: none !important; }
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
      experimental: true,
    });
    // experimental tab stops are positioned on a 500ms timer after render.
    await new Promise((r) => setTimeout(r, 700));
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

  if (!document.getElementById(PDF_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = PDF_STYLE_ID;
    style.textContent = PDF_CSS;
    document.head.appendChild(style);
  }

  const host = document.createElement("div");
  host.id = PDF_HOST_ID;
  host.style.cssText = "position:fixed;top:0;left:-10000px;width:816px;background:#fff;";
  document.body.appendChild(host);

  try {
    const { renderAsync } = await import("docx-preview");
    await renderAsync(blob, host, host, {
      className: "docx",
      inWrapper: true,
      ignoreLastRenderedPageBreak: true,
      breakPages: true,
      renderHeaders: true,
      // Positions tab stops so lines line up like Word instead of collapsing.
      experimental: true,
    });
    // experimental tab stops are positioned on a 500ms timer after render.
    await new Promise((r) => setTimeout(r, 700));

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const sections = Array.from(host.querySelectorAll(".docx-wrapper > section.docx"));
    const pages = sections.length ? sections : [host];

    // docx-preview gives a blank paragraph a 1em (16px) minimum height, while
    // Word sizes it from the paragraph mark (6pt throughout this form). Left
    // alone those blanks push the tail of the form off the 13in sheet.
    for (const el of pages) {
      for (const p of el.querySelectorAll("article p")) {
        if (!p.textContent.trim() && !p.querySelector("img,svg,table,div")) {
          p.style.fontSize = "6pt";
        }
      }
    }

    // docx-preview collapses the floating letterhead table into a zero-height
    // header and misplaces its anchored logos, so the letterhead overlaps the
    // body. Swap it for a raster of the official letterhead and start the body
    // at the same height Word does (title baseline at 135.4pt).
    const firstSection = sections[0];
    const firstHeader = firstSection?.querySelector(":scope > header");
    const firstArticle = firstSection?.querySelector(":scope > article");
    if (firstHeader && firstArticle) {
      const img = new Image();
      img.src = "/inventory-letterhead.png";
      await new Promise((resolve) => {
        if (img.complete && img.naturalWidth) return resolve();
        img.onload = resolve;
        img.onerror = resolve;
      });
      if (img.naturalWidth) {
        img.alt = "";
        img.style.cssText = `position:absolute;left:0;top:0;width:${PAGE_W_IN}in;height:auto;z-index:2;`;
        firstSection.appendChild(img);
        firstHeader.style.display = "none";
        firstArticle.style.marginTop = "99.4pt";
      }
    }

    // Every section is already forced to one 8.5x13in sheet by PDF_CSS, so each
    // capture maps 1:1 onto a PDF page — no aspect-ratio sizing that could grow
    // a page taller than the form.
    const captures = [];
    for (const el of pages) {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      captures.push(canvas.toDataURL("image/jpeg", 0.95));
    }

    const pdf = new jsPDF({
      unit: "in",
      format: [PAGE_W_IN, PAGE_H_IN],
      orientation: "portrait",
    });
    captures.forEach((imgData, i) => {
      if (i > 0) pdf.addPage([PAGE_W_IN, PAGE_H_IN], "portrait");
      pdf.addImage(imgData, "JPEG", 0, 0, PAGE_W_IN, PAGE_H_IN);
    });
    pdf.save(filename);
  } finally {
    host.remove();
  }
}
