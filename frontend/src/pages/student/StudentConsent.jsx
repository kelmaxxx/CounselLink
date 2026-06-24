// src/pages/student/StudentConsent.jsx
// Student-facing test result and counseling result viewer.
import React, { useEffect, useState } from "react";
import { FileSignature, ClipboardList, Download } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTestResults } from "../../context/TestResultsContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
import { PageHeader, SectionCard, EmptyState } from "../../components/ui";
import { saveReportAsPdfFile } from "../../utils/sessionReport";
import { saveTestResultAsPdfFile } from "../../utils/testResultReport";

export default function StudentConsent() {
  const { currentUser } = useAuth();

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

      <CounselingResultsSection studentName={currentUser?.name} />
      <TestResultsSection studentName={currentUser?.name} />
    </div>
  );
}

function TestResultsSection({ studentName }) {
  const { testResults, fetchTestResults } = useTestResults();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        <ul className="divide-y divide-gray-100">
          {testResults.map((r) => (
            <TestResultCard key={r.id} result={r} studentName={studentName} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function TestResultCard({ result, studentName }) {
  const [saving, setSaving] = useState(false);

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
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-maroon-600 text-white text-xs font-medium hover:bg-maroon-700 transition disabled:opacity-50"
          >
            <Download size={12} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </li>
  );
}

function CounselingResultsSection({ studentName }) {
  const { sessions } = useCounselingSessions?.() || {};
  
  // A counseling session is finalized when `finalizedAt` is not null
  const completedSessions = sessions?.filter(s => !!s.finalizedAt) || [];

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-1.5">
          <FileSignature size={14} className="text-maroon-600" /> My counseling results
        </span>
      }
      subtitle="Finalized by your counselor"
      noBodyPadding
      className="mb-6"
    >
      {completedSessions.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No counseling records yet"
          hint="After a counseling session is completed, the report will appear here."
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {completedSessions.map((s) => (
            <CounselingResultCard key={s.id} session={s} studentName={studentName} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function CounselingResultCard({ session, studentName }) {
  // Same official MSU DSA GCS Form 3.3 letterhead template the counselor
  // uses in StudentRecordsDrawer.jsx — students and counselors end up with
  // an identical document. Unlike the counselor's "Download / print as PDF"
  // action, this one saves the file directly — no print dialog.
  const [saving, setSaving] = useState(false);

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
          <p className="text-sm font-medium text-gray-900 truncate">
            Counseling Session
          </p>
          <p className="text-xs text-gray-500 tabular-nums mt-0.5">
            Completed{" "}
            {session.finalizedAt
              ? new Date(session.finalizedAt).toLocaleDateString()
              : "—"}
            {session.counselorName ? ` · by ${session.counselorName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-maroon-600 text-white text-xs font-medium hover:bg-maroon-700 transition disabled:opacity-50"
          >
            <Download size={12} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </li>
  );
}
