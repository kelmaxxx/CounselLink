import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
import { useTestResults } from "../../context/TestResultsContext";
import {
  FileText,
  Eye,
  FileDown,
  Send,
  Inbox,
  CheckCircle2,
  Clock3,
  Mail,
  ClipboardList,
  Building2,
  User,
  Check,
  X,
  Search,
  AlertTriangle,
  PenLine,
  ScrollText,
} from "lucide-react";
import {
  PageHeader,
  BigStat,
  SectionCard,
  EmptyState,
  Modal,
  StatusPill,
  Pagination,
  FeedbackButton,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
} from "../../components/ui";
import { saveReportAsPdfFile } from "../../utils/sessionReport";
import {
  SEMESTERS,
  REPORT_TYPES,
  schoolYearOptions,
  buildCompiledPayload,
  saveCompiledReportAsPdfFile,
} from "../../utils/compiledReport";
import { MSU_COLLEGES } from "../../data/msuColleges";
import ReportPreview from "../../components/records/ReportPreview";
import LetterPreview from "../../components/records/LetterPreview";
import { letterFromRequest, saveLetterAsPdfFile } from "../../utils/requestLetter";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const parsePayload = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

const REPORTS_PER_PAGE = 10;

export default function CounselorReports() {
  const { token, currentUser } = useAuth();
  const navigate = useNavigate();
  const { sessions, fetchSessions } = useCounselingSessions();
  const { testResults } = useTestResults();

  const [sentReports, setSentReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState("");
  const [activeReport, setActiveReport] = useState(null);
  const [letterTarget, setLetterTarget] = useState(null); // request row viewed as a formal letter

  // Incoming report requests from Colleges.
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsPage, setRequestsPage] = useState(1);
  const [respondTarget, setRespondTarget] = useState(null); // the request being responded to
  const [respondAction, setRespondAction] = useState(null); // "fulfilled" | "declined"
  const [respondNote, setRespondNote] = useState("");
  const [respondError, setRespondError] = useState("");
  const [responding, setResponding] = useState(false);

  const [activeTab, setActiveTab] = useState("requests");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sentPage, setSentPage] = useState(1);
  const [sessionsReportPage, setSessionsReportPage] = useState(1);

  // Sending an individual request that's pending manual review.
  const [sendingId, setSendingId] = useState(null);
  const [sendError, setSendError] = useState("");

  // College-wide summary generation (fulfilling a college request).
  const [genTarget, setGenTarget] = useState(null); // the college request being fulfilled
  const [genTotals, setGenTotals] = useState(null); // auto-computed totals { college, totals, studentCount }
  const [genLoading, setGenLoading] = useState(false);
  const [genNarrative, setGenNarrative] = useState("");
  const [genNote, setGenNote] = useState("");
  const [genError, setGenError] = useState("");
  const [generating, setGenerating] = useState(false);

  // Compiled reports (counseling / psychological / student profile snapshots).
  const [compiled, setCompiled] = useState([]);
  const [loadingCompiled, setLoadingCompiled] = useState(false);
  const [compileOpen, setCompileOpen] = useState(false);
  const [compileType, setCompileType] = useState("counseling");
  const [compileCollege, setCompileCollege] = useState(MSU_COLLEGES[0]?.code || "");
  const [compileSemester, setCompileSemester] = useState("1st");
  const [compileYear, setCompileYear] = useState(() => schoolYearOptions()[0]);
  const [compileError, setCompileError] = useState("");
  const [compiling, setCompiling] = useState(false);

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

  const reloadRequests = async () => {
    if (!token) return;
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE}/api/report-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok) setRequests(Array.isArray(body) ? body : []);
    } finally {
      setLoadingRequests(false);
    }
  };

  const reloadCompiled = async () => {
    if (!token) return;
    setLoadingCompiled(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/compiled`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok) setCompiled(Array.isArray(body) ? body : []);
    } finally {
      setLoadingCompiled(false);
    }
  };

  const handleCompile = async () => {
    if (!currentUser?.signatureUrl) {
      setCompileError("Upload your signature in your Profile before generating a report.");
      return;
    }
    if (!compileCollege) {
      setCompileError("Select a college.");
      return;
    }
    setCompiling(true);
    setCompileError("");
    try {
      const collegeName =
        MSU_COLLEGES.find((c) => c.code === compileCollege)?.name || compileCollege;
      let inventories = [];
      if (compileType === "profile") {
        const res = await fetch(
          `${API_BASE}/api/student-inventories?college=${encodeURIComponent(compileCollege)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || "Unable to load student profiles");
        inventories = Array.isArray(body) ? body : [];
      }

      const payload = buildCompiledPayload({
        type: compileType,
        college: compileCollege,
        collegeName,
        counselorName: currentUser?.name || "",
        semester: compileSemester,
        schoolYear: compileYear,
        sessions,
        testResults,
        inventories,
      });
      const title = `${payload.reportLabel} — ${collegeName}${
        payload.periodLabel ? ` (${payload.periodLabel})` : ""
      }`;

      const res = await fetch(`${API_BASE}/api/reports/compiled`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportType: compileType,
          college: compileCollege,
          periodLabel: payload.periodLabel,
          dateFrom: payload.dateFrom,
          dateTo: payload.dateTo,
          title,
          payload,
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.message || "Unable to save the report");

      await saveCompiledReportAsPdfFile(payload, {
        signatureUrl: currentUser.signatureUrl,
      });
      setCompileOpen(false);
      await reloadCompiled();
    } catch (err) {
      setCompileError(err.message);
    } finally {
      setCompiling(false);
    }
  };

  const downloadCompiled = (row) => {
    const payload = parsePayload(row.payload);
    if (payload) {
      return saveCompiledReportAsPdfFile(payload, { signatureUrl: currentUser?.signatureUrl });
    }
  };

  const deleteCompiled = async (id) => {
    if (!window.confirm("Remove this compiled report from your history?")) return;
    await fetch(`${API_BASE}/api/reports/compiled/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await reloadCompiled();
  };

  useEffect(() => {
    reloadSentReports();
    reloadRequests();
    reloadCompiled();
    fetchSessions().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openRespond = (request, action) => {
    setRespondTarget(request);
    setRespondAction(action);
    setRespondNote("");
    setRespondError("");
  };

  const closeRespond = () => {
    setRespondTarget(null);
    setRespondAction(null);
    setRespondNote("");
    setRespondError("");
  };

  const handleSendIndividual = async (request) => {
    if (!currentUser?.signatureUrl) {
      setSendError("You must upload your signature in your Profile before sending a report.");
      return;
    }
    setSendingId(request.id);
    setSendError("");
    try {
      const res = await fetch(`${API_BASE}/api/report-requests/${request.id}/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        setSendError(body.message || "Failed to send report");
        return;
      }
      await Promise.all([reloadRequests(), reloadSentReports()]);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSendingId(null);
    }
  };

  const openGenerate = async (request) => {
    setGenTarget(request);
    setGenNarrative("");
    setGenNote("");
    setGenError("");
    setGenTotals(null);
    setGenLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/reports/college-totals?college=${encodeURIComponent(
          request.requesterCollege || ""
        )}${request.department ? `&department=${encodeURIComponent(request.department)}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await res.json();
      if (res.ok) setGenTotals(body);
      else setGenError(body.message || "Unable to load college totals");
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const closeGenerate = () => {
    setGenTarget(null);
    setGenTotals(null);
    setGenNarrative("");
    setGenNote("");
    setGenError("");
  };

  const submitGenerate = async () => {
    if (!genTarget) return;
    if (!currentUser?.signatureUrl) {
      setGenError("You must upload your signature in your Profile before sending a report.");
      return;
    }
    if (!genNarrative.trim()) {
      setGenError("A written summary is required.");
      return;
    }
    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch(`${API_BASE}/api/reports/college-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: genTarget.id,
          narrative: genNarrative.trim(),
          responseNote: genNote.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setGenError(body.message || "Failed to generate summary");
        return;
      }
      closeGenerate();
      await Promise.all([reloadRequests(), reloadSentReports()]);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const submitRespond = async () => {
    if (!respondTarget || !respondAction) return;
    if (respondAction === "declined" && !respondNote.trim()) {
      setRespondError("A note is required when declining a request.");
      return;
    }
    setResponding(true);
    setRespondError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/report-requests/${respondTarget.id}/respond`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: respondAction,
            responseNote: respondNote.trim() || null,
          }),
        }
      );
      const body = await res.json();
      if (!res.ok) {
        setRespondError(body.message || "Failed to respond");
        return;
      }
      closeRespond();
      await reloadRequests();
    } catch (err) {
      setRespondError(err.message);
    } finally {
      setResponding(false);
    }
  };

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

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests]
  );

  const filteredRequests = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter(
      (r) =>
        (r.student_name || "").toLowerCase().includes(q) ||
        (r.requesterName || "").toLowerCase().includes(q) ||
        (r.requesterCollege || "").toLowerCase().includes(q) ||
        (r.department || "").toLowerCase().includes(q)
    );
  }, [requests, search]);

  const filteredSentReports = useMemo(() => {
    if (!search.trim()) return sentReports;
    const q = search.toLowerCase();
    return sentReports.filter((r) => {
      const payload = parsePayload(r.report_payload);
      return (
        (payload?.studentName || "").toLowerCase().includes(q) ||
        (r.recipientName || "").toLowerCase().includes(q) ||
        (r.recipientCollege || "").toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q)
      );
    });
  }, [sentReports, search]);

  const filteredFinalizedSessions = useMemo(() => {
    if (!search.trim()) return finalizedSessions;
    const q = search.toLowerCase();
    return finalizedSessions.filter(
      (s) =>
        (s.studentName || "").toLowerCase().includes(q) ||
        (s.studentCollege || "").toLowerCase().includes(q)
    );
  }, [finalizedSessions, search]);

  const filteredCompiled = useMemo(() => {
    if (!search.trim()) return compiled;
    const q = search.toLowerCase();
    return compiled.filter(
      (r) =>
        (r.title || "").toLowerCase().includes(q) ||
        (r.college || "").toLowerCase().includes(q) ||
        (r.period_label || "").toLowerCase().includes(q)
    );
  }, [compiled, search]);

  const allNames = useMemo(() => {
    const names = new Set();
    finalizedSessions.forEach((s) => { if (s.studentName) names.add(s.studentName); });
    sentReports.forEach((r) => {
      const p = parsePayload(r.report_payload);
      if (p?.studentName) names.add(p.studentName);
    });
    requests.forEach((r) => { if (r.student_name) names.add(r.student_name); });
    return [...names].sort();
  }, [finalizedSessions, sentReports, requests]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allNames
      .filter((n) => {
        const lower = n.toLowerCase();
        return lower.startsWith(q) || lower.split(/\s+/).some((w) => w.startsWith(q));
      })
      .slice(0, 6);
  }, [allNames, search]);

  const TABS = [
    { id: "requests", label: "Report Requests", count: requests.length },
    { id: "sent", label: "Sent Reports", count: sentReports.length },
    { id: "sessions", label: "Session Reports", count: finalizedSessions.length },
    { id: "compiled", label: "Compiled Reports", count: compiled.length },
  ];

  const requestsTotalPages = Math.max(1, Math.ceil(filteredRequests.length / REPORTS_PER_PAGE));

  // Keep the current page valid as the list shrinks (e.g. after responding).
  useEffect(() => {
    if (requestsPage > requestsTotalPages) setRequestsPage(1);
  }, [requestsPage, requestsTotalPages]);

  const pagedRequests = useMemo(() => {
    const start = (requestsPage - 1) * REPORTS_PER_PAGE;
    return filteredRequests.slice(start, start + REPORTS_PER_PAGE);
  }, [filteredRequests, requestsPage]);

  const pagedSentReports = useMemo(
    () => filteredSentReports.slice((sentPage - 1) * REPORTS_PER_PAGE, sentPage * REPORTS_PER_PAGE),
    [filteredSentReports, sentPage]
  );

  const pagedFinalizedSessions = useMemo(
    () => filteredFinalizedSessions.slice((sessionsReportPage - 1) * REPORTS_PER_PAGE, sessionsReportPage * REPORTS_PER_PAGE),
    [filteredFinalizedSessions, sessionsReportPage]
  );

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6">
      <PageHeader
        eyebrow="Counselor"
        title="Reports"
        subtitle="Individual student counseling reports and college-compiled data — signed with your eSign."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <BigStat
          label="Pending requests"
          value={pendingRequests}
          hint="From Colleges"
          icon={ClipboardList}
          tone="maroon"
        />
        <BigStat
          label="Reports sent"
          value={stats.sent}
          hint="To Colleges"
          icon={Send}
          tone="emerald"
        />
        <BigStat
          label="Finalized sessions"
          value={stats.finalized}
          hint="Per-student records on file"
          icon={CheckCircle2}
          tone="blue"
        />
        <BigStat
          label="Awaiting send"
          value={stats.pending}
          hint="Finalized but not referred to a College"
          icon={Clock3}
          tone="amber"
        />
      </div>

      {!currentUser?.signatureUrl && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-amber-300 bg-amber-50 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">Digital signature (eSign) required</p>
            <p className="text-amber-700 mt-0.5">
              You must set up your eSign before you can send reports or data to Colleges.
              Go to your{" "}
              <button
                type="button"
                onClick={() => navigate("/counselor/profile")}
                className="underline font-medium text-amber-900 hover:text-amber-950 transition"
              >
                Profile page
              </button>{" "}
              and draw your digital signature.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      {sendError && (
        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {sendError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(""); setRequestsPage(1); setSentPage(1); setSessionsReportPage(1); }}
              className={[
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap",
              ].join(" ")}
            >
              {tab.label}
              <span
                className={[
                  activeTab === tab.id
                    ? "bg-maroon-600 text-white"
                    : "bg-gray-200 text-gray-600",
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[11px] font-bold px-1",
                ].join(" ")}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            className="pl-9 pr-3 h-9 w-full sm:w-56 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon-400 bg-white"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden text-sm">
              {suggestions.map((name) => (
                <li
                  key={name}
                  onMouseDown={() => { setSearch(name); setShowSuggestions(false); }}
                  className="px-3 py-2 hover:bg-maroon-50 cursor-pointer text-gray-800"
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setCompileError(""); setCompileOpen(true); }}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-maroon-600 hover:bg-maroon-700 text-white text-sm font-medium transition whitespace-nowrap"
        >
          <FileText size={14} /> Compile report
        </button>
      </div>

      {activeTab === "requests" && (
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList size={14} className="text-maroon-600" /> Report requests from Colleges
            </span>
          }
          subtitle="College-wide summary requests are fulfilled here. Individual student requests resolve automatically when consented and tied to this College's referral — otherwise, with consent, you can send the latest finalized session manually."
          noBodyPadding
        >
          {loadingRequests ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={search.trim() ? "No matching requests" : "No report requests"}
              hint={search.trim() ? "Try a different name or clear the search." : "When a College requests a report, it appears here for you to fulfill or decline."}
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {pagedRequests.map((r) => (
                  <div key={r.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {r.request_type === "college" ? (
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-1"><Building2 size={12} className="text-maroon-600 flex-shrink-0" /> College-wide summary</p>
                        ) : r.request_type === "department" ? (
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-1"><ClipboardList size={12} className="text-maroon-600 flex-shrink-0" /> {r.department || "Department"} summary</p>
                        ) : (
                          <p className="text-sm font-medium text-gray-900 truncate">{r.student_name}</p>
                        )}
                        {r.student_identifier && <p className="text-xs text-gray-400">{r.student_identifier}</p>}
                      </div>
                      <StatusPill status={r.status} />
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p><span className="text-gray-400">From: </span>{r.requesterName || "—"}{r.requesterCollege ? ` · ${r.requesterCollege}` : ""}</p>
                      <p className="line-clamp-2">{r.reason}</p>
                      {r.response_note && <p className="text-gray-400"><span className="font-medium">Your note:</span> {r.response_note}</p>}
                      <p className="text-gray-400 tabular-nums">{new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                    <div className="pt-1">
                      <button type="button" onClick={() => setLetterTarget(r)} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"><ScrollText size={13} /> View letter</button>
                    </div>
                    {r.status === "pending" && (r.request_type === "college" || r.request_type === "department") && (
                      <div className="flex gap-1 pt-1">
                        <button onClick={() => currentUser?.signatureUrl ? openGenerate(r) : undefined} disabled={!currentUser?.signatureUrl} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition ${currentUser?.signatureUrl ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`} title={currentUser?.signatureUrl ? "Generate & send summary" : "Set up your eSign in your Profile first"}><Check size={13} /> Generate</button>
                        <button onClick={() => openRespond(r, "declined")} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"><X size={13} /> Decline</button>
                      </div>
                    )}
                    {r.status === "pending" && r.request_type === "individual" && (
                      <button onClick={() => currentUser?.signatureUrl ? handleSendIndividual(r) : undefined} disabled={sendingId === r.id || !currentUser?.signatureUrl} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition ${currentUser?.signatureUrl ? "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}><Send size={13} /> {sendingId === r.id ? "Sending…" : "Send"}</button>
                    )}
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-4 py-2.5">From</th>
                      <th className="px-4 py-2.5">Reason</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Submitted</th>
                      <th className="px-4 py-2.5">Letter</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/70 transition align-top">
                        <td className="px-4 py-3">
                          {r.request_type === "college" ? (
                            <div className="inline-flex items-center gap-1.5 font-medium text-gray-900"><Building2 size={13} className="text-maroon-600" /> College-wide summary</div>
                          ) : r.request_type === "department" ? (
                            <div className="inline-flex items-center gap-1.5 font-medium text-gray-900"><ClipboardList size={13} className="text-maroon-600" /> {r.department || "Department"} summary</div>
                          ) : (
                            <div className="inline-flex items-start gap-1.5">
                              <User size={13} className="text-gray-400 mt-0.5" />
                              <span>
                                <span className="block font-medium text-gray-900">{r.student_name}</span>
                                {r.student_identifier && <span className="block text-xs text-gray-500 tabular-nums">{r.student_identifier}</span>}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div>{r.requesterName || "—"}</div>
                          {r.requesterCollege && <div className="text-xs text-gray-500">{r.requesterCollege}</div>}
                        </td>
                        <td className="px-4 py-3 max-w-sm">
                          <p className="text-gray-700 line-clamp-2">{r.reason}</p>
                          {r.response_note && <p className="text-xs text-gray-500 mt-0.5"><span className="font-medium">Your note:</span> {r.response_note}</p>}
                        </td>
                        <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                        <td className="px-4 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setLetterTarget(r)} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition" title="View formal request letter"><ScrollText size={13} /> Letter</button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "pending" && (r.request_type === "college" || r.request_type === "department") ? (
                            <div className="inline-flex gap-1">
                              <button onClick={() => currentUser?.signatureUrl ? openGenerate(r) : undefined} disabled={!currentUser?.signatureUrl} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition ${currentUser?.signatureUrl ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`} title={currentUser?.signatureUrl ? "Generate & send summary" : "Set up your eSign in your Profile first"}><Check size={13} /> Generate</button>
                              <button onClick={() => openRespond(r, "declined")} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition" title="Decline request"><X size={13} /> Decline</button>
                            </div>
                          ) : r.status === "pending" && r.request_type === "individual" ? (
                            <button onClick={() => currentUser?.signatureUrl ? handleSendIndividual(r) : undefined} disabled={sendingId === r.id || !currentUser?.signatureUrl} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition ${currentUser?.signatureUrl ? "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`} title={currentUser?.signatureUrl ? "Send this student's finalized session report" : "Set up your eSign in your Profile first"}><Send size={13} /> {sendingId === r.id ? "Sending…" : "Send"}</button>
                          ) : (
                            <span className="text-xs text-gray-400">No action</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={requestsPage}
                totalPages={Math.ceil(filteredRequests.length / REPORTS_PER_PAGE)}
                onPageChange={setRequestsPage}
              />
            </>
          )}
        </SectionCard>
      )}

      {activeTab === "sent" && (
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <Mail size={14} className="text-maroon-600" /> Reports sent to Colleges
            </span>
          }
          subtitle="Individual student reports and college-wide summaries delivered to Colleges."
          noBodyPadding
        >
          {loadingReports ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : filteredSentReports.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={search.trim() ? "No matching reports" : "No reports sent yet"}
              hint={search.trim() ? "Try a different name or clear the search." : "When you mark a referred student's appointment as done and submit the Session Report, it appears here."}
            />
          ) : (
            <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {pagedSentReports.map((r) => {
                const payload = parsePayload(r.report_payload);
                const isCollege = payload?.type === "college_summary";
                const student = payload?.studentName || "—";
                return (
                  <div key={r.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {isCollege ? <Building2 size={14} /> : initialsOf(student)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{isCollege ? "College summary" : student}</p>
                          <p className="text-xs text-gray-500 truncate">{isCollege ? payload?.college || "—" : payload?.studentCollege || "—"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p><span className="text-gray-400">To: </span>{r.recipientName || "—"}{r.recipientCollege ? ` · ${r.recipientCollege}` : ""}</p>
                      <p className="font-medium text-gray-700">{r.title}</p>
                      <p className="text-gray-400 tabular-nums">{new Date(r.sent_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                    <div className="pt-1 flex justify-end">
                      <ReportActions report={r} onView={() => setActiveReport(r)} signatureUrl={currentUser?.signatureUrl} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
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
                  {pagedSentReports.map((r) => {
                    const payload = parsePayload(r.report_payload);
                    const isCollege = payload?.type === "college_summary";
                    const student = payload?.studentName || "—";
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/70 transition">
                        <td className="px-4 py-3">
                          {isCollege ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center flex-shrink-0">
                                <Building2 size={14} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate">
                                  College summary
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {payload?.college || "—"}
                                </div>
                              </div>
                            </div>
                          ) : (
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
                          )}
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
                          <ReportActions report={r} onView={() => setActiveReport(r)} signatureUrl={currentUser?.signatureUrl} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={sentPage}
              totalPages={Math.ceil(filteredSentReports.length / REPORTS_PER_PAGE)}
              onPageChange={setSentPage}
            />
            </>
          )}
        </SectionCard>
      )}

      {activeTab === "sessions" && (
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <FileText size={14} className="text-blue-600" /> Finalized session reports
            </span>
          }
          subtitle="Per-student records you've submitted. Download as DOCX or PDF anytime."
          noBodyPadding
        >
          {filteredFinalizedSessions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={search.trim() ? "No matching session reports" : "No finalized session reports"}
              hint={search.trim() ? "Try a different name or clear the search." : "Submit a session as the final report from the counseling form."}
            />
          ) : (
            <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {pagedFinalizedSessions.map((s) => (
                <div key={s.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{s.studentName}</p>
                      <p className="text-xs text-gray-500">{s.studentCollege || s.studentNumber || "—"}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <p><span className="text-gray-400">Session date: </span>{(s.sessionDate || "").split("T")[0]}</p>
                    <p><span className="text-gray-400">Finalized: </span>{s.finalizedAt ? new Date(s.finalizedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}</p>
                  </div>
                  <div className="pt-1 flex justify-end">
                    <SessionDownloadButtons session={s} signatureUrl={currentUser?.signatureUrl} onView={() => setActiveReport({
                      id: `session-${s.id}`,
                      title: `Session Report — ${s.studentName} (${(s.sessionDate || "").split("T")[0]})`,
                      sent_at: s.finalizedAt,
                      recipientName: null,
                      recipientCollege: null,
                      report_payload: JSON.stringify(s),
                    })} />
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
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
                  {pagedFinalizedSessions.map((s) => (
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
                        <SessionDownloadButtons session={s} signatureUrl={currentUser?.signatureUrl} onView={() => setActiveReport({
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
            <Pagination
              page={sessionsReportPage}
              totalPages={Math.ceil(filteredFinalizedSessions.length / REPORTS_PER_PAGE)}
              onPageChange={setSessionsReportPage}
            />
            </>
          )}
        </SectionCard>
      )}

      {activeTab === "compiled" && (
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <FileText size={14} className="text-maroon-600" /> Compiled reports
            </span>
          }
          subtitle="Snapshots you generated for a college and semester. Re-download or remove them anytime."
          noBodyPadding
        >
          {loadingCompiled ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : compiled.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No compiled reports yet"
              hint="Use Compile report to generate counseling data, psychological data, or a student profile roster."
            />
          ) : filteredCompiled.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No matching compiled reports"
              hint="Try a different college, period, or clear the search."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                    <th className="px-4 py-2.5">Report</th>
                    <th className="px-4 py-2.5">College</th>
                    <th className="px-4 py-2.5">Period</th>
                    <th className="px-4 py-2.5">Generated</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCompiled.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.title}</div>
                        <div className="text-xs text-gray-500">
                          {REPORT_TYPES.find((t) => t.value === r.report_type)?.label || r.report_type}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.college}</td>
                      <td className="px-4 py-3 text-gray-700">{r.period_label || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <FeedbackButton
                            onAction={() => downloadCompiled(r)}
                            disabled={!currentUser?.signatureUrl}
                            title={currentUser?.signatureUrl ? "Download as PDF" : "Upload your signature in Profile to enable downloads"}
                            icon={FileDown}
                            busyLabel="Preparing…"
                            successLabel="Downloaded"
                            className={`inline-flex items-center gap-1 h-7 px-2 rounded-md border text-xs transition ${currentUser?.signatureUrl ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-100" : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"}`}
                          >
                            Download
                          </FeedbackButton>
                          <button
                            onClick={() => deleteCompiled(r.id)}
                            title="Remove from history"
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-600 hover:bg-gray-100 transition"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      <Modal
        open={!!activeReport}
        onClose={() => setActiveReport(null)}
        title={activeReport?.title || "Student session report"}
        subtitle={
          activeReport
            ? `${activeReport.recipientName ? `Sent to ${activeReport.recipientName} · ` : ""}${new Date(
                activeReport.sent_at
              ).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
            : ""
        }
        size="5xl"
        align="top"
        footer={
          activeReport && (
            <div className="flex items-center gap-2">
              <FeedbackButton
                className={BTN.secondary}
                disabled={!currentUser?.signatureUrl}
                title={currentUser?.signatureUrl ? undefined : "Upload your signature in Profile to enable downloads"}
                icon={FileDown}
                busyLabel="Preparing…"
                successLabel="Downloaded"
                onAction={() => saveReportAsPdfFile(parsePayload(activeReport.report_payload), {
                  title: activeReport.title,
                  signatureUrl: currentUser?.signatureUrl,
                })}
              >
                Download
              </FeedbackButton>
              <button className={BTN.primary} onClick={() => setActiveReport(null)}>
                Close
              </button>
            </div>
          )
        }
      >
        {activePayload ? (
          <ReportPreview report={activePayload} title={activeReport?.title} fallbackSignatureUrl={currentUser?.signatureUrl} height={750} />
        ) : (
          <p className="text-sm text-gray-500 p-4">No report payload available.</p>
        )}
      </Modal>

      <Modal
        open={!!respondTarget}
        onClose={responding ? undefined : closeRespond}
        danger
        align="top"
        size="md"
        title="Decline report request"
        subtitle={
          respondTarget
            ? `College-wide summary · requested by ${respondTarget.requesterName || "—"}`
            : ""
        }
        footer={
          respondTarget && (
            <div className="flex items-center gap-2">
              <button className={BTN.secondary} onClick={closeRespond} disabled={responding}>
                Cancel
              </button>
              <button className={BTN.danger} onClick={submitRespond} disabled={responding}>
                {responding ? "Saving…" : "Decline request"}
              </button>
            </div>
          )
        }
      >
        {respondTarget && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border border-gray-200 bg-gray-50/60 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                Reason given
              </p>
              <p className="text-gray-700 whitespace-pre-wrap">{respondTarget.reason}</p>
            </div>
            <div>
              <label className={LABEL}>Note to the representative *</label>
              <textarea
                rows={4}
                className={INPUT}
                value={respondNote}
                onChange={(e) => setRespondNote(e.target.value)}
                placeholder="Explain why you can't fulfill this request…"
              />
            </div>
            {respondError && <p className="text-sm text-red-600">{respondError}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={!!genTarget}
        onClose={generating ? undefined : closeGenerate}
        title={genTarget?.request_type === "department" ? "Generate department summary" : "Generate college summary"}
        subtitle={
          genTarget
            ? `For ${genTarget.department ? `${genTarget.department}, ` : ""}${
                genTarget.requesterCollege || "—"
              } · requested by ${genTarget.requesterName || "—"}`
            : ""
        }
        size="xl"
        align="top"
        footer={
          genTarget && (
            <div className="flex items-center gap-2">
              <button className={BTN.secondary} onClick={closeGenerate} disabled={generating}>
                Cancel
              </button>
              <button
                className={BTN.primary}
                onClick={submitGenerate}
                disabled={generating || genLoading}
              >
                {generating ? "Sending…" : "Generate & send"}
              </button>
            </div>
          )
        }
      >
        {genTarget && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-gray-200 bg-gray-50/60 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                Reason given
              </p>
              <p className="text-gray-700 whitespace-pre-wrap">{genTarget.reason}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
                Auto-computed totals
              </p>
              {genLoading ? (
                <div className="text-sm text-gray-500">Loading totals…</div>
              ) : genTotals ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <GenStat label="Counseling" value={genTotals.totals?.counselingSessions ?? 0} />
                  <GenStat label="Psych Test" value={genTotals.totals?.testingSessions ?? 0} />
                  <GenStat label="Follow-up" value={genTotals.totals?.followupSessions ?? 0} />
                  <GenStat label="Terminated" value={genTotals.totals?.terminationSessions ?? 0} />
                </div>
              ) : (
                <div className="text-sm text-gray-500">Totals unavailable.</div>
              )}
              {genTotals && (
                <p className="text-xs text-gray-500 mt-1.5">
                  {genTotals.studentCount} student{genTotals.studentCount === 1 ? "" : "s"} in{" "}
                  {genTotals.department ? `${genTotals.department}, ${genTotals.college}` : genTotals.college}.
                  These figures are recomputed and attached when you send.
                </p>
              )}
            </div>

            <div>
              <label className={LABEL}>Written summary *</label>
              <textarea
                rows={5}
                className={INPUT}
                value={genNarrative}
                onChange={(e) => setGenNarrative(e.target.value)}
                placeholder="Summarize the college's counseling activity, trends, and recommendations…"
              />
            </div>

            <div>
              <label className={LABEL}>Note to the representative (optional)</label>
              <textarea
                rows={2}
                className={INPUT}
                value={genNote}
                onChange={(e) => setGenNote(e.target.value)}
                placeholder="Any extra context for the representative…"
              />
            </div>

            {genError && <p className="text-sm text-red-600">{genError}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={compileOpen}
        onClose={compiling ? undefined : () => setCompileOpen(false)}
        title="Generate compiled report"
        subtitle="Compiles records for a college and semester, signed with your eSign."
        size="lg"
        align="top"
        footer={
          compileOpen && (
            <div className="flex items-center gap-2">
              <button className={BTN.secondary} onClick={() => setCompileOpen(false)} disabled={compiling}>
                Cancel
              </button>
              <button className={BTN.primary} onClick={handleCompile} disabled={compiling}>
                {compiling ? "Generating…" : "Generate & download"}
              </button>
            </div>
          )
        }
      >
        {compileOpen && (
          <div className="space-y-4 text-sm">
            <div>
              <label className={LABEL}>Report type</label>
              <select
                className={INPUT}
                value={compileType}
                onChange={(e) => setCompileType(e.target.value)}
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>College</label>
              <select
                className={INPUT}
                value={compileCollege}
                onChange={(e) => setCompileCollege(e.target.value)}
              >
                {MSU_COLLEGES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>

            {compileType === "profile" ? (
              <p className="text-xs text-gray-500">
                Student profiles are current records, so the semester filter does not apply.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Semester</label>
                  <select
                    className={INPUT}
                    value={compileSemester}
                    onChange={(e) => setCompileSemester(e.target.value)}
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>School year</label>
                  <select
                    className={INPUT}
                    value={compileYear}
                    onChange={(e) => setCompileYear(e.target.value)}
                  >
                    {schoolYearOptions().map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500">
              The generated PDF is saved to your Compiled Reports tab so you can download it again later.
            </p>

            {compileError && <p className="text-sm text-red-600">{compileError}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={!!letterTarget}
        onClose={() => setLetterTarget(null)}
        title={letterTarget ? (letterFromRequest(letterTarget).subject || "Request letter") : "Request letter"}
        subtitle={letterTarget ? `Filed by ${letterTarget.requesterName || "—"}${letterTarget.requesterCollege ? ` · ${letterTarget.requesterCollege}` : ""}` : ""}
        size="5xl"
        align="top"
        footer={
          letterTarget && (
            <div className="flex items-center gap-2">
              <FeedbackButton
                className={BTN.secondary}
                onAction={() => saveLetterAsPdfFile(letterFromRequest(letterTarget))}
                icon={FileDown}
                busyLabel="Preparing…"
                successLabel="Downloaded"
              >
                Download
              </FeedbackButton>
              <button className={BTN.primary} onClick={() => setLetterTarget(null)}>Close</button>
            </div>
          )
        }
      >
        {letterTarget && letterTarget.request_type === "individual" && letterTarget.studentConsent !== "yes" && (
          <div className="mb-3 px-3 py-2 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
            <p>The student has not allowed sharing of counseling details — this letter will stay auto-declined until consent is given.</p>
          </div>
        )}
        {letterTarget && letterTarget.request_type === "individual" && letterTarget.studentConsent === "yes" && !letterTarget.hasFinalizedSession && (
          <div className="mb-3 px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-sm">No finalized session is on file for this student yet — nothing can be released until one exists.</div>
        )}
        {letterTarget ? <LetterPreview letter={letterFromRequest(letterTarget)} height={750} /> : null}
      </Modal>
    </div>
  );
}

function GenStat({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-center">
      <div className="text-2xl font-semibold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function ReportActions({ report, onView, signatureUrl }) {
  const payload = parsePayload(report.report_payload);
  const hasSignature = !!signatureUrl;
  return (
    <div className="inline-flex gap-1">
      <button
        onClick={onView}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
        title="View report"
      >
        <Eye size={13} /> View
      </button>
      <FeedbackButton
        onAction={() => saveReportAsPdfFile(payload, { title: report.title, signatureUrl })}
        disabled={!hasSignature}
        title={hasSignature ? "Download as PDF" : "Upload your signature in Profile to enable downloads"}
        icon={FileDown}
        busyLabel="Preparing…"
        successLabel="Downloaded"
        className={`inline-flex items-center gap-1 h-7 px-2 rounded-md border text-xs transition ${hasSignature ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-100" : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"}`}
      >
        Download
      </FeedbackButton>
    </div>
  );
}

function SessionDownloadButtons({ session, onView, signatureUrl }) {
  const hasSignature = !!signatureUrl;
  const opts = {
    title: `Session Report — ${session.studentName} (${(session.sessionDate || "").split("T")[0]})`,
    signatureUrl,
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
      <FeedbackButton
        onAction={() => saveReportAsPdfFile(session, opts)}
        disabled={!hasSignature}
        title={hasSignature ? "Download as PDF" : "Upload your signature in Profile to enable downloads"}
        icon={FileDown}
        busyLabel="Preparing…"
        successLabel="Downloaded"
        className={`inline-flex items-center gap-1 h-7 px-2 rounded-md border text-xs transition ${hasSignature ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-100" : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"}`}
      >
        Download
      </FeedbackButton>
    </div>
  );
}



