// src/pages/student/RequestAppointment.jsx
import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { useReactToPrint } from "react-to-print";
import {
  Printer,
  AlertTriangle,
  Info,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  MapPin,
  UserRound,
  Zap,
  Brain,
  MessageCircle,
} from "lucide-react";
import { BTN, INPUT, LABEL, Modal, initialsOf } from "../../components/ui";
import InformedConsentSection from "../../components/InformedConsent";

const TIME_SLOTS_MORNING = [
  { label: "9:00 – 10:00 AM", value: "9:00-10:00" },
  { label: "10:00 – 11:00 AM", value: "10:00-11:00" },
  { label: "11:00 – 12:00 PM", value: "11:00-12:00" },
];
const TIME_SLOTS_AFTERNOON = [
  { label: "1:00 – 2:00 PM", value: "1:00-2:00" },
  { label: "2:00 – 3:00 PM", value: "2:00-3:00" },
  { label: "3:00 – 4:00 PM", value: "3:00-4:00" },
];
const ALL_SLOTS = [...TIME_SLOTS_MORNING, ...TIME_SLOTS_AFTERNOON];
const slotLabel = (value) => ALL_SLOTS.find((s) => s.value === value)?.label || value;

const STEPS = [
  { id: "details", title: "Your details" },
  { id: "priority", title: "Priority" },
  { id: "schedule", title: "Appointment time" },
  { id: "reason", title: "Reason for counseling" },
  { id: "consent", title: "Informed consent" },
  { id: "review", title: "Review & submit" },
];
const stepIndexOf = (id) => STEPS.findIndex((s) => s.id === id);

const initialForm = {
  requestType: "counseling",
  date: "",
  timeSlot: "",
  preferredSlots: [],
  isUrgent: false,
  phoneNumber: "",
  reason: "",
  testType: "Psychological Test",
  acknowledged: false,
};

// ── Date helpers (local, timezone-safe) ──────────────────────────────
const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
const isSelectableDate = (d) => d >= startOfToday() && !isWeekend(d);
const formatLong = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

// First open weekday from today (skips weekends/past).
const firstAvailableDate = () => {
  const d = startOfToday();
  while (!isSelectableDate(d)) d.setDate(d.getDate() + 1);
  return d;
};

