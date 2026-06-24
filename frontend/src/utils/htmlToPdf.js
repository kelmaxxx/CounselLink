// src/utils/htmlToPdf.js
//
// Generic "render HTML to a real .pdf file" helper — no print dialog, no
// window.open(). Renders the given HTML into a hidden iframe (so html2canvas
// gets its own (0,0)-origin coordinate system regardless of where the host
// page has scrolled), captures each `.pdf-page` element as its own canvas,
// and writes one jsPDF page per captured element. See inventoryReport.js's
// exportInventoryAsPdfFile, which this generalizes.
export async function saveHtmlAsPdfFile(html, filename, { pageWidthIn = 8.5, pageHeightIn = 11 } = {}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const PAGE_PX_WIDTH = Math.round(pageWidthIn * 96);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "0";
  iframe.style.width = `${PAGE_PX_WIDTH}px`;
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();

  // Let layout (and letterhead logo <img> tags) settle before capture.
  await new Promise((resolve) => {
    const imgs = Array.from(doc.images);
    if (!imgs.length) return resolve();
    let pending = imgs.length;
    const done = () => { if (--pending <= 0) resolve(); };
    imgs.forEach((img) => (img.complete ? done() : (img.addEventListener("load", done), img.addEventListener("error", done))));
    setTimeout(resolve, 1500);
  });

  try {
    const found = Array.from(doc.querySelectorAll(".pdf-page"));
    const pageEls = found.length ? found : [doc.body];

    // Capture every page before building the PDF — jsPDF needs the first
    // page's dimensions up front, and we need each page's *actual* content
    // height to size it without clipping anything off the bottom.
    const captures = [];
    for (const el of pageEls) {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, windowWidth: doc.body.scrollWidth });
      const imgHeightIn = (canvas.height / canvas.width) * pageWidthIn;
      captures.push({
        imgData: canvas.toDataURL("image/jpeg", 0.98),
        imgHeightIn,
        // Never shrink shorter than one full page (a half-empty slip still
        // looks like a normal page), but grow past it rather than clip
        // content that doesn't fit in pageHeightIn.
        pageHeightIn: Math.max(imgHeightIn, pageHeightIn),
      });
    }

    const pdf = new jsPDF({ unit: "in", format: [pageWidthIn, captures[0].pageHeightIn], orientation: "portrait" });
    captures.forEach(({ imgData, imgHeightIn, pageHeightIn: h }, i) => {
      if (i > 0) pdf.addPage([pageWidthIn, h], "portrait");
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidthIn, imgHeightIn);
    });

    pdf.save(filename);
  } finally {
    document.body.removeChild(iframe);
  }
}
