import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { useAppointments } from "../../context/AppointmentsContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
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
  MessageSquare,
  CheckCircle2,
  Lock,
  Info,
} from "lucide-react";
import { BTN, INPUT, LABEL, initialsOf, formatDate, formatDateTime } from "../../components/ui";

const blankReason = () => ({
  routine: false,
  routineNth: "",
  studentInitiated: false,
  instituteInitiated: false,
});

const NEXT_LABELS = { followup: "Follow-up", termination: "Termination" };

const STEPS = [
  { id: "details", title: "Session details" },
  { id: "reason", title: "Reason for counseling" },
  { id: "discussion", title: "Goals & summary" },
  { id: "plan", title: "Plan & next steps" },
  { id: "review", title: "Review & submit" },
];

export default function StudentCounselingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { appointments } = useAppointments();
  const { fetchSessionByAppointment, createSession, updateSession, finalizeSession } = useCounselingSessions();

  const apptId = Number(id);
  const appt = useMemo(() => appointments.find((a) => a.id === apptId), [appointments, apptId]);

  const [step, setStep] = useState(0);
  const [existingSessionId, setExistingSessionId] = useState(null);
  const [finalizedAt, setFinalizedAt] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reason, setReason] = useState(blankReason());
  const [form, setForm] = useState(() => ({
    studentName: "",
    sessionDate: new Date().toISOString().split("T")[0],
    counselorName: currentUser?.name || "",
    presentingConcern: "",
    goals: "",
    summary: "",
    plan: "",
    comments: "",
    nextSession: "followup",
    counselorSignature: currentUser?.name || "",
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `session-report-${appt?.studentName || apptId}`,
  });

  useEffect(() => {
    if (!appt) return;
    setForm((f) => ({ ...f, studentName: appt.studentName || "" }));

    fetchSessionByAppointment(apptId)
      .then((session) => {
        if (session) {
          setExistingSessionId(session.id);
          setFinalizedAt(session.finalizedAt || null);
          setForm({
            studentName: session.studentName || appt.studentName || "",
            sessionDate: session.sessionDate ? session.sessionDate.split("T")[0] : new Date().toISOString().split("T")[0],
            counselorName: session.counselorName || currentUser?.name || "",
            presentingConcern: session.presentingConcern || "",
            goals: session.goals || "",
            summary: session.summary || "",
            plan: session.plan || "",
            comments: session.comments || "",
            nextSession: session.nextSession || "followup",
            counselorSignature: session.counselorSignature || currentUser?.name || "",
          });
          if (session.formData?.reason) setReason({ ...blankReason(), ...session.formData.reason });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptId, appt?.id]);

  if (!appt) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <button onClick={() => navigate(-1)} className={BTN.secondary}>
          <ArrowLeft size={14} /> Back
        </button>
        <p className="text-gray-700 mt-4">Appointment not found.</p>
      </div>
    );
  }

  const isFinalized = !!finalizedAt;
  const setField = (patch) => setForm((f) => ({ ...f, ...patch }));

  const showFeedback = (type, text, ms) => {
    setFeedback({ type, text });
    if (ms) setTimeout(() => setFeedback(null), ms);
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    const payload = {
      studentId: appt.student_id || appt.studentId,
      appointmentId: apptId,
      sessionDate: form.sessionDate,
      presentingConcern: form.presentingConcern,
      goals: form.goals,
      summary: form.summary,
      plan: form.plan,
      comments: form.comments,
      nextSession: form.nextSession,
      counselorSignature: form.counselorSignature,
      formData: { reason, counselorName: form.counselorName },
    };

    const res = existingSessionId
      ? await updateSession(existingSessionId, payload)
      : await createSession(payload);

    setSaving(false);
    if (res.success) {
      const savedId = existingSessionId || res.session?.id || null;
      if (!existingSessionId && savedId) setExistingSessionId(savedId);
      showFeedback("success", "Counseling form saved.", 3000);
      return savedId;
    }
    showFeedback("error", res.message || "Failed to save form");
    return null;
  };

  const handleSubmitReport = async () => {
    // Ensure there is a saved record to finalize. handleSave returns the id so
    // we don't depend on the (async) existingSessionId state within this call.
    let sessionId = existingSessionId;
    if (!sessionId) {
      sessionId = await handleSave();
      if (!sessionId) return;
    }
    if (!window.confirm(
      "Submit this session as the final Session Report? Once submitted the record becomes read-only and, if the appointment came from a referral, the report will be delivered to the referring College Representative."
    )) return;
    setSubmittingReport(true);
    setFeedback(null);
    const res = await finalizeSession(sessionId);
    setSubmittingReport(false);
    if (res.success) {
      setFinalizedAt(res.session?.finalizedAt || new Date().toISOString());
      showFeedback(
        "success",
        res.fannedOutToRep
          ? "Session Report submitted and delivered to the referring College Representative."
          : "Session Report submitted to the Student Record."
      );
    } else {
      showFeedback("error", res.message || "Failed to submit report");
    }
  };

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const isLast = step === STEPS.length - 1;

  const stepValid = () => {
    if (current.id === "details") return Boolean(form.sessionDate);
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
            <p className="text-xs font-medium text-maroon-600 uppercase tracking-wide">
              Student counseling form
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
              className="h-full bg-maroon-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Status banners */}
      {isFinalized && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl border bg-blue-50 border-blue-200 text-blue-900 text-sm">
          <Lock size={15} className="flex-shrink-0 mt-0.5" />
          <p>
            <strong>Submitted as Session Report</strong> on {formatDateTime(finalizedAt)}. This
            record is now part of the immutable Student Record and is read-only.
          </p>
        </div>
      )}
      {!isFinalized && existingSessionId && !loading && (
        <p className="text-xs text-gray-500 mb-4">
          Editing existing session record (ID #{existingSessionId}). Saving overwrites the record.
        </p>
      )}
      {!isFinalized && !existingSessionId && !loading && (
        <p className="text-xs text-gray-500 mb-4">
          New session — saving creates a record under “Manage Students”.
        </p>
      )}
      {loading && <p className="text-xs text-gray-500 mb-4">Loading existing record…</p>}

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

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          {current.id === "details" && (
            <DetailsStep form={form} setField={setField} disabled={isFinalized} />
          )}
          {current.id === "reason" && (
            <ReasonStep form={form} setField={setField} reason={reason} setReason={setReason} disabled={isFinalized} />
          )}
          {current.id === "discussion" && (
            <DiscussionStep form={form} setField={setField} disabled={isFinalized} />
          )}
          {current.id === "plan" && (
            <PlanStep form={form} setField={setField} disabled={isFinalized} />
          )}
          {current.id === "review" && (
            <ReviewStep
              printRef={printRef}
              form={form}
              setField={setField}
              reason={reason}
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
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className={BTN.secondary}
                    >
                      {saving ? "Saving…" : existingSessionId ? "Update record" : "Save record"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitReport}
                      disabled={submittingReport || saving}
                      className={BTN.success}
                    >
                      <CheckCircle2 size={14} />
                      {submittingReport ? "Submitting…" : "Submit Report"}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button type="button" onClick={goNext} disabled={!stepValid()} className={BTN.primary}>
                Continue <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right: sticky session summary */}
        <div className="lg:col-span-1">
          <SessionSummary appt={appt} form={form} isFinalized={isFinalized} />
        </div>
      </div>
    </div>
  );
}

/* ── Steps ─────────────────────────────────────────────────────────── */
function DetailsStep({ form, setField, disabled }) {
  return (
    <StepCard
      icon={UserRound}
      title="Session details"
      subtitle="Confirm who this counseling record is for and when the session took place."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Student&apos;s name</label>
          <input className={INPUT} value={form.studentName} disabled />
        </div>
        <div>
          <label className={LABEL}>Date *</label>
          <input
            type="date"
            className={INPUT}
            value={form.sessionDate}
            onChange={(e) => setField({ sessionDate: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div>
          <label className={LABEL}>Counselor&apos;s name</label>
          <input
            className={INPUT}
            value={form.counselorName}
            onChange={(e) => setField({ counselorName: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
    </StepCard>
  );
}

function ReasonStep({ form, setField, reason, setReason, disabled }) {
  return (
    <StepCard
      icon={ClipboardList}
      title="Reason for counseling"
      subtitle="Tick what applies, then describe the presenting concern."
    >
      <div className="space-y-3">
        <label className="flex items-center gap-3 flex-wrap text-sm text-gray-700">
          <input
            type="checkbox"
            className="w-4 h-4 text-maroon-600 rounded"
            checked={reason.routine}
            onChange={(e) => setReason({ ...reason, routine: e.target.checked })}
            disabled={disabled}
          />
          <span className="font-medium">Routine</span>
          <span className="text-xs text-gray-500">(nth)</span>
          <input
            className="border border-gray-200 rounded-lg px-2 py-1 w-24 text-sm disabled:bg-gray-100"
            placeholder="e.g. 1st"
            value={reason.routineNth}
            onChange={(e) => setReason({ ...reason, routineNth: e.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            className="w-4 h-4 text-maroon-600 rounded"
            checked={reason.studentInitiated}
            onChange={(e) => setReason({ ...reason, studentInitiated: e.target.checked })}
            disabled={disabled}
          />
          <span className="font-medium">Student initiated</span>
        </label>
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            className="w-4 h-4 text-maroon-600 rounded"
            checked={reason.instituteInitiated}
            onChange={(e) => setReason({ ...reason, instituteInitiated: e.target.checked })}
            disabled={disabled}
          />
          <span className="font-medium">Institute initiated</span>
        </label>
      </div>

      <div className="mt-4">
        <label className={LABEL}>Identify reason / presenting concern</label>
        <textarea
          rows={5}
          className={INPUT}
          value={form.presentingConcern}
          onChange={(e) => setField({ presentingConcern: e.target.value })}
          disabled={disabled}
          placeholder="What brought the student to counseling?"
        />
      </div>
    </StepCard>
  );
}

function DiscussionStep({ form, setField, disabled }) {
  return (
    <StepCard
      icon={Target}
      title="Goals & summary"
      subtitle="Capture the goals set and the key points discussed during the session."
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL}>Goals</label>
          <textarea
            rows={4}
            className={INPUT}
            value={form.goals}
            onChange={(e) => setField({ goals: e.target.value })}
            disabled={disabled}
            placeholder="What does the student want to achieve?"
          />
        </div>
        <div>
          <label className={LABEL}>Summary of counseling / key points of discussion</label>
          <textarea
            rows={6}
            className={INPUT}
            value={form.summary}
            onChange={(e) => setField({ summary: e.target.value })}
            disabled={disabled}
            placeholder="Summarize what was discussed."
          />
        </div>
      </div>
    </StepCard>
  );
}

function PlanStep({ form, setField, disabled }) {
  return (
    <StepCard
      icon={ListChecks}
      title="Plan & next steps"
      subtitle="Document the plan of action, your comments, and whether a follow-up is needed."
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL}>Plan of action</label>
          <textarea
            rows={4}
            className={INPUT}
            value={form.plan}
            onChange={(e) => setField({ plan: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div>
          <label className={LABEL}>Counselor&apos;s comments</label>
          <textarea
            rows={3}
            className={INPUT}
            value={form.comments}
            onChange={(e) => setField({ comments: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div>
          <label className={LABEL}>Next counseling session</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NextOption
              active={form.nextSession === "followup"}
              onClick={() => !disabled && setField({ nextSession: "followup" })}
              title="Follow-up"
              desc="Schedule another session with this student."
            />
            <NextOption
              active={form.nextSession === "termination"}
              onClick={() => !disabled && setField({ nextSession: "termination" })}
              title="Termination"
              desc="No further sessions are required at this time."
            />
          </div>
        </div>
      </div>
    </StepCard>
  );
}

function NextOption({ active, onClick, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition ${
        active ? "border-maroon-300 bg-maroon-50 ring-2 ring-maroon-200" : "border-gray-200 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 size={16} className={active ? "text-maroon-600" : "text-gray-400"} />
        <span className={`text-sm font-semibold ${active ? "text-gray-900" : "text-gray-700"}`}>{title}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </button>
  );
}

function ReviewStep({ printRef, form, setField, reason, onJump, isFinalized }) {
  const reasons = [
    reason.routine && `Routine${reason.routineNth ? ` (${reason.routineNth})` : ""}`,
    reason.studentInitiated && "Student initiated",
    reason.instituteInitiated && "Institute initiated",
  ].filter(Boolean);

  return (
    <StepCard
      icon={FileText}
      title="Review the session report"
      subtitle={
        isFinalized
          ? "This report has been submitted and is read-only."
          : "Check everything, then sign and submit. You can also save a draft."
      }
    >
      <div ref={printRef} className="space-y-4 print:space-y-2">
        <ReviewBlock title="Session details" onEdit={isFinalized ? null : () => onJump(0)}>
          <ReviewLine label="Student" value={form.studentName} />
          <ReviewLine label="Date" value={formatDate(form.sessionDate)} />
          <ReviewLine label="Counselor" value={form.counselorName} />
        </ReviewBlock>

        <ReviewBlock title="Reason for counseling" onEdit={isFinalized ? null : () => onJump(1)}>
          <ReviewLine label="Type" value={reasons.length ? reasons.join(", ") : "—"} />
          <ReviewParagraph value={form.presentingConcern} />
        </ReviewBlock>

        <ReviewBlock title="Goals & summary" onEdit={isFinalized ? null : () => onJump(2)}>
          <ReviewLabeledParagraph label="Goals" value={form.goals} />
          <ReviewLabeledParagraph label="Summary" value={form.summary} />
        </ReviewBlock>

        <ReviewBlock title="Plan & next steps" onEdit={isFinalized ? null : () => onJump(3)}>
          <ReviewLabeledParagraph label="Plan of action" value={form.plan} />
          <ReviewLabeledParagraph label="Comments" value={form.comments} />
          <ReviewLine label="Next session" value={NEXT_LABELS[form.nextSession] || form.nextSession} />
        </ReviewBlock>

        {/* Signature */}
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
            Typing the counselor name acts as your signature. Submitting the report finalizes the
            record and cannot be undone.
          </p>
        </div>
      )}
    </StepCard>
  );
}

/* ── Right column ──────────────────────────────────────────────────── */
function SessionSummary({ appt, form, isFinalized }) {
  return (
    <div className="lg:sticky lg:top-6 bg-white rounded-2xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Session summary</h3>
        <p className="text-xs text-gray-500 mt-0.5">Updates as you go</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        <InfoRow icon={UserRound} label="Student">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-maroon-100 text-maroon-700 text-xs font-semibold">
              {initialsOf(form.studentName || appt.studentName || "")}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{form.studentName || "—"}</p>
              <p className="text-xs text-gray-500 truncate">{appt.college || "—"}</p>
            </div>
          </div>
        </InfoRow>

        <InfoRow icon={ClipboardList} label="Session date">
          <p className="text-sm font-medium text-gray-900">{formatDate(form.sessionDate)}</p>
        </InfoRow>

        <InfoRow icon={UserRound} label="Counselor">
          <p className="text-sm font-medium text-gray-900">{form.counselorName || "—"}</p>
        </InfoRow>

        <InfoRow icon={MessageSquare} label="Next session">
          <p className="text-sm font-medium text-gray-900">
            {NEXT_LABELS[form.nextSession] || form.nextSession}
          </p>
        </InfoRow>

        <div className="border-t border-gray-100 pt-3">
          {isFinalized ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              <Lock size={12} /> Finalized report
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              Draft — not yet submitted
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
          <span className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-maroon-50 text-maroon-600">
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
            className="text-xs font-medium text-maroon-600 hover:text-maroon-700 print:hidden"
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

function ReviewLabeledParagraph({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}
