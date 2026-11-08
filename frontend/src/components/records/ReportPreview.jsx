// Renders a session report / college summary exactly as it will be printed or
// downloaded, by reusing the same HTML builder used for DOCX/PDF export. Keeps
// the on-screen "View" modal visually identical to the official paper form.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildReportHTML, resolveSignatureDataUrl } from "../../utils/sessionReport";

const PAPER_PX = 816; // 8.5in at 96dpi

export default function ReportPreview({ report, title, height = 620, fallbackSignatureUrl }) {
  const [signatureImageUrl, setSignatureImageUrl] = useState(null);
  const [scale, setScale] = useState(1);
  // Grow the iframe to the report's real height so the preview never gets its
  // own scrollbar inside the modal's scroll area.
  const [contentHeight, setContentHeight] = useState(
    typeof height === "number" ? height : 0
  );
  const containerRef = useRef(null);

  const signatureUrl =
    report?.counselorSignatureUrl || report?.counselor_signature_url || report?.senderSignatureUrl || report?.sender_signature_url || fallbackSignatureUrl || null;

  useEffect(() => {
    let cancelled = false;
    setSignatureImageUrl(null);
    if (!signatureUrl) return undefined;
    resolveSignatureDataUrl(signatureUrl).then((dataUrl) => {
      if (!cancelled) setSignatureImageUrl(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [signatureUrl]);

  // Compute scale factor so the 8.5in document fits the container width on mobile
  useLayoutEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const cs = window.getComputedStyle(el);
      const available =
        el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setScale(available > 0 && available < PAPER_PX ? available / PAPER_PX : 1);
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    return () => ro?.disconnect();
  }, []);

  const html = useMemo(
    () => buildReportHTML(report || {}, { title, signatureImageUrl }),
    [report, title, signatureImageUrl]
  );

  const frameHeight = typeof height === "number" ? Math.max(height, contentHeight) : height;

  return (
    <div ref={containerRef} className="bg-gray-100 p-3 sm:p-6 rounded-xl flex justify-center min-h-[300px]">
      {/* Wrapper matches the scaled paper size so it centers in the modal and
          the modal's scroll area ends where the visible page ends. */}
      <div
        className="flex-shrink-0"
        style={{ width: PAPER_PX * scale, height: frameHeight * scale }}
      >
        <div
          className="bg-white rounded-md shadow-md overflow-hidden origin-top-left"
          style={{
            width: PAPER_PX,
            height: typeof frameHeight === "number" ? frameHeight : undefined,
            transform: scale < 1 ? `scale(${scale})` : undefined,
          }}
        >
          <iframe
            title={title || "Report preview"}
            srcDoc={html}
            sandbox="allow-same-origin"
            scrolling="no"
            onLoad={(e) => {
              const doc = e.currentTarget.contentDocument;
              const measured = doc
                ? Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0)
                : 0;
              if (measured) setContentHeight(measured);
            }}
            className="w-full border-0 bg-white"
            style={{ height: typeof frameHeight === "number" ? `${frameHeight}px` : frameHeight }}
          />
        </div>
      </div>
    </div>
  );
}
