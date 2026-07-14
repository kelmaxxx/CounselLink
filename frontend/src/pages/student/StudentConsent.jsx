// src/pages/student/StudentConsent.jsx
// Student-facing test result and counseling result viewer.
import React, { useEffect, useState } from "react";
import { FileSignature, ClipboardList, Download, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTestResults } from "../../context/TestResultsContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
import { PageHeader, SectionCard, EmptyState, Pagination } from "../../components/ui";
import { saveReportAsPdfFile } from "../../utils/sessionReport";
import { saveTestResultAsPdfFile } from "../../utils/testResultReport";
import { ClientFeedbackFormModal } from "./ClientFeedbackForm";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const TABS = [
  { id: "counseling", label: "Counseling Results", icon: FileSignature },
  { id: "tests", label: "Test Results", icon: ClipboardList },
];

export default function StudentConsent() {
  const { currentUser, token } = useAuth();
  const [activeTab, setActiveTab] = useState("counseling");
  const [submittedSessionIds, setSubmittedSessionIds] = useState([]);
  const [submittedTestIds, setSubmittedTestIds] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/client-feedback/my-submitted-sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((body) => {
        if (Array.isArray(body.submittedSessionIds))
          setSubmittedSessionIds(body.submittedSessionIds);
        if (Array.isArray(body.submittedTestIds))
          setSubmittedTestIds(body.submittedTestIds);
      })
      .catch(() => undefined);
  }, [token]);

  const handleFeedbackSubmitted = (sessionId) => {
    setSubmittedSessionIds((prev) => [...prev, sessionId]);
  };

  const handleTestFeedbackSubmitted = (testId) => {
    setSubmittedTestIds((prev) => [...prev, testId]);
  };

  if (currentUser?.role !== "student") {
    return (
      <div className="px-6 py-6 max-w-3xl mx-auto">
        <div className="px-3 py-2 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          This page is only available to students.
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Student"
        title="My Records"
        subtitle="View any counseling reports and psychological test results released by your counselor."
      />

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "counseling" && (
        <CounselingResultsSection
          studentName={currentUser?.name}
          token={token}
          submittedSessionIds={submittedSessionIds}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      )}
      {activeTab === "tests" && (
        <TestResultsSection
          studentName={currentUser?.name}
          token={token}
          submittedTestIds={submittedTestIds}
          onTestFeedbackSubmitted={handleTestFeedbackSubmitted}
        />
      )}
    </div>
  );
}

