// Renders a session report / college summary exactly as it will be printed or
// downloaded, by reusing the same HTML builder used for DOCX/PDF export. Keeps
// the on-screen "View" modal visually identical to the official paper form.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildReportHTML, resolveSignatureDataUrl } from "../../utils/sessionReport";

export default function ReportPreview({ report, title, height = 620, fallbackSignatureUrl }) {
  const [signatureImageUrl, setSignatureImageUrl] = useState(null);
  const [scale, setScale] = useState(1);
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
  useEffect(() => {
    const PAPER_PX = 816; // 8.5in at 96dpi
    const update = () => {
      if (containerRef.current) {
        const available = containerRef.current.clientWidth - 24; // subtract padding
        setScale(available < PAPER_PX ? available / PAPER_PX : 1);
      }
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

  const scaledHeight = typeof height === "number" ? Math.round(height * scale) : height;

  return (
    <div ref={containerRef} className="bg-gray-100 p-3 sm:p-6 rounded-xl flex justify-center min-h-[300px]">
      <div
        className="bg-white rounded-md shadow-md overflow-hidden origin-top-left"
        style={{
          width: "8.5in",
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
          marginBottom: scale < 1 ? `${-(height * (1 - scale))}px` : undefined,
        }}
      >
        <iframe
          title={title || "Report preview"}
          srcDoc={html}
          sandbox="allow-same-origin"
          className="w-full border-0 bg-white"
          style={{ height: typeof height === "number" ? `${height}px` : height }}
        />
      </div>
    </div>
  );
}
