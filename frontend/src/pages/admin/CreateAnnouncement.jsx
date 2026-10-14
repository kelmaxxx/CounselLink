import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import {
  ArrowLeft,
  ArrowRight,
  Megaphone,
  Users,
  GraduationCap,
  Shield,
  Building2,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  X,
  Send,
  CheckCircle2,
} from "lucide-react";
import { BTN, INPUT, LABEL, Modal } from "../../components/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const STEPS = [
  { id: "content", title: "Announcement content" },
  { id: "audience", title: "Audience" },
  { id: "schedule", title: "Schedule" },
  { id: "review", title: "Review & send" },
];

const AUDIENCES = [
  { value: "all", label: "All users", desc: "Students, counselors, and colleges", icon: Users },
  { value: "students", label: "Students only", desc: "Every enrolled student", icon: GraduationCap },
  { value: "counselors", label: "Counselors only", desc: "Counseling staff", icon: Shield },
  { value: "reps", label: "Colleges only", desc: "College representatives", icon: Building2 },
];
const audienceLabel = (v) => AUDIENCES.find((a) => a.value === v)?.label || v;

// ── Local date helpers (timezone-safe, same as student flow) ──────────
const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const formatLong = (iso) => {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const initialForm = {
  title: "",
  message: "",
  sendTo: "all",
  postMode: "now", // now | scheduled
  postDate: "",
  postTime: "09:00",
  removeMode: "indefinite", // indefinite | scheduled
  removeDate: "",
  removeTime: "17:00",
};

export default function CreateAnnouncement() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addNotification } = useNotifications();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [pubmatFile, setPubmatFile] = useState(null);
  const [pubmatPreview, setPubmatPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const setField = (patch) => setForm((f) => ({ ...f, ...patch }));

  const postISO =
    form.postMode === "scheduled" && form.postDate
      ? `${form.postDate}T${form.postTime || "09:00"}`
      : null;
  const removeISO =
    form.removeMode === "scheduled" && form.removeDate
      ? `${form.removeDate}T${form.removeTime || "09:00"}`
      : null;

  // ── Per-step validation ────────────────────────────────────────
  const stepValid = (i = step) => {
    switch (STEPS[i].id) {
      case "content":
        return form.title.trim().length > 0 && form.message.trim().length > 0;
      case "audience":
        return true;
      case "schedule": {
        if (form.postMode === "scheduled" && !form.postDate) return false;
        if (form.removeMode === "scheduled" && !form.removeDate) return false;
        if (postISO && removeISO && removeISO <= postISO) return false;
        if (!postISO && removeISO && new Date(removeISO) <= new Date()) return false;
        return true;
      }
      default:
        return true;
    }
  };
  const scheduleError =
    postISO && removeISO && removeISO <= postISO
      ? "Removal must be after the post date."
      : !postISO && removeISO && new Date(removeISO) <= new Date()
        ? "Removal must be in the future."
        : "";

  const goBack = () => {
    if (step === 0) return navigate(-1);
    setStep((s) => s - 1);
  };
  const goNext = () => {
    if (!stepValid()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handlePubmatChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pubmatPreview) URL.revokeObjectURL(pubmatPreview);
    setPubmatFile(file);
    setPubmatPreview(URL.createObjectURL(file));
  };
  const removePubmat = () => {
    if (pubmatPreview) URL.revokeObjectURL(pubmatPreview);
    setPubmatFile(null);
    setPubmatPreview(null);
  };

  const resetAll = () => {
    setForm(initialForm);
    removePubmat();
    setStep(0);
    setError("");
  };

  const handleSubmit = async () => {
    if (!stepValid(0) || !stepValid(2)) {
      setError("Please complete the required fields before sending.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      let imageUrl;
      if (pubmatFile) {
        const fd = new FormData();
        fd.append("pubmat", pubmatFile);
        const uploadRes = await fetch(`${API_BASE}/api/uploads/pubmat`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.message || "Unable to upload Pubmat image");
        }
        imageUrl = uploadData.pubmatUrl;
      }

      const result = await addNotification({
        title: form.title.trim(),
        message: form.message.trim(),
        sendTo: form.sendTo,
        imageUrl,
        postAt: postISO,
        removeAt: removeISO,
      });
      setSuccess(result);
    } catch (err) {
      setError(err.message || "Failed to create announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      {/* ── Wizard header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0 mb-3">
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
            Administrator
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight truncate">
            {current.title}
          </h2>
        </div>
      </div>

      {/* Step indicator — above the white content card */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Step {step + 1} <span className="text-gray-400">of {STEPS.length}</span>
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-maroon-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-md border text-sm bg-red-50 border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* ── Two-column body ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: step content */}
        <div className="lg:col-span-2 space-y-4">
          {current.id === "content" && (
            <ContentStep
              form={form}
              setField={setField}
              pubmatPreview={pubmatPreview}
              onPubmatChange={handlePubmatChange}
              onRemovePubmat={removePubmat}
            />
          )}
          {current.id === "audience" && <AudienceStep form={form} setField={setField} />}
          {current.id === "schedule" && (
            <ScheduleStep
              form={form}
              setField={setField}
              postISO={postISO}
              removeISO={removeISO}
              scheduleError={scheduleError}
            />
          )}
          {current.id === "review" && (
            <ReviewStep
              form={form}
              pubmatPreview={pubmatPreview}
              postISO={postISO}
              removeISO={removeISO}
              onJump={setStep}
            />
          )}

          {/* Footer nav */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" onClick={goBack} className={BTN.secondary}>
              <ArrowLeft size={14} /> Back
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !stepValid(0) || !stepValid(2)}
                className={BTN.primary}
              >
                <Send size={14} /> {submitting ? "Sending…" : "Send announcement"}
              </button>
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

        {/* Right: sticky announcement summary */}
        <div className="lg:col-span-1">
          <AnnouncementSummary form={form} pubmatPreview={pubmatPreview} postISO={postISO} removeISO={removeISO} />
        </div>
      </div>

      {/* ── Success modal ───────────────────────────────────────────── */}
      <Modal
        open={!!success}
        onClose={() => { setSuccess(null); resetAll(); }}
        title="Announcement sent!"
        subtitle={success?.recipientCount ? `Broadcast to ${success.recipientCount} user(s).` : "Your announcement is now live."}
        footer={
          <button onClick={() => { setSuccess(null); resetAll(); }} className={`${BTN.primary} w-full sm:w-auto`}>
            Create another
          </button>
        }
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">
            <CheckCircle2 size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{form.title || "(untitled)"}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {audienceLabel(form.sendTo)}
              {postISO ? ` · posts ${formatLong(form.postDate)}` : " · posting now"}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Step 1: content (pubmat + title + message)
──────────────────────────────────────────────────────────────────── */
function ContentStep({ form, setField, pubmatPreview, onPubmatChange, onRemovePubmat }) {
  return (
    <StepCard
      icon={Megaphone}
      title="What do you want to say?"
      subtitle="Title, body, and an optional Pubmat image."
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL}>Pubmat (optional)</label>
          {pubmatPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={pubmatPreview}
                alt="Pubmat preview"
                className="w-full max-h-72 object-contain"
              />
              <button
                type="button"
                onClick={onRemovePubmat}
                className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition cursor-pointer py-8 text-center">
              <ImagePlus size={22} className="text-gray-400" />
              <span className="text-sm text-gray-600">
                Upload an event poster (Pubmat) to make this announcement more engaging
              </span>
              <span className="text-xs text-gray-400">JPG, PNG, or WEBP — up to 25MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onPubmatChange}
              />
            </label>
          )}
        </div>

        <div>
          <label className={LABEL}>Title *</label>
          <input
            type="text"
            className={INPUT}
            value={form.title}
            onChange={(e) => setField({ title: e.target.value })}
            placeholder="e.g. Counseling office hours updated"
          />
        </div>

        <div>
          <label className={LABEL}>Message *</label>
          <textarea
            rows={6}
            className={INPUT}
            value={form.message}
            onChange={(e) => setField({ message: e.target.value })}
            placeholder="Type your announcement message here…"
          />
        </div>
      </div>
    </StepCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Step 2: audience option cards
──────────────────────────────────────────────────────────────────── */
function AudienceStep({ form, setField }) {
  return (
    <StepCard
      icon={Users}
      title="Who should see this?"
      subtitle="Pick the audience for this broadcast."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AUDIENCES.map((a) => {
          const active = form.sendTo === a.value;
          const Icon = a.icon;
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => setField({ sendTo: a.value })}
              className={[
                "rounded-xl border p-4 text-left transition",
                active
                  ? "bg-maroon-500 border-maroon-500 ring-2 ring-maroon-300"
                  : "bg-white border-gray-200 hover:border-maroon-300 hover:bg-maroon-50",
              ].join(" ")}
            >
              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-2 ${active ? "bg-white text-maroon-600" : "bg-maroon-50 text-maroon-600"}`}>
                <Icon size={17} />
              </span>
              <p className={`text-sm font-semibold ${active ? "text-white" : "text-gray-900"}`}>{a.label}</p>
              <p className={`text-xs mt-0.5 ${active ? "text-maroon-100" : "text-gray-500"}`}>{a.desc}</p>
            </button>
          );
        })}
      </div>
    </StepCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Step 3: schedule (calendar date pickers + times)
──────────────────────────────────────────────────────────────────── */
function ScheduleStep({ form, setField, postISO, removeISO, scheduleError }) {
  return (
    <div className="space-y-4">
      <StepCard
        icon={CalendarDays}
        title="When should it post?"
        subtitle="Leave it immediate, or pick a date on the calendar."
      >
        <ModePills
          value={form.postMode}
          onChange={(v) => setField({ postMode: v })}
          options={[
            { value: "now", label: "Post immediately" },
            { value: "scheduled", label: "Schedule post date" },
          ]}
        />
        {form.postMode === "scheduled" && (
          <div className="mt-4">
            <DatePickCard
              date={form.postDate}
              time={form.postTime}
              onDate={(iso) => setField({ postDate: iso })}
              onTime={(t) => setField({ postTime: t })}
              onClear={() => setField({ postDate: "" })}
              minISO={toISO(startOfToday())}
            />
          </div>
        )}
      </StepCard>

      <StepCard
        icon={Clock}
        title="When should it expire?"
        subtitle="Keep it active indefinitely, or pick a removal date."
      >
        <ModePills
          value={form.removeMode}
          onChange={(v) => setField({ removeMode: v })}
          options={[
            { value: "indefinite", label: "Keep active" },
            { value: "scheduled", label: "Schedule removal" },
          ]}
        />
        {form.removeMode === "scheduled" && (
          <div className="mt-4">
            <DatePickCard
              date={form.removeDate}
              time={form.removeTime}
              onDate={(iso) => setField({ removeDate: iso })}
              onTime={(t) => setField({ removeTime: t })}
              onClear={() => setField({ removeDate: "" })}
              minISO={form.postDate || toISO(startOfToday())}
            />
          </div>
        )}
        {scheduleError && (
          <div className="mt-3 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            {scheduleError}
          </div>
        )}
        {!scheduleError && (postISO || removeISO) && (
          <p className="mt-3 text-xs text-gray-500 tabular-nums">
            {postISO ? `Posts ${formatLong(form.postDate)} · ${form.postTime}` : "Posts immediately"}
            {removeISO ? `  ·  removes ${formatLong(form.removeDate)} · ${form.removeTime}` : "  ·  stays active"}
          </p>
        )}
      </StepCard>
    </div>
  );
}

function ModePills({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`h-9 px-4 rounded-lg text-sm font-medium transition ${
            value === o.value
              ? "bg-white text-maroon-700 shadow-sm ring-1 ring-gray-200"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DatePickCard({ date, time, onDate, onTime, onClear, minISO }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const base = date
      ? new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1)
      : startOfToday();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const prevMonth = () =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const monthStart = new Date(startOfToday().getFullYear(), startOfToday().getMonth(), 1);
  const canGoPrev = viewMonth > monthStart;
  const isSelectable = (d) => toISO(d) >= (minISO || toISO(startOfToday()));

  return (
    <div className="rounded-xl border border-gray-200 p-4">
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
        <span className="text-xs text-gray-500">Past dates unavailable</span>
        <button
          type="button"
          onClick={nextMonth}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <MonthGrid month={viewMonth} selected={date} onSelect={onDate} isSelectable={isSelectable} />

      <div className="flex items-center gap-3 mt-4">
        <div className="flex-1">
          <label className={LABEL}>Time</label>
          <input
            type="time"
            className={INPUT}
            value={time}
            onChange={(e) => onTime(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className={LABEL}>Selected</label>
          <p className="text-sm font-medium text-gray-900 tabular-nums h-[42px] flex items-center">
            {date ? `${formatLong(date)}` : "No date yet"}
          </p>
        </div>
        {date && (
          <button
            type="button"
            onClick={onClear}
            className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 transition"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

function MonthGrid({ month, selected, onSelect, isSelectable }) {
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
          const selectable = isSelectable(date);
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

/* ────────────────────────────────────────────────────────────────────
   Step 4: review
──────────────────────────────────────────────────────────────────── */
function ReviewStep({ form, pubmatPreview, postISO, removeISO, onJump }) {
  return (
    <div className="space-y-4">
      <ReviewCard title="Content" onEdit={() => onJump(0)}>
        {pubmatPreview && (
          <img src={pubmatPreview} alt="Pubmat" className="rounded-lg border border-gray-200 max-h-40 object-contain mb-3" />
        )}
        <p className="text-sm font-semibold text-gray-900">{form.title || "(no title)"}</p>
        <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{form.message || "(no message)"}</p>
      </ReviewCard>
      <ReviewCard title="Audience" onEdit={() => onJump(1)}>
        <p className="text-sm font-medium text-gray-900">{audienceLabel(form.sendTo)}</p>
      </ReviewCard>
      <ReviewCard title="Schedule" onEdit={() => onJump(2)}>
        <p className="text-sm text-gray-700 tabular-nums">
          {postISO ? `Posts ${formatLong(form.postDate)} · ${form.postTime}` : "Posts immediately"}
        </p>
        <p className="text-sm text-gray-700 tabular-nums mt-0.5">
          {removeISO ? `Removes ${formatLong(form.removeDate)} · ${form.removeTime}` : "Stays active indefinitely"}
        </p>
      </ReviewCard>
    </div>
  );
}

function ReviewCard({ title, onEdit, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-950/5">
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-maroon-700 hover:underline"
        >
          Edit
        </button>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Right: sticky announcement summary (updates as you go)
──────────────────────────────────────────────────────────────────── */
function AnnouncementSummary({ form, pubmatPreview, postISO, removeISO }) {
  return (
    <div className="lg:sticky lg:top-6 bg-white rounded-2xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Announcement summary</h3>
        <p className="text-xs text-gray-500 mt-0.5">Updates as you go</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        <InfoRow icon={Megaphone} label="Content">
          <p className="text-sm font-medium text-gray-900 truncate">{form.title || "Untitled"}</p>
          <p className="text-xs text-gray-500 line-clamp-2">{form.message || "No message yet."}</p>
        </InfoRow>

        <InfoRow icon={Users} label="Audience">
          <p className="text-sm font-medium text-gray-900">{audienceLabel(form.sendTo)}</p>
        </InfoRow>

        <InfoRow icon={CalendarDays} label="Schedule">
          <p className="text-sm font-medium text-gray-900 tabular-nums">
            {postISO ? `${formatLong(form.postDate)}` : "Posts immediately"}
          </p>
          <p className="text-xs text-gray-500 tabular-nums">
            {removeISO ? `Removes ${formatLong(form.removeDate)}` : "Stays active"}
          </p>
        </InfoRow>

        <div className="border-t border-gray-100 pt-3">
          {pubmatPreview ? (
            <img src={pubmatPreview} alt="Pubmat" className="rounded-lg border border-gray-200 max-h-32 w-full object-cover" />
          ) : (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <ImagePlus size={13} /> No Pubmat attached.
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
