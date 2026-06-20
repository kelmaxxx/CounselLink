// Renders a session report / college summary exactly as it will be printed or
// downloaded, by reusing the same HTML builder used for DOCX/PDF export. Keeps
// the on-screen "View" modal visually identical to the official paper form.
import React, { useMemo } from "react";
import { buildReportHTML } from "../../utils/sessionReport";

export default function ReportPreview({ report, title, height = 620 }) {
  const html = useMemo(() => buildReportHTML(report || {}, { title }), [report, title]);

  return (
    <iframe
      title={title || "Report preview"}
      srcDoc={html}
      sandbox=""
      className="w-full border border-gray-200 rounded-lg bg-white"
      style={{ height }}
    />
  );
}
