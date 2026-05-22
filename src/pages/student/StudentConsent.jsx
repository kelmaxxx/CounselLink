// src/pages/student/StudentConsent.jsx
// Student-facing informed-consent page. Mirrors the wet-paper consent printed
// on the back of the MSU DSA Student Individual Inventory form.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, FileSignature, ClipboardList, Printer, Download } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useStudentRecords } from "../../context/StudentRecordsContext";
import { useTestResults } from "../../context/TestResultsContext";
import { useReactToPrint } from "react-to-print";

const CONSENT_SCOPE_DEFAULT =
  "Counseling services + records handling under MSU DSA Guidance and Counseling Section, RA 10173 (Data Privacy Act of 2012)";

function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function StudentConsent() {
  const { currentUser } = useAuth();
  const { getConsent, eSignConsent } = useStudentRecords();

  const [consent, setConsent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const studentId = currentUser?.id;

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    getConsent(studentId)
      .then((data) => setConsent(data))
      .catch((err) => setFeedback({ type: "error", text: err.message || "Failed to load consent" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    setTypedName(currentUser?.name || "");
  }, [currentUser?.name]);

  const status = useMemo(() => {
    if (!consent) return "unsigned";
    if (consent.revokedAt) return "revoked";
    if (consent.eConsentSignedAt) return "signed";
    if (consent.scanUrl) return "paper-on-file";
    return "unsigned";
  }, [consent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setFeedback({ type: "error", text: "Please tick the agreement box to continue." });
      return;
    }
    if (!typedName.trim()) {
      setFeedback({ type: "error", text: "Please type your full name as your signature." });
      return;
    }
    setBusy(true);
    const res = await eSignConsent(studentId, {
      typedName: typedName.trim(),
      scope: CONSENT_SCOPE_DEFAULT,
    });
    setBusy(false);
    if (res.success) {
      setConsent(res.consent);
      setFeedback({ type: "success", text: "Consent recorded. Thank you." });
      setAgreed(false);
    } else {
      setFeedback({ type: "error", text: res.message });
    }
  };

  if (currentUser?.role !== "student") {
    return (
      <div className="p-6">
        <div className="max-w-2xl bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          This page is only available to students.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">View Psychological Test Result and Save Result</h2>
          <p className="text-sm text-gray-600">
            Read and sign the informed consent below, then view and save any psychological test results
            released by your counselor.
          </p>
        </div>

        {feedback && (
          <div
            className={`mb-4 p-3 rounded-lg border ${
              feedback.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Status banner */}
        <div className="mb-6">
          {loading ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-600">
              Loading your consent record...
            </div>
          ) : status === "signed" ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="text-green-600 mt-0.5" size={20} />
              <div className="text-sm text-green-800">
                <p className="font-medium">Consent on file (e-signed)</p>
                <p>
                  Signed by <span className="font-medium">{consent.eConsentTypedName}</span> on{" "}
                  {formatDateTime(consent.eConsentSignedAt)}.
                </p>
              </div>
            </div>
          ) : status === "paper-on-file" ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <FileSignature className="text-blue-600 mt-0.5" size={20} />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Signed paper consent on file</p>
                <p>
                  Your counselor has uploaded a scanned signed copy ({consent.scanFilename}). You can also
                  e-sign below if you prefer.
                </p>
              </div>
            </div>
          ) : status === "revoked" ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Previous consent revoked</p>
                <p>Your prior consent was revoked on {formatDateTime(consent.revokedAt)}. Sign below to consent again.</p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">No consent on file yet</p>
                <p>Please review and sign below before your first counseling session.</p>
              </div>
            </div>
          )}
        </div>

        {/* Consent text — verbatim from MSU DSA paper consent */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4 mb-6">
          <section>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck size={18} className="text-maroon-600" /> Informed Consent
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Counseling is a confidential process designed to help you address your concerns, come to a greater
              understanding of yourself, and learn effective personal and interpersonal coping strategies. It involves
              a relationship between you and a trained counselor who has the desire and willingness to help you
              accomplish your individual goals. Counseling involves sharing sensitive, personal, and private
              information that may at times be distressing. During the course of counseling, there may be periods
              of increased anxiety or confusion. The outcome of counseling is often positive; however, the level of
              satisfaction for any individual is not predictable. Your counselor is available to support you
              throughout the counseling process.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Confidentiality</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              All interactions with Counseling Services, including scheduling of or attendance at appointments,
              consent of your sessions, progress in counseling, and your records are confidential. No record of
              counseling is contained in any academic, educational, or job placement file. You may request in
              writing to release specific information about your counseling to persons you designate.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Exceptions to Confidentiality</h3>
            <ul className="text-sm text-gray-700 leading-relaxed list-disc pl-6 space-y-2">
              <li>
                The counseling staff works as a team. Your counselor may consult with other counseling staff to
                provide the best possible care. These consultations are for professional and training purposes.
              </li>
              <li>
                If there is evidence of clear and imminent danger of harm to self and/or others, a counselor is
                legally required to report this information to the authorities responsible for ensuring safety.
              </li>
              <li>
                Philippine law requires that staff of Counseling Services who learn of, or strongly suspect,
                physical or sexual abuse or neglect of any person under 18 years of age must report this
                information to county child protection services.
              </li>
              <li>
                A court order, issued by a judge, may require the Counseling Services staff to release information
                contained in records and/or require a counselor to testify in a court hearing.
              </li>
            </ul>
            <p className="text-sm text-gray-700 leading-relaxed mt-2">
              There is no fee for counseling services. If you are referred off campus to health, mental health, or
              substance abuse professionals, you are responsible for their charges.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Acknowledgment</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              I acknowledge having been informed of my rights and responsibilities as a student receiving counseling
              services at Division of Student Affairs, Guidance and Counseling Section, Mindanao State University,
              Marawi City. I understand the risks and benefits of guidance and counseling services, the nature, and
              the limits of confidentiality. By signing below, I agree to the terms and conditions of counseling.
            </p>
          </section>
        </div>

        {/* E-sign form — only show when not currently signed (or revoked) */}
        {status !== "signed" && (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">E-sign your consent</h3>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I have read and understood the Informed Consent above. I voluntarily agree to the terms and
                conditions of counseling at MSU DSA Guidance and Counseling Section.
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type your full name as your signature
              </label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Full legal name"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your typed name, the timestamp, and your IP address will be recorded as proof of consent.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-200">
              <button
                type="submit"
                disabled={busy || !agreed}
                className="px-4 py-2 rounded bg-maroon-600 text-white hover:bg-maroon-700 disabled:opacity-50"
              >
                {busy ? "Recording..." : "I agree — record my consent"}
              </button>
            </div>
          </form>
        )}

        <TestResultsSection studentName={currentUser?.name} />
      </div>
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
    <div className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="text-maroon-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-900">My Psychological Test Results</h3>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {!loading && (!testResults || testResults.length === 0) ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-600">
          No test results released yet. After your counselor finalizes a result it will appear here.
        </div>
      ) : (
        <ul className="space-y-4">
          {(testResults || []).map((r) => (
            <TestResultCard key={r.id} result={r} studentName={studentName} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TestResultCard({ result, studentName }) {
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `test-result-${result.testName || result.id}`,
  });

  return (
    <li className="bg-white border border-gray-200 rounded-xl shadow p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-medium text-gray-900">{result.testName || "Psychological Test"}</p>
          <p className="text-xs text-gray-500">
            Completed{" "}
            {result.completedDate ? new Date(result.completedDate).toLocaleDateString() : "—"}
            {result.counselorName ? ` · by ${result.counselorName}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs hover:bg-gray-50"
            title="Save as PDF (use the print dialog's 'Save as PDF')"
          >
            <Download size={14} /> Save
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-maroon-600 text-white text-xs hover:bg-maroon-700"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      <div ref={printRef} className="p-2">
        <div className="text-center mb-3 print:mb-2">
          <h4 className="text-lg font-bold">CounselLink MSU-Marawi</h4>
          <p className="text-xs text-gray-600">Psychological Test Result</p>
        </div>
        <dl className="divide-y divide-gray-100 text-sm">
          <Row label="Student" value={studentName || "—"} />
          <Row label="Test" value={result.testName || "—"} />
          <Row
            label="Completed"
            value={
              result.completedDate ? new Date(result.completedDate).toLocaleDateString() : "—"
            }
          />
          {result.counselorName && <Row label="Counselor" value={result.counselorName} />}
          {result.summary && <Row label="Summary" value={result.summary} multiline />}
          {result.recommendations && (
            <Row label="Recommendations" value={result.recommendations} multiline />
          )}
        </dl>
      </div>
    </li>
  );
}

function Row({ label, value, multiline }) {
  return (
    <div className={`py-2 grid grid-cols-1 sm:grid-cols-3 gap-2 ${multiline ? "items-start" : ""}`}>
      <dt className="text-xs font-medium text-gray-600">{label}</dt>
      <dd className={`sm:col-span-2 text-sm text-gray-900 ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
