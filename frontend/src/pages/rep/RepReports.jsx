import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { FileText, Eye, Inbox } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  Modal,
  BTN,
  initialsOf,
} from "../../components/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const parsePayload = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

export default function RepReports() {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeReport, setActiveReport] = useState(null);

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

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="College Representative"
        title="Reports"
        subtitle="Session reports submitted to you by counselors."
      />

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <FileText size={14} className="text-maroon-600" /> Received reports
          </span>
        }
        subtitle={`${reports.length} total`}
        noBodyPadding
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No reports yet"
            hint="Counselors who finalize a session from one of your referrals will deliver the report here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">From</th>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Summary</th>
                  <th className="px-4 py-2.5">Received</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                          {initialsOf(r.senderName)}
                        </div>
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {r.senderName}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{r.title}</td>
                    <td className="px-4 py-3 max-w-md text-gray-700 line-clamp-2">
                      {r.summary || <span className="text-gray-400">—</span>}
                    </td>
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
                      <button
                        onClick={() => setActiveReport(r)}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Modal
        open={!!activeReport}
        onClose={() => setActiveReport(null)}
        title={activeReport?.title || "Session Report"}
        subtitle={
          activeReport
            ? `From ${activeReport.senderName} · ${new Date(activeReport.sent_at).toLocaleString()}`
            : ""
        }
        size="lg"
        footer={
          <button className={BTN.secondary} onClick={() => setActiveReport(null)}>
            Close
          </button>
        }
      >
        {activePayload ? (
          <dl className="divide-y divide-gray-100 text-sm">
            <Row label="Student" value={activePayload.studentName} />
            <Row label="College" value={activePayload.studentCollege} />
            <Row label="Session date" value={activePayload.sessionDate} />
            <Row label="Counselor" value={activePayload.counselorName} />
            <Row label="Presenting concern" value={activePayload.presentingConcern} />
            <Row label="Goals" value={activePayload.goals} />
            <Row label="Summary" value={activePayload.summary} />
            <Row label="Plan" value={activePayload.plan} />
            <Row label="Comments" value={activePayload.comments} />
            <Row label="Next session" value={activePayload.nextSession} />
            <Row label="Signed by" value={activePayload.counselorSignature} />
          </dl>
        ) : (
          <p className="text-sm text-gray-500">No payload available.</p>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="py-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-gray-900 whitespace-pre-wrap">
        {value || <span className="text-gray-400">—</span>}
      </dd>
    </div>
  );
}
