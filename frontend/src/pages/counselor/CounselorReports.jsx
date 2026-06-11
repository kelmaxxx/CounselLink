import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
import {
  FileText,
  Eye,
  Download,
  FileDown,
  Send,
  Inbox,
  CheckCircle2,
  Clock3,
  Mail,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
  Modal,
  BTN,
  initialsOf,
} from "../../components/ui";
import {
  downloadReportAsDocx,
  downloadReportAsPdf,
  normalizeSessionReport,
} from "../../utils/sessionReport";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const parsePayload = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

export default function CounselorReports() {
  const { token, currentUser } = useAuth();
  const { sessions, fetchSessions } = useCounselingSessions();

  const [sentReports, setSentReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState("");
  const [activeReport, setActiveReport] = useState(null);

  const reloadSentReports = async () => {
    if (!token) return;
    setLoadingReports(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/reports/sent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Unable to load reports");
      setSentReports(Array.isArray(body) ? body : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    reloadSentReports();
    fetchSessions().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Counselor sessions that are finalized (=> a per-student report exists).
  const finalizedSessions = useMemo(
    () =>
      (sessions || [])
        .filter((s) => s.counselorId === currentUser?.id && s.finalizedAt)
        .sort((a, b) => new Date(b.finalizedAt) - new Date(a.finalizedAt)),
    [sessions, currentUser?.id]
  );

  const stats = useMemo(() => {
    const sentToRep = sentReports.length;
    const finalizedNotSent = finalizedSessions.filter(
      (s) => !sentReports.some((r) => {
        const payload = parsePayload(r.report_payload);
        return payload?.sessionId === s.id;
      })
    ).length;
    return {
      sent: sentToRep,
      finalized: finalizedSessions.length,
      pending: finalizedNotSent,
    };
  }, [sentReports, finalizedSessions]);

  const activePayload = useMemo(
    () => (activeReport ? parsePayload(activeReport.report_payload) : null),
    [activeReport]
  );

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Counselor"
        title="Reports"
        subtitle="Individual student counseling reports — sent to the College Representative who referred each student."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Reports sent"
          value={stats.sent}
          hint="To College Representatives"
          icon={Send}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Finalized sessions"
          value={stats.finalized}
          hint="Per-student records on file"
          icon={CheckCircle2}
          accent="bg-blue-500"
        />
        <StatCard
          label="Awaiting send"
          value={stats.pending}
          hint="Finalized but not referred to a rep"
          icon={Clock3}
          accent="bg-amber-500"
        />
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <SectionCard
        className="mb-6"
        title={
          <span className="inline-flex items-center gap-1.5">
            <Mail size={14} className="text-maroon-600" /> Reports sent to College Representatives
          </span>
        }
        subtitle="Each row is an individual student report delivered to the referring rep."
        noBodyPadding
      >
        {loadingReports ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : sentReports.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No reports sent yet"
            hint="When you mark a referred student's appointment as done and submit the Session Report, it appears here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Delivered to</th>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Sent</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sentReports.map((r) => {
                  const payload = parsePayload(r.report_payload);
                  const student = payload?.studentName || "—";
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {initialsOf(student)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {student}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {payload?.studentCollege || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div>{r.recipientName || "—"}</div>
                        {r.recipientCollege && (
                          <div className="text-xs text-gray-500">{r.recipientCollege}</div>
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
                        <ReportActions report={r} onView={() => setActiveReport(r)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <FileText size={14} className="text-blue-600" /> Finalized session reports
          </span>
        }
        subtitle="Per-student records you've submitted. Download as DOCX or PDF anytime."
        noBodyPadding
      >
        {finalizedSessions.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No finalized session reports"
            hint="Submit a session as the final report from the counseling form."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Session date</th>
                  <th className="px-4 py-2.5">Finalized</th>
                  <th className="px-4 py-2.5 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {finalizedSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.studentName}</div>
                      <div className="text-xs text-gray-500">
                        {s.studentCollege || s.studentNumber || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">
                      {(s.sessionDate || "").split("T")[0]}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">
                      {s.finalizedAt
                        ? new Date(s.finalizedAt).toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SessionDownloadButtons session={s} onView={() => setActiveReport({
                        id: `session-${s.id}`,
                        title: `Session Report — ${s.studentName} (${(s.sessionDate || "").split("T")[0]})`,
                        sent_at: s.finalizedAt,
                        recipientName: null,
                        recipientCollege: null,
                        report_payload: JSON.stringify(s),
                      })} />
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
        title={activeReport?.title || "Student session report"}
        subtitle={
          activeReport
            ? `${activeReport.recipientName ? `Sent to ${activeReport.recipientName} · ` : ""}${new Date(
                activeReport.sent_at
              ).toLocaleString()}`
            : ""
        }
        size="lg"
        footer={
          activeReport && (
            <div className="flex items-center gap-2">
              <button
                className={BTN.secondary}
                onClick={() => downloadReportAsDocx(parsePayload(activeReport.report_payload), {
                  title: activeReport.title,
                })}
              >
                <Download size={14} /> DOCX
              </button>
              <button
                className={BTN.secondary}
                onClick={() => downloadReportAsPdf(parsePayload(activeReport.report_payload), {
                  title: activeReport.title,
                })}
              >
                <FileDown size={14} /> PDF
              </button>
              <button className={BTN.primary} onClick={() => setActiveReport(null)}>
                Close
              </button>
            </div>
          )
        }
      >
        {activePayload ? (
          <ReportView payload={activePayload} />
        ) : (
          <p className="text-sm text-gray-500">No report payload available.</p>
        )}
      </Modal>
    </div>
  );
}

function ReportActions({ report, onView }) {
  const payload = parsePayload(report.report_payload);
  const handle = (fn) => () => fn(payload, { title: report.title });
  return (
    <div className="inline-flex gap-1">
      <button
        onClick={onView}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
        title="View report"
      >
        <Eye size={13} /> View
      </button>
      <button
        onClick={handle(downloadReportAsDocx)}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
        title="Download as Word document"
      >
        <Download size={13} /> DOCX
      </button>
      <button
        onClick={handle(downloadReportAsPdf)}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
        title="Download / print as PDF"
      >
        <FileDown size={13} /> PDF
      </button>
    </div>
  );
}

function SessionDownloadButtons({ session, onView }) {
  const opts = {
    title: `Session Report — ${session.studentName} (${(session.sessionDate || "").split("T")[0]})`,
  };
  return (
    <div className="inline-flex gap-1">
      <button
        onClick={onView}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
        title="View"
      >
        <Eye size={13} /> View
      </button>
      <button
        onClick={() => downloadReportAsDocx(session, opts)}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
        title="DOCX"
      >
        <Download size={13} /> DOCX
      </button>
      <button
        onClick={() => downloadReportAsPdf(session, opts)}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
        title="PDF"
      >
        <FileDown size={13} /> PDF
      </button>
    </div>
  );
}

function ReportView({ payload }) {
  const r = normalizeSessionReport(payload);
  return (
    <dl className="divide-y divide-gray-100 text-sm">
      <Row label="Student" value={r.studentName} />
      <Row label="College" value={r.studentCollege} />
      <Row label="Session date" value={(r.sessionDate || "").split?.("T")?.[0] || r.sessionDate} />
      <Row label="Counselor" value={r.counselorName} />
      <Row label="Presenting concern" value={r.presentingConcern} />
      <Row label="Goals" value={r.goals} />
      <Row label="Summary" value={r.summary} />
      <Row label="Plan" value={r.plan} />
      <Row label="Comments" value={r.comments} />
      <Row label="Next session" value={r.nextSession} />
      <Row label="Signed by" value={r.counselorSignature} />
    </dl>
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