export default function RequestAppointment() {
  const navigate = useNavigate();
  const { currentUser, users } = useAuth();
  const myRecord = users?.find((u) => u.email === currentUser?.email) || currentUser;
  const { createAppointment } = useAppointments?.() || {};
  const { createTestRequest } = useTests?.() || {};

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);

  const [submitted, setSubmitted] = useState(false);
  const [successModal, setSuccessModal] = useState({ open: false, data: null });

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `appointment-request-${currentUser?.studentId || currentUser?.id || "form"}`,
  });

  const firstAvail = useMemo(() => {
    const d = firstAvailableDate();
    return { iso: toISO(d), slot: TIME_SLOTS_MORNING[0] };
  }, []);

  const setField = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Single-select: choosing a slot replaces the previous one (toggles off if re-clicked).
  // Still stored as a one-element array to keep the createAppointment payload unchanged.
  const selectSlot = (val) => {
    setForm((f) => ({
      ...f,
      preferredSlots: f.preferredSlots.includes(val) ? [] : [val],
    }));
  };

  const quickBook = () => {
    setField({ date: firstAvail.iso, preferredSlots: [firstAvail.slot.value] });
  };

  // ── Per-step validation ────────────────────────────────────────────
  const stepValid = (i = step) => {
    switch (STEPS[i].id) {
      case "details":
        return form.phoneNumber.trim().length >= 7;
      case "schedule":
        return Boolean(form.date) && form.preferredSlots.length === 1;
      case "reason":
        return form.requestType === "psychological" ? true : form.reason.trim().length > 0;
      case "consent":
        return form.acknowledged;
      default:
        return true;
    }
  };

  const isPsychological = form.requestType === "psychological";

  // Psychological requests skip the "Priority" step: details → schedule directly.
  const goBack = () => {
    if (step === 0) return navigate(-1);
    if (isPsychological && step === stepIndexOf("schedule")) {
      setStep(stepIndexOf("details"));
      return;
    }
    setStep((s) => s - 1);
  };
  const goNext = () => {
    if (!stepValid()) return;
    if (isPsychological && step === stepIndexOf("details")) {
      setStep(stepIndexOf("schedule"));
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
    if (isPsychological) {
      if (!createTestRequest) {
        alert("Test request system not initialized.");
        return;
      }
      if (!form.date || !form.preferredSlots.length || !form.phoneNumber) {
        alert("Please complete all required fields before submitting.");
        return;
      }
      setSubmitted(true);
      const res = await createTestRequest({ student: myRecord, form });
      if (res?.success) {
        setSuccessModal({
          open: true,
          data: {
            requestType: "psychological",
            date: form.date,
            testType: form.testType,
            preferredSlots: form.preferredSlots.map(slotLabel),
          },
        });
        setForm(initialForm);
        setStep(0);
      } else {
        alert(res?.message || "Failed to submit test request.");
      }
      setSubmitted(false);
      return;
    }

    if (!createAppointment) {
      alert("Appointment system not initialized.");
      return;
    }
    if (!form.date || !form.preferredSlots.length || !form.reason || !form.phoneNumber) {
      alert("Please complete all required fields before submitting.");
      return;
    }
    setSubmitted(true);
    const res = await createAppointment({ student: myRecord, form });
    if (res?.success) {
      setSuccessModal({
        open: true,
        data: {
          requestType: "counseling",
          date: form.date,
          isUrgent: form.isUrgent,
          preferredSlots: form.preferredSlots.map(slotLabel),
        },
      });
      setForm(initialForm);
      setStep(0);
    } else {
      alert(res?.message || "Failed to submit appointment.");
    }
    setSubmitted(false);
  };

  const current = STEPS[step];
  const visibleSteps = isPsychological ? STEPS.filter((s) => s.id !== "priority") : STEPS;
  const visibleIndex = visibleSteps.findIndex((s) => s.id === current.id);
  const progress = ((visibleIndex + 1) / visibleSteps.length) * 100;
  const isLast = step === STEPS.length - 1;
  const stepTitle =
    current.id === "reason" ? (isPsychological ? "Test details" : "Reason for counseling") : current.title;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      {/* ── Wizard header ───────────────────────────────────────────── */}
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
              {isPsychological ? "Psychological test request" : "Counseling appointment"}
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight truncate">
              {stepTitle}
            </h2>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-medium text-gray-700">
            Step {visibleIndex + 1} <span className="text-gray-400">of {visibleSteps.length}</span>
          </p>
          <div className="mt-2 w-32 sm:w-44 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-maroon-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Two-column body ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: step content */}
        <div className="lg:col-span-2 space-y-4">
          {current.id === "details" && (
            <>
              <RequestTypeStep form={form} setField={setField} />
              <DetailsStep currentUser={currentUser} myRecord={myRecord} form={form} setField={setField} />
            </>
          )}
          {current.id === "priority" && <PriorityStep form={form} setField={setField} />}
          {current.id === "schedule" && (
            <ScheduleStep
              form={form}
              setField={setField}
              selectSlot={selectSlot}
              firstAvail={firstAvail}
              quickBook={quickBook}
            />
          )}
          {current.id === "reason" && <ReasonStep form={form} setField={setField} />}
          {current.id === "consent" && (
            <ConsentStep setField={setField} currentUser={currentUser} />
          )}
          {current.id === "review" && (
            <ReviewStep
              printRef={printRef}
              currentUser={currentUser}
              myRecord={myRecord}
              form={form}
              onJump={setStep}
            />
          )}

          {/* Footer nav */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" onClick={goBack} className={BTN.secondary}>
              <ArrowLeft size={14} /> Back
            </button>
            {isLast ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={handlePrint} className={BTN.secondary}>
                  <Printer size={14} /> Print
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitted}
                  className={BTN.primary}
                >
                  {submitted ? "Submitting…" : "Submit request"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={!stepValid()}
                className={BTN.primary}
              >
                Continue <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right: sticky booking summary */}
        <div className="lg:col-span-1">
          <BookingSummary currentUser={currentUser} myRecord={myRecord} form={form} />
        </div>
      </div>

      {/* ── Success modal (unchanged) ──────────────────────────────── */}
      <Modal
        open={successModal.open}
        onClose={() => setSuccessModal({ open: false, data: null })}
        title={
          successModal.data?.requestType === "psychological"
            ? "Test Request Submitted"
            : "Appointment Request Submitted"
        }
        size="md"
        footer={
          <button
            onClick={() => setSuccessModal({ open: false, data: null })}
            className={`${BTN.primary} w-full sm:w-auto`}
          >
            Close
          </button>
        }
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2 animate-fade-in-up">
            {successModal.data?.requestType === "psychological"
              ? "Test Request Submitted Successfully!"
              : "Appointment Request Submitted Successfully!"}
          </h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-sm">
            Your request has been recorded. The Guidance and Counseling team will review it and
            notify you of the status.
          </p>

          <div className="w-full bg-gray-50 border border-gray-100 rounded-lg p-4 text-left space-y-2.5">
            <SummaryRow label="Student Name:" value={currentUser?.name} />
            {successModal.data?.requestType === "psychological" ? (
              <SummaryRow label="Test Type:" value={successModal.data?.testType} />
            ) : null}
            <SummaryRow label="Preferred Date:" value={formatLong(successModal.data?.date)} mono />
            {successModal.data?.requestType !== "psychological" && (
              <div className="flex justify-between text-xs border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500 font-medium">Priority:</span>
                <span
                  className={`font-semibold ${
                    successModal.data?.isUrgent ? "text-red-600 font-bold" : "text-emerald-600"
                  }`}
                >
                  {successModal.data?.isUrgent ? "Urgent" : "Normal"}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Preferred Times:</span>
              <span
                className="text-gray-900 font-semibold truncate max-w-[200px]"
                title={successModal.data?.preferredSlots?.join(", ")}
              >
                {successModal.data?.preferredSlots?.join(", ")}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Step: Request type (counseling vs. psychological test)
──────────────────────────────────────────────────────────────────── */
function RequestTypeStep({ form, setField }) {
  return (
    <StepCard
      icon={Info}
      title="What would you like to request?"
      subtitle="Choose the type of request, then continue."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TypeOption
          active={form.requestType === "counseling"}
          onClick={() => setField({ requestType: "counseling" })}
          icon={MessageCircle}
          title="Counseling appointment"
          desc="Talk with a counselor about personal, academic, or emotional concerns."
        />
        <TypeOption
          active={form.requestType === "psychological"}
          onClick={() => setField({ requestType: "psychological" })}
          icon={Brain}
          title="Psychological test"
          desc="Request a psychological, personality, or career assessment."
        />
      </div>
    </StepCard>
  );
}

function TypeOption({ active, onClick, icon: Icon, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition ${
        active ? "border-maroon-300 bg-maroon-50 ring-2 ring-maroon-200" : "border-gray-200 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={16} className={active ? "text-maroon-600" : "text-gray-400"} />}
        <span className={`text-sm font-semibold ${active ? "text-gray-900" : "text-gray-700"}`}>{title}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Step: Your details
──────────────────────────────────────────────────────────────────── */
function DetailsStep({ currentUser, myRecord, form, setField }) {
  return (
    <StepCard
      icon={UserRound}
      title="Confirm your details"
      subtitle="Verified from your profile. Add a contact number we can reach you on."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ReadOnly label="Name" value={currentUser?.name} />
        <ReadOnly label="Student ID" value={myRecord?.studentId || "N/A"} />
        <ReadOnly label="College" value={myRecord?.college || "N/A"} />
        <div>
          <label className={LABEL}>Phone number *</label>
          <input
            type="tel"
            required
            className={INPUT}
            value={form.phoneNumber}
            onChange={(e) => setField({ phoneNumber: e.target.value })}
            placeholder="e.g. 09123456789"
          />
        </div>
      </div>
    </StepCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Step: Priority
──────────────────────────────────────────────────────────────────── */
function PriorityStep({ form, setField }) {
  return (
    <StepCard
      icon={Zap}
      title="How soon do you need this?"
      subtitle="Mark as urgent only if you need immediate attention."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PriorityOption
          active={!form.isUrgent}
          onClick={() => setField({ isUrgent: false })}
          title="Normal"
          desc="Standard scheduling within available slots."
          tone="emerald"
        />
        <PriorityOption
          active={form.isUrgent}
          onClick={() => setField({ isUrgent: true })}
          title="Urgent"
          desc="Immediate attention required. Prioritized by DSA."
          tone="red"
        />
      </div>
    </StepCard>
  );
}

function PriorityOption({ active, onClick, title, desc, tone }) {
  const ring =
    tone === "red"
      ? active
        ? "border-red-300 bg-red-50 ring-2 ring-red-200"
        : "border-gray-200 hover:bg-gray-50"
      : active
      ? "border-maroon-300 bg-maroon-50 ring-2 ring-maroon-200"
      : "border-gray-200 hover:bg-gray-50";
  return (
    <button type="button" onClick={onClick} className={`text-left rounded-xl border p-4 transition ${ring}`}>
      <div className="flex items-center gap-2 mb-1">
        {tone === "red" ? (
          <AlertTriangle size={16} className={active ? "text-red-600" : "text-gray-400"} />
        ) : (
          <CheckCircle2 size={16} className={active ? "text-maroon-600" : "text-gray-400"} />
        )}
        <span className={`text-sm font-semibold ${active ? "text-gray-900" : "text-gray-700"}`}>
          {title}
        </span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Step: Pick a schedule  (the centerpiece)
──────────────────────────────────────────────────────────────────── */
function ScheduleStep({ form, setField, selectSlot, firstAvail, quickBook }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = startOfToday();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const prevMonth = () =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const canGoPrev = viewMonth > new Date(startOfToday().getFullYear(), startOfToday().getMonth(), 1);
  const rightMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);

  return (
    <StepCard
      icon={CalendarDays}
      title="Pick a date & time"
      subtitle="Choose a preferred date, then a time slot that works for you."
    >
      {/* First availability banner */}
      <button
        type="button"
        onClick={quickBook}
        className="w-full mb-5 flex items-center justify-between gap-3 rounded-xl border border-maroon-200 bg-maroon-50 px-4 py-3 text-left transition hover:bg-maroon-100"
      >
        <span className="flex items-center gap-2.5 text-sm text-maroon-900">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white text-maroon-600 ring-1 ring-maroon-200">
            <Zap size={15} />
          </span>
          <span>
            <span className="font-medium">First availability:</span>{" "}
            {formatLong(firstAvail.iso)}, {firstAvail.slot.label}
          </span>
        </span>
        <span className="text-xs font-semibold text-maroon-700 whitespace-nowrap">Quick book →</span>
      </button>

      {/* Dual-month calendar */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-gray-500">Weekends & past dates unavailable</span>
        <button
          type="button"
          onClick={nextMonth}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <MonthGrid month={viewMonth} selected={form.date} onSelect={(iso) => setField({ date: iso })} />
        <MonthGrid month={rightMonth} selected={form.date} onSelect={(iso) => setField({ date: iso })} />
      </div>

      {/* Time slots */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Preferred time slot</span>
        </div>
        {!form.date && (
          <p className="text-xs text-gray-400 mb-3">Select a date above to choose a time slot.</p>
        )}
        <TimeGroup
          label="Morning"
          slots={TIME_SLOTS_MORNING}
          selected={form.preferredSlots}
          onSelect={selectSlot}
          disabled={!form.date}
        />
        <TimeGroup
          label="Afternoon"
          slots={TIME_SLOTS_AFTERNOON}
          selected={form.preferredSlots}
          onSelect={selectSlot}
          disabled={!form.date}
        />
      </div>
    </StepCard>
  );
}

function MonthGrid({ month, selected, onSelect }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <p className="text-sm font-semibold text-gray-900 text-center mb-2">
        {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </p>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d} className="text-[11px] font-medium text-gray-400 text-center py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`b-${i}`} />;
          const date = new Date(year, m, day);
          const iso = toISO(date);
          const selectable = isSelectableDate(date);
          const isSelected = selected === iso;
          return (
            <button
              key={iso}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(iso)}
              className={[
                "h-9 w-full rounded-full text-sm tabular-nums transition",
                isSelected
                  ? "bg-maroon-500 text-white font-semibold shadow-sm"
                  : selectable
                  ? "text-gray-700 hover:bg-maroon-50 hover:text-maroon-700"
                  : "text-gray-300 cursor-not-allowed line-through decoration-gray-200",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeGroup({ label, slots, selected, onSelect, disabled }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => {
          const active = selected.includes(slot.value);
          return (
            <button
              key={slot.value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(slot.value)}
              className={[
                "px-3.5 py-2 rounded-full text-sm tabular-nums border transition",
                active
                  ? "bg-maroon-500 border-maroon-500 text-white font-medium shadow-sm"
                  : "bg-white border-gray-200 text-gray-700 hover:border-maroon-300 hover:bg-maroon-50",
                disabled ? "opacity-50 cursor-not-allowed hover:bg-white hover:border-gray-200" : "",
              ].join(" ")}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Step: Reason / Test details
──────────────────────────────────────────────────────────────────── */
function ReasonStep({ form, setField }) {
  if (form.requestType === "psychological") {
    return (
      <StepCard
        icon={Brain}
        title="Test details"
        subtitle="Tell us what kind of assessment you'd like, and add any notes."
      >
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Test type *</label>
            <select
              className={INPUT}
              value={form.testType}
              onChange={(e) => setField({ testType: e.target.value })}
            >
              <option>Psychological Test</option>
              <option>Personality Test</option>
              <option>Career Assessment</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Reason / notes (optional)</label>
            <textarea
              rows={5}
              className={INPUT}
              value={form.reason}
              onChange={(e) => setField({ reason: e.target.value })}
              placeholder="Any specific concerns or context…"
            />
          </div>
        </div>
      </StepCard>
    );
  }
  return (
    <StepCard
      icon={Info}
      title="What would you like to discuss?"
      subtitle="Share as much or as little as you're comfortable with."
    >
      <textarea
        required
        rows={7}
        className={INPUT}
        value={form.reason}
        onChange={(e) => setField({ reason: e.target.value })}
        placeholder="Please describe your concern or reason for seeking counseling…"
      />
    </StepCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Step: Informed consent
──────────────────────────────────────────────────────────────────── */
function ConsentStep({ setField, currentUser }) {
  return (
    <StepCard icon={ShieldCheck} title="Informed consent" subtitle="Please read and sign before continuing.">
      <InformedConsentSection
        currentUser={currentUser}
        onConsentChange={(signed) => setField({ acknowledged: signed })}
      />
    </StepCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Step: Review & submit (printable slip)
──────────────────────────────────────────────────────────────────── */
function ReviewStep({ printRef, currentUser, myRecord, form, onJump }) {
  return (
    <StepCard
      icon={CheckCircle2}
      title="Review your request"
      subtitle="Check everything is correct, then submit or print."
    >
      <div ref={printRef} className="space-y-4 print:space-y-2">
        <ReviewBlock title="Student details" onEdit={() => onJump(0)}>
          <ReviewLine label="Name" value={currentUser?.name} />
          <ReviewLine label="Student ID" value={myRecord?.studentId || "N/A"} />
          <ReviewLine label="College" value={myRecord?.college || "N/A"} />
          <ReviewLine label="Phone" value={form.phoneNumber} />
        </ReviewBlock>

        <ReviewBlock title={form.requestType === "psychological" ? "Test request" : "Appointment"} onEdit={() => onJump(2)}>
          {form.requestType === "psychological" ? (
            <ReviewLine label="Test type" value={form.testType} />
          ) : (
            <ReviewLine label="Priority" value={form.isUrgent ? "Urgent" : "Normal"} />
          )}
          <ReviewLine label="Preferred date" value={formatLong(form.date)} />
          <ReviewLine label="Preferred times" value={form.preferredSlots.map(slotLabel).join(", ")} />
        </ReviewBlock>

        <ReviewBlock title={form.requestType === "psychological" ? "Additional notes" : "Reason"} onEdit={() => onJump(3)}>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.reason || "—"}</p>
        </ReviewBlock>

        {/* Signatures — for the printed slip */}
        <div className="hidden print:grid grid-cols-2 gap-6 pt-4">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-3">Student signature</p>
            <div className="border-t-2 border-gray-400 pt-1.5 text-center">
              <p className="text-xs text-gray-600">Sign above the line</p>
            </div>
            <p className="text-xs text-gray-600 mt-2">{currentUser?.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700 mb-3">Authorized personnel</p>
            <div className="border-t-2 border-gray-400 pt-1.5 text-center">
              <p className="text-xs text-gray-600">Sign above the line</p>
            </div>
            <p className="text-xs text-gray-600 mt-2">(DSA personnel)</p>
          </div>
        </div>
      </div>
    </StepCard>
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

/* ────────────────────────────────────────────────────────────────────
   Right column: sticky booking summary
──────────────────────────────────────────────────────────────────── */
function BookingSummary({ currentUser, myRecord, form }) {
  const hasSchedule = form.date && form.preferredSlots.length > 0;
  return (
    <div className="lg:sticky lg:top-6 bg-white rounded-2xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Booking summary</h3>
        <p className="text-xs text-gray-500 mt-0.5">Updates as you go</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Location */}
        <InfoRow icon={MapPin} label="Location">
          <p className="text-sm font-medium text-gray-900">Guidance &amp; Counseling Office</p>
          <p className="text-xs text-gray-500">DSA Building · On-campus</p>
        </InfoRow>

        {/* Service */}
        <InfoRow icon={Info} label="Service">
          <p className="text-sm font-medium text-gray-900">
            {form.requestType === "psychological" ? form.testType : "Counseling session"}
          </p>
          {form.requestType !== "psychological" && (
            <span
              className={`inline-flex items-center mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                form.isUrgent ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {form.isUrgent ? "Urgent" : "Normal priority"}
            </span>
          )}
        </InfoRow>

        {/* Counselor */}
        <InfoRow icon={UserRound} label="Counselor">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold ring-1 ring-gray-200">
              ?
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">To be assigned</p>
              <p className="text-xs text-gray-500">Matched by DSA after review</p>
            </div>
          </div>
        </InfoRow>

        {/* Student */}
        <InfoRow icon={UserRound} label="Requested by">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-maroon-100 text-maroon-700 text-xs font-semibold">
              {initialsOf(currentUser?.name || "")}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.name}</p>
              <p className="text-xs text-gray-500">{myRecord?.studentId || "—"}</p>
            </div>
          </div>
        </InfoRow>

        {/* Schedule status */}
        <div className="border-t border-gray-100 pt-3">
          {hasSchedule ? (
            <div className="rounded-lg bg-maroon-50 border border-maroon-100 px-3 py-2.5">
              <p className="text-xs font-medium text-maroon-700 mb-1 flex items-center gap-1.5">
                <CalendarDays size={13} /> {formatLong(form.date)}
              </p>
              <div className="flex flex-wrap gap-1">
                {form.preferredSlots.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] font-medium text-maroon-800 bg-white rounded px-1.5 py-0.5 ring-1 ring-maroon-100"
                  >
                    {slotLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Clock size={13} /> No schedule selected yet.
            </p>
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

/* ────────────────────────────────────────────────────────────────────
   Small shared bits
──────────────────────────────────────────────────────────────────── */
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

function ReadOnly({ label, value }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input type="text" disabled className={INPUT} value={value || ""} />
    </div>
  );
}

function SummaryRow({ label, value, mono }) {
  return (
    <div className="flex justify-between text-xs border-b border-gray-200/60 pb-1.5">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className={`text-gray-900 font-semibold ${mono ? "tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}