function TabBar({ activeTab, setActiveTab }) {
  const { sessions } = useCounselingSessions?.() || {};
  const { testResults } = useTestResults?.() || {};

  const completedCount = (sessions || []).filter((s) => !!s.finalizedAt).length;
  const testCount = (testResults || []).length;
  const counts = { counseling: completedCount, tests: testCount };

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
            activeTab === t.id
              ? "text-maroon-700 border-maroon-600"
              : "text-gray-500 border-transparent hover:text-gray-900"
          }`}
        >
          {t.label}
          <span
            className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold tabular-nums ${
              activeTab === t.id
                ? "bg-maroon-100 text-maroon-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {counts[t.id]}
          </span>
        </button>
      ))}
    </div>
  );
}

const RECORDS_PER_PAGE = 10;

function TestResultsSection({ studentName, token, submittedTestIds, onTestFeedbackSubmitted }) {
  const { testResults, fetchTestResults } = useTestResults();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!fetchTestResults) return;
    setLoading(true);
    fetchTestResults()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fetchTestResults]);

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-1.5">
          <ClipboardList size={14} className="text-maroon-600" /> My psychological test results
        </span>
      }
      subtitle="Released by your counselor"
      noBodyPadding
    >
      {error && (
        <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}
      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
      ) : !testResults || testResults.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No test results released yet"
          hint="After your counselor finalizes a result it will appear here."
        />
      ) : (
        <>
        <ul className="divide-y divide-gray-100">
          {testResults.slice((page - 1) * RECORDS_PER_PAGE, page * RECORDS_PER_PAGE).map((r) => (
            <TestResultCard
              key={r.id}
              result={r}
              studentName={studentName}
              token={token}
              alreadyFeedback={submittedTestIds.includes(r.id)}
              onFeedbackSubmitted={() => onTestFeedbackSubmitted(r.id)}
            />
          ))}
        </ul>
        <Pagination
          page={page}
          totalPages={Math.ceil(testResults.length / RECORDS_PER_PAGE)}
          onPageChange={setPage}
        />
        </>
      )}
    </SectionCard>
  );
}

function TestResultCard({ result, studentName, token, alreadyFeedback, onFeedbackSubmitted }) {
  const [saving, setSaving] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTestResultAsPdfFile(result, { studentName });
    } catch {
      alert("Failed to save the test result as PDF. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="px-4 py-3 hover:bg-gray-50/60 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {result.testName || "Psychological test"}
          </p>
          <p className="text-xs text-gray-500 tabular-nums mt-0.5">
            Completed{" "}
            {result.completedDate
              ? new Date(result.completedDate).toLocaleDateString()
              : "—"}
            {result.counselorName ? ` · by ${result.counselorName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!alreadyFeedback && (result.counselorId || result.counselor_id) && (
            <button
              onClick={() => setFeedbackOpen(true)}
              className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:text-maroon-600 hover:border-maroon-300 hover:bg-maroon-50 transition"
              title="Give feedback for this test result"
            >
              <MessageSquare size={13} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !alreadyFeedback}
            title={!alreadyFeedback ? "Submit your feedback first to save this result" : undefined}
            className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
              alreadyFeedback ? "bg-maroon-600 text-white hover:bg-maroon-700" : "bg-gray-200 text-gray-400"
            }`}
          >
            <Download size={12} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {feedbackOpen && (
        <ClientFeedbackFormModal
          token={token}
          context={{
            counselorId: result.counselorId || result.counselor_id,
            counselorName: result.counselorName,
            testId: result.id,
          }}
          onClose={() => setFeedbackOpen(false)}
          onSubmitted={() => {
            setFeedbackOpen(false);
            onFeedbackSubmitted();
          }}
        />
      )}
    </li>
  );
}

function CounselingResultsSection({ studentName, token, submittedSessionIds, onFeedbackSubmitted }) {
  const { sessions } = useCounselingSessions?.() || {};
  const completedSessions = sessions?.filter(s => !!s.finalizedAt) || [];
  const [page, setPage] = useState(1);

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-1.5">
          <FileSignature size={14} className="text-maroon-600" /> My counseling results
        </span>
      }
      subtitle="Finalized by your counselor"
      noBodyPadding
    >
      {completedSessions.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No counseling records yet"
          hint="After a counseling session is completed, the report will appear here."
        />
      ) : (
        <>
        <ul className="divide-y divide-gray-100">
          {completedSessions.slice((page - 1) * RECORDS_PER_PAGE, page * RECORDS_PER_PAGE).map((s) => (
            <CounselingResultCard
              key={s.id}
              session={s}
              studentName={studentName}
              token={token}
              alreadyFeedback={submittedSessionIds.includes(s.id)}
              onFeedbackSubmitted={() => onFeedbackSubmitted(s.id)}
            />
          ))}
        </ul>
        <Pagination
          page={page}
          totalPages={Math.ceil(completedSessions.length / RECORDS_PER_PAGE)}
          onPageChange={setPage}
        />
        </>
      )}
    </SectionCard>
  );
}

function CounselingResultCard({ session, studentName, token, alreadyFeedback, onFeedbackSubmitted }) {
  const [saving, setSaving] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const title = `Session Report — ${session.studentName || studentName || ""} (${(session.sessionDate || "").split("T")[0]})`;
      await saveReportAsPdfFile(session, { title });
    } catch {
      alert("Failed to save the report as PDF. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="px-4 py-3 hover:bg-gray-50/60 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">Counseling Session</p>
          <p className="text-xs text-gray-500 tabular-nums mt-0.5">
            Completed{" "}
            {session.finalizedAt
              ? new Date(session.finalizedAt).toLocaleDateString()
              : "—"}
            {session.counselorName ? ` · by ${session.counselorName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!alreadyFeedback && (session.counselorId || session.counselor_id) && (
            <button
              onClick={() => setFeedbackOpen(true)}
              className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:text-maroon-600 hover:border-maroon-300 hover:bg-maroon-50 transition"
              title="Give feedback for this session"
            >
              <MessageSquare size={13} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !alreadyFeedback}
            title={!alreadyFeedback ? "Submit your feedback first to save this report" : undefined}
            className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
              alreadyFeedback ? "bg-maroon-600 text-white hover:bg-maroon-700" : "bg-gray-200 text-gray-400"
            }`}
          >
            <Download size={12} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {feedbackOpen && (
        <ClientFeedbackFormModal
          token={token}
          context={{
            counselorId: session.counselorId || session.counselor_id,
            counselorName: session.counselorName,
            sessionId: session.id,
          }}
          onClose={() => setFeedbackOpen(false)}
          onSubmitted={() => {
            setFeedbackOpen(false);
            onFeedbackSubmitted();
          }}
        />
      )}
    </li>
  );
}
