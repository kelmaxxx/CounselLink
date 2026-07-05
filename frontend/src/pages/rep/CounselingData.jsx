import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  FileText,
  Eye,
  Inbox,
  FileDown,
  Building2,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  Modal,
  BTN,
  initialsOf,
} from "../../components/ui";
import { downloadReportAsPdf } from "../../utils/sessionReport";
import ReportPreview from "../../components/records/ReportPreview";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const REPORTS_PAGE_SIZE = 10;

const parsePayload = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

const isCollegeSummary = (payload) => payload?.type === "college_summary";

export default function CounselingData() {
  const { currentUser, token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeReport, setActiveReport] = useState(null);
  const [reportsPage, setReportsPage] = useState(1);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/reports/received`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body.message || "Unable to load reports");
        setReports(Array.isArray(body) ? body : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const activePayload = useMemo(
    () => (activeReport ? parsePayload(activeReport.report_payload) : null),
    [activeReport]
  );

  const totalReportPages = Math.max(1, Math.ceil(reports.length / REPORTS_PAGE_SIZE));
  const pagedReports = reports.slice(
    (reportsPage - 1) * REPORTS_PAGE_SIZE,
    reportsPage * REPORTS_PAGE_SIZE
  );

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="College"
        title="Counseling data"
        subtitle={`Counseling reports and college-wide summaries prepared for ${
          currentUser?.college || "your college"
        } by counselors.`}
      />

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <FileText size={14} className="text-maroon-600" /> Reports from counselors
          </span>
        }
        subtitle={`${reports.length} total — individual session reports and college summaries`}
        noBodyPadding
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No reports yet"
            hint="When a counselor finalizes a session or generates a college-wide summary, it appears here."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                    <th className="px-4 py-2.5">From</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-4 py-2.5">Received</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedReports.map((r) => {
                    const payload = parsePayload(r.report_payload);
                    const college = isCollegeSummary(payload);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/70 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {initialsOf(r.senderName)}
                            </div>
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {r.senderName}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {college ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-maroon-50 text-maroon-700">
                              <Building2 size={12} /> College summary
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              <User size={12} /> Session report
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-900">{r.title}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                          {new Date(r.sent_at).toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => setActiveReport(r)}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                              title="View report"
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              onClick={() => downloadReportAsPdf(payload, { title: r.title })}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                              title="Download / print as PDF"
                            >
                              <FileDown size={13} /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              <span>
                {reports.length === 0
                  ? "0 reports"
                  : `${(reportsPage - 1) * REPORTS_PAGE_SIZE + 1}–${Math.min(reportsPage * REPORTS_PAGE_SIZE, reports.length)} of ${reports.length}`}
              </span>
              <div className="inline-flex gap-1">
                <button
                  onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
                  disabled={reportsPage === 1}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setReportsPage((p) => Math.min(totalReportPages, p + 1))}
                  disabled={reportsPage >= totalReportPages}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <Modal
        open={!!activeReport}
        onClose={() => setActiveReport(null)}
        title={activeReport?.title || "Report"}
        subtitle={
          activeReport
            ? `From ${activeReport.senderName} · ${new Date(activeReport.sent_at).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
            : ""
        }
        size="lg"
        align="top"
        footer={
          activeReport && (
            <div className="flex items-center gap-2">
              <button
                className={BTN.secondary}
                onClick={() =>
                  downloadReportAsPdf(parsePayload(activeReport.report_payload), {
                    title: activeReport.title,
                  })
                }
              >
                <FileDown size={14} /> Download PDF
              </button>
              <button className={BTN.primary} onClick={() => setActiveReport(null)}>
                Close
              </button>
            </div>
          )
        }
      >
        {activePayload ? (
          <ReportPreview report={activePayload} title={activeReport?.title} />
        ) : (
          <p className="text-sm text-gray-500">No payload available.</p>
        )}
      </Modal>
    </div>
  );
}
