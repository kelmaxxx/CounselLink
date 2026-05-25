// src/pages/student/StudentConsent.jsx
// Student-facing informed-consent page + test result viewer.
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileSignature,
  ClipboardList,
  Printer,
  Download,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useStudentRecords } from "../../context/StudentRecordsContext";
import { useTestResults } from "../../context/TestResultsContext";
import { useReactToPrint } from "react-to-print";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";

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
      <div className="px-6 py-6 max-w-3xl mx-auto">
        <div className="px-3 py-2 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          This page is only available to students.
        </div>
      </div>
    );
  }

  const banner = (() => {
    if (loading)
      return {
        tone: "gray",
        Icon: ClipboardList,
        title: "Loading your consent record…",
        msg: null,
      };
    if (status === "signed")
      return {
        tone: "emerald",
        Icon: CheckCircle2,
        title: "Consent on file (e-signed)",
        msg: (
          <>
            Signed by <span className="font-medium">{consent.eConsentTypedName}</span> on{" "}
            {formatDateTime(consent.eConsentSignedAt)}.
          </>
        ),
      };
    if (status === "paper-on-file")
      return {
        tone: "blue",
        Icon: FileSignature,
        title: "Signed paper consent on file",
        msg: (
          <>
            Your counselor has uploaded a scanned signed copy ({consent.scanFilename}). You can
            also e-sign below if you prefer.
          </>
        ),
      };
    if (status === "revoked")
      return {
        tone: "amber",
        Icon: AlertTriangle,
        title: "Previous consent revoked",
        msg: (
          <>Your prior consent was revoked on {formatDateTime(consent.revokedAt)}. Sign below to consent again.</>
        ),
      };
    return {
      tone: "amber",
      Icon: AlertTriangle,
      title: "No consent on file yet",
      msg: "Please review and sign below before your first counseling session.",
    };
  })();

  const toneClasses = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
  }[banner.tone];

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Student"
        title="View test results & sign consent"
        subtitle="Read and sign the informed consent below, then view any psychological test results released by your counselor."
      />

      {feedback && (
        <div
          className={`mb-4 px-3 py-2 rounded-md border text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Status banner */}
      <div className={`mb-4 px-4 py-3 rounded-md border flex items-start gap-3 ${toneClasses}`}>
        <banner.Icon size={18} className="mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium">{banner.title}</p>
          {banner.msg && <p className="mt-0.5">{banner.msg}</p>}
        </div>
      </div>

      {/* Consent text */}
      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-maroon-600" /> Informed consent
          </span>
        }
        subtitle="MSU DSA Guidance & Counseling Section"
        className="mb-4"
      >
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Counseling is a confidential process designed to help you address your concerns, come
            to a greater understanding of yourself, and learn effective personal and interpersonal
            coping strategies. It involves a relationship between you and a trained counselor who
            has the desire and willingness to help you accomplish your individual goals. Counseling
            involves sharing sensitive, personal, and private information that may at times be
            distressing. During the course of counseling, there may be periods of increased anxiety
            or confusion. The outcome of counseling is often positive; however, the level of
            satisfaction for any individual is not predictable. Your counselor is available to
            support you throughout the counseling process.
          </p>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Confidentiality</p>
            <p>
              All interactions with Counseling Services, including scheduling of or attendance at
              appointments, consent of your sessions, progress in counseling, and your records are
              confidential. No record of counseling is contained in any academic, educational, or
              job placement file. You may request in writing to release specific information about
              your counseling to persons you designate.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Exceptions to confidentiality</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                The counseling staff works as a team. Your counselor may consult with other
                counseling staff to provide the best possible care. These consultations are for
                professional and training purposes.
              </li>
              <li>
                If there is evidence of clear and imminent danger of harm to self and/or others, a
                counselor is legally required to report this information to the authorities
                responsible for ensuring safety.
              </li>
              <li>
                Philippine law requires that staff of Counseling Services who learn of, or strongly
                suspect, physical or sexual abuse or neglect of any person under 18 years of age
                must report this information to county child protection services.
              </li>
              <li>
                A court order, issued by a judge, may require the Counseling Services staff to
                release information contained in records and / or require a counselor to testify in
                a court hearing.
              </li>
            </ul>
            <p className="mt-2">
              There is no fee for counseling services. If you are referred off campus to health,
              mental health, or substance abuse professionals, you are responsible for their
              charges.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Acknowledgment</p>
            <p>
              I acknowledge having been informed of my rights and responsibilities as a student
              receiving counseling services at Division of Student Affairs, Guidance and Counseling
              Section, Mindanao State University, Marawi City. I understand the risks and benefits
              of guidance and counseling services, the nature, and the limits of confidentiality. By
              signing below, I agree to the terms and conditions of counseling.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* E-sign form */}
      {status !== "signed" && (
        <SectionCard
          title="E-sign your consent"
          subtitle="Your typed name, the timestamp, and your IP address will be recorded as proof of consent."
          className="mb-6"
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 text-maroon-600 rounded"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I have read and understood the Informed Consent above. I voluntarily agree to the
                terms and conditions of counseling at MSU DSA Guidance and Counseling Section.
              </span>
            </label>

            <div>
              <label className={LABEL}>Type your full name as your signature</label>
              <input
                type="text"
                className={INPUT}
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Full legal name"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button type="submit" disabled={busy || !agreed} className={BTN.primary}>
                {busy ? "Recording…" : "I agree — record my consent"}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

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
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `test-result-${result.testName || result.id}`,
  });

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
            onClick={handlePrint}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
            title="Use the print dialog's 'Save as PDF'"
          >
            <Download size={12} /> Save
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-maroon-600 text-white text-xs font-medium hover:bg-maroon-700 transition"
          >
            <Printer size={12} /> Print
          </button>
        </div>
      </div>

      <div ref={printRef} className="mt-3 hidden print:block">
        <div className="text-center mb-3">
          <h4 className="text-base font-bold">CounselLink · MSU Marawi</h4>
          <p className="text-xs text-gray-600">Psychological Test Result</p>
        </div>
        <dl className="divide-y divide-gray-100 text-sm">
          <Row label="Student" value={studentName || "—"} />
          <Row label="Test" value={result.testName || "—"} />
          <Row
            label="Completed"
            value={result.completedDate ? new Date(result.completedDate).toLocaleDateString() : "—"}
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
      <dd
        className={`sm:col-span-2 text-sm text-gray-900 ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
