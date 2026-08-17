// Renders a session report / college summary exactly as it will be printed or
// downloaded, by reusing the same HTML builder used for DOCX/PDF export. Keeps
// the on-screen "View" modal visually identical to the official paper form.
import React, { useEffect, useMemo, useState } from "react";
import { buildReportHTML, resolveSignatureDataUrl } from "../../utils/sessionReport";

export default function ReportPreview({ report, title, height = 620, fallbackSignatureUrl }) {
  const [signatureImageUrl, setSignatureImageUrl] = useState(null);

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

  const html = useMemo(
    () => buildReportHTML(report || {}, { title, signatureImageUrl }),
    [report, title, signatureImageUrl]
  );

  return (
    <div className="bg-gray-100 p-3 sm:p-6 rounded-xl flex justify-center overflow-x-auto min-h-[500px]">
      <div className="w-full max-w-[8.5in] bg-white rounded-md shadow-md overflow-hidden">
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
