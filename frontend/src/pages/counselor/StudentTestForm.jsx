import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { useTestResults } from "../../context/TestResultsContext";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  Printer,
  UserRound,
  ClipboardList,
  Target,
  FileText,
  ListChecks,
  CheckCircle2,
  Lock,
  Info,
  Upload,
  X,
} from "lucide-react";
import { Modal, BTN, INPUT, LABEL, initialsOf, formatDate } from "../../components/ui";

const STEPS = [
  { id: "details", title: "Test details" },
  { id: "results", title: "Results & summary" },
  { id: "recommendations", title: "Recommendations" },
  { id: "upload", title: "Upload files or pictures" },
  { id: "review", title: "Review & submit" },
];

const ALLOWED_RESULT_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_RESULT_FILE_SIZE = 10 * 1024 * 1024;

export default function StudentTestForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { tests } = useTests();
  const { createTestResult } = useTestResults();
  const { completeAppointment } = useAppointments();

  const testId = Number(id);
  const testReq = useMemo(() => tests.find((t) => t.id === testId), [tests, testId]);

  const [step, setStep] = useState(0);
  const [submittingReport, setSubmittingReport] = useState(false);
  
  const [form, setForm] = useState(() => ({
    studentName: "",
    completedDate: new Date().toISOString().split("T")[0],
    counselorName: currentUser?.name || "",
    testName: "",
    summary: "",
    recommendations: "",
    resultFile: null,
    counselorSignature: currentUser?.name || "",
  }));
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `test-result-${testReq?.studentName || testId}`,
  });

  useEffect(() => {
    if (!testReq) return;
    setForm((f) => ({
      ...f,
      studentName: testReq.studentName || "",
      testName: testReq.testType || "Psychological test",
    }));
  }, [testReq]);

  if (!testReq) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <button onClick={() => navigate(-1)} className={BTN.secondary}>
          <ArrowLeft size={14} /> Back
        </button>
        <p className="text-gray-700 mt-4">Psychological test request not found.</p>
      </div>
    );
  }

  // Once submitted, the appointment status becomes completed
  const isFinalized = testReq.status === "completed";

  const setField = (patch) => setForm((f) => ({ ...f, ...patch }));

  const showFeedback = (type, text, ms) => {
    setFeedback({ type, text });
    if (ms) setTimeout(() => setFeedback(null), ms);
  };

  const executeSubmitReport = async () => {
    setSubmitConfirmOpen(false);
    setSubmittingReport(true);
    setFeedback(null);

    // 1. Create the test result record
    const resultRes = await createTestResult({
      appointmentId: testId,
      studentId: testReq.student_id || testReq.studentUserId || testReq.studentId,
      testName: form.testName,
      completedDate: form.completedDate,
      summary: form.summary,
      recommendations: form.recommendations,
      resultFile: form.resultFile,
    });

    if (!resultRes.success) {
      setSubmittingReport(false);
      showFeedback("error", resultRes.message || "Failed to save test result");
      return;
    }

    // 2. Mark the test request appointment as completed
    const completeRes = await completeAppointment({ id: testId });
    setSubmittingReport(false);

    if (completeRes.success) {
      showFeedback("success", "Test result submitted and released to the student.");
      setTimeout(() => navigate("/counselor/appointments"), 2000);
    } else {
      showFeedback("error", completeRes.message || "Failed to mark test as completed");
    }
  };

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const isLast = step === STEPS.length - 1;

  const stepValid = () => {
    if (current.id === "details") return Boolean(form.completedDate && form.testName);
    if (current.id === "results") return Boolean(form.summary);
    return true;
  };

  const goBack = () => (step === 0 ? navigate(-1) : setStep((s) => s - 1));
  const goNext = () => {
    if (!stepValid()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      {/* Wizard header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={goBack}
            className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              Psychological test result
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight truncate">
              {current.title}
            </h2>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-medium text-gray-700">
            Step {step + 1} <span className="text-gray-400">of {STEPS.length}</span>
          </p>
          <div className="mt-2 w-32 sm:w-44 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {isFinalized && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl border bg-green-50 border-green-200 text-green-900 text-sm">
          <Lock size={15} className="flex-shrink-0 mt-0.5" />
          <p>
            <strong>Test result has already been submitted and released to the student.</strong>
          </p>
        </div>
      )}

      {feedback && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl border text-sm ${
            feedback.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          {current.id === "details" && (
            <DetailsStep form={form} setField={setField} disabled={isFinalized} />
          )}
          {current.id === "results" && (
            <ResultsStep form={form} setField={setField} disabled={isFinalized} />
          )}
          {current.id === "recommendations" && (
            <RecommendationsStep form={form} setField={setField} disabled={isFinalized} />
          )}
          {current.id === "upload" && (
            <UploadStep form={form} setField={setField} disabled={isFinalized} />
          )}
          {current.id === "review" && (
            <ReviewStep
              printRef={printRef}
              form={form}
              setField={setField}
              onJump={setStep}
              isFinalized={isFinalized}
            />
          )}

          {/* Footer nav */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" onClick={goBack} className={BTN.secondary}>
              <ArrowLeft size={14} /> Back
            </button>

            {isLast ? (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button type="button" onClick={handlePrint} className={BTN.secondary}>
                  <Printer size={14} /> Print
                </button>
                {!isFinalized && (
                  <button
                    type="button"
                    onClick={() => setSubmitConfirmOpen(true)}
                    disabled={submittingReport}
                    className={BTN.success}
                  >
                    <CheckCircle2 size={14} />
                    {submittingReport ? "Submitting…" : "Release Result"}
                  </button>
                )}
              </div>
            ) : (
              <button type="button" onClick={goNext} disabled={!stepValid()} className={BTN.primary}>
                Continue <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <TestSummary testReq={testReq} form={form} isFinalized={isFinalized} />
        </div>
      </div>

      {submitConfirmOpen && (
        <Modal
          open
          onClose={() => setSubmitConfirmOpen(false)}
          title="Release Test Result"
          subtitle="Confirm test release"
          footer={
            <>
              <button
                type="button"
                className={BTN.secondary}
                onClick={() => setSubmitConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={BTN.primary}
                onClick={executeSubmitReport}
              >
                Confirm Release
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            Submit this test result? Once submitted, the record becomes read-only and will be immediately released and visible to the student.
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ── Steps ─────────────────────────────────────────────────────────── */
function DetailsStep({ form, setField, disabled }) {
  return (
    <StepCard
      icon={UserRound}
      title="Test details"
      subtitle="Confirm the basic test details before entering results."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className={LABEL}>Student's name</label>
          <input className={INPUT} value={form.studentName} disabled />
        </div>
        <div>
          <label className={LABEL}>Counselor's name</label>
          <input
            className={INPUT}
            value={form.counselorName}
            onChange={(e) => setField({ counselorName: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Test name *</label>
          <input
            className={INPUT}
            value={form.testName}
            onChange={(e) => setField({ testName: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div>
          <label className={LABEL}>Date completed *</label>
          <input
            type="date"
            className={INPUT}
            value={form.completedDate}
            onChange={(e) => setField({ completedDate: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
    </StepCard>
  );
}

function ResultsStep({ form, setField, disabled }) {
  return (
    <StepCard
      icon={Target}
      title="Results & summary"
      subtitle="Provide the scores and clinical interpretation."
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL}>Analysis & Summary *</label>
          <textarea
            rows={8}
            className={INPUT}
            value={form.summary}
            onChange={(e) => setField({ summary: e.target.value })}
            disabled={disabled}
            placeholder="Document the test scores and your professional interpretation of the results..."
          />
        </div>
      </div>
    </StepCard>
  );
}

function RecommendationsStep({ form, setField, disabled }) {
  return (
    <StepCard
      icon={ListChecks}
      title="Recommendations"
      subtitle="Provide actionable recommendations for the student based on the results."
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL}>Recommendations</label>
          <textarea
            rows={5}
            className={INPUT}
            value={form.recommendations}
            onChange={(e) => setField({ recommendations: e.target.value })}
            disabled={disabled}
            placeholder="Recommended follow-ups, counseling, or exercises..."
          />
        </div>
      </div>
    </StepCard>
  );
}

function UploadStep({ form, setField, disabled }) {
  const inputRef = useRef(null);
  const file = form.resultFile;
  const previewUrl = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePick = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    if (!ALLOWED_RESULT_FILE_TYPES.includes(picked.type)) {
      alert("Only JPG, PNG, PDF, DOC, or DOCX files are allowed.");
      return;
    }
    if (picked.size > MAX_RESULT_FILE_SIZE) {
      alert("File is too large. Maximum size is 10MB.");
      return;
    }
    setField({ resultFile: picked });
  };

  return (
    <StepCard
      icon={Upload}
      title="Upload files or pictures"
      subtitle="Attach a scanned answer sheet or photo of the test, if you have one."
    >
      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          JPG, PNG, PDF, DOC, or DOCX — max 10MB. Optional, but recommended for the student's record.
        </p>

        {file ? (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Selected preview"
                className="w-14 h-14 rounded-lg object-cover border border-gray-100 flex-shrink-0"
              />
            ) : (
              <span className="w-14 h-14 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                <FileText size={22} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => setField({ resultFile: null })}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition flex-shrink-0"
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-8 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={22} />
            <span className="text-sm font-medium">Click to upload</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
          className="hidden"
          onChange={handlePick}
        />
      </div>
    </StepCard>
  );
}

function ReviewStep({ printRef, form, setField, onJump, isFinalized }) {
  return (
    <StepCard
      icon={FileText}
      title="Review test results"
      subtitle={
        isFinalized
          ? "This result has been released and is read-only."
          : "Check everything, then sign and release to the student."
      }
    >
      <div ref={printRef} className="space-y-4 print:space-y-2">
        <ReviewBlock title="Test details" onEdit={isFinalized ? null : () => onJump(0)}>
          <ReviewLine label="Student" value={form.studentName} />
          <ReviewLine label="Date completed" value={formatDate(form.completedDate)} />
          <ReviewLine label="Test name" value={form.testName} />
          <ReviewLine label="Counselor" value={form.counselorName} />
        </ReviewBlock>

        <ReviewBlock title="Results & summary" onEdit={isFinalized ? null : () => onJump(1)}>
          <ReviewParagraph value={form.summary} />
        </ReviewBlock>

        <ReviewBlock title="Recommendations" onEdit={isFinalized ? null : () => onJump(2)}>
          <ReviewParagraph value={form.recommendations} />
        </ReviewBlock>

        <ReviewBlock title="Uploaded file" onEdit={isFinalized ? null : () => onJump(3)}>
          {form.resultFile ? (
            <p className="text-sm text-gray-900">{form.resultFile.name}</p>
          ) : (
            <p className="text-sm text-gray-500">No file attached.</p>
          )}
        </ReviewBlock>

        <div className="rounded-xl border border-gray-100 p-4 print:border-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Counselor signature</h4>
          <input
            className={INPUT}
            value={form.counselorSignature}
            onChange={(e) => setField({ counselorSignature: e.target.value })}
            disabled={isFinalized}
            placeholder="Type counselor name as signature"
          />
        </div>
      </div>

      {!isFinalized && (
        <div className="mt-4 flex items-start gap-2 px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-800">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <p>
            Typing the counselor name acts as your signature. Releasing the test results makes them
            visible to the student immediately.
          </p>
        </div>
      )}
    </StepCard>
  );
}

/* ── Right column ──────────────────────────────────────────────────── */
function TestSummary({ testReq, form, isFinalized }) {
  return (
    <div className="lg:sticky lg:top-6 bg-white rounded-2xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Test summary</h3>
        <p className="text-xs text-gray-500 mt-0.5">Updates as you go</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        <InfoRow icon={UserRound} label="Student">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              {initialsOf(form.studentName || testReq.studentName || "")}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{form.studentName || "—"}</p>
              <p className="text-xs text-gray-500 truncate">{testReq.college || "—"}</p>
            </div>
          </div>
        </InfoRow>

        <InfoRow icon={ClipboardList} label="Test Name">
          <p className="text-sm font-medium text-gray-900">{form.testName || "—"}</p>
        </InfoRow>
        
        <InfoRow icon={ClipboardList} label="Completed Date">
          <p className="text-sm font-medium text-gray-900">{formatDate(form.completedDate)}</p>
        </InfoRow>

        <InfoRow icon={UserRound} label="Counselor">
          <p className="text-sm font-medium text-gray-900">{form.counselorName || "—"}</p>
        </InfoRow>

        <div className="border-t border-gray-100 pt-3">
          {isFinalized ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">
              <Lock size={12} /> Released
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              Pending release
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-400 ring-1 ring-gray-100">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}

/* ── Shared bits ───────────────────────────────────────────────────── */
function StepCard({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-950/5">
      <header className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
        {Icon && (
          <span className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600">
            <Icon size={17} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function ReviewBlock({ title, onEdit, children }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 print:hidden"
          >
            Edit
          </button>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewLine({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value || "—"}</span>
    </div>
  );
}

function ReviewParagraph({ value }) {
  return <p className="text-sm text-gray-700 whitespace-pre-wrap">{value || "—"}</p>;
}
