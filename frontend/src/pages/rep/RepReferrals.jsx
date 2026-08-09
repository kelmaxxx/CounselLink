import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useReferrals } from "../../context/ReferralsContext";
import { getDepartments } from "../../data/msuColleges";
import { Send, Plus, History } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  StatusPill,
  Modal,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
} from "../../components/ui";
import { sanitizePhoneDigits, isValidPhMobile, PHONE_HINT } from "../../utils/phone";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const NATURE_OF_CONCERN_OPTIONS = [
  "Academic Concern",
  "Behavioral Concern",
  "Mental Health Concern",
  "Family Problem",
  "Social/Relationship Concern",
  "Other",
];

export default function RepReferrals() {
  const { currentUser, token } = useAuth();
  const { referrals, loading, error, fetchReferrals, cancelReferral } = useReferrals();
  const [activeTab, setActiveTab] = useState("pending");
  const [newOpen, setNewOpen] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const myReferrals = useMemo(
    () => referrals.filter((r) => r.referrer_id === currentUser?.id),
    [referrals, currentUser?.id]
  );
  const pending = useMemo(
    () => myReferrals.filter((r) => r.status === "pending"),
    [myReferrals]
  );
  const history = useMemo(
    () => myReferrals.filter((r) => r.status !== "pending"),
    [myReferrals]
  );
  const filtered = activeTab === "pending" ? pending : history;

  const confirmCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    await cancelReferral(cancelId);
    setCancelling(false);
    setCancelId(null);
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="College"
        title="Referrals"
        subtitle="Refer students from your college to a counselor."
        actions={
          <button onClick={() => setNewOpen(true)} className={BTN.primary}>
            <Plus size={15} /> New referral
          </button>
        }
      />

      <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
        <TabBtn
          active={activeTab === "pending"}
          onClick={() => setActiveTab("pending")}
          icon={<Send size={14} />}
          count={pending.length}
        >
          Pending
        </TabBtn>
        <TabBtn
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          icon={<History size={14} />}
          count={history.length}
        >
          History
        </TabBtn>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <SectionCard
        title={activeTab === "pending" ? "Pending referrals" : "Referral history"}
        subtitle={
          activeTab === "pending"
            ? "Awaiting the counselor's decision"
            : "Accepted, rescheduled, declined, or cancelled referrals"
        }
        noBodyPadding
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={activeTab === "pending" ? Send : History}
            title={
              activeTab === "pending" ? "No pending referrals" : "No history yet"
            }
            hint={
              activeTab === "pending"
                ? 'Use "New referral" to hand off a student to a counselor.'
                : "Resolved referrals will appear here."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Counselor</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Created</th>
                  {activeTab === "pending" && <th className="px-4 py-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initialsOf(r.studentName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {r.studentName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {r.studentDepartment || r.studentCollege || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.receivingCounselorName ? (
                        <span className="text-gray-700">{r.receivingCounselorName}</span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">To Be Approve</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <p className="text-gray-700 line-clamp-2">{r.reason}</p>
                      {r.decision_note && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="font-medium">Note:</span> {r.decision_note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    {activeTab === "pending" && (
                      <td className="px-4 py-3 text-right">
                        {r.status === "pending" && (
                          <button
                            onClick={() => setCancelId(r.id)}
                            className="inline-flex items-center h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {newOpen && (
        <NewReferralModal
          token={token}
          currentUser={currentUser}
          onClose={() => setNewOpen(false)}
          onCreated={() => fetchReferrals()}
        />
      )}

      <Modal
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancel this referral?"
        subtitle="The referral will be withdrawn and the counselor will be notified."
        danger
        footer={
          <>
            <button
              type="button"
              className={BTN.secondary}
              onClick={() => setCancelId(null)}
              disabled={cancelling}
            >
              Keep it
            </button>
            <button
              type="button"
              className={BTN.danger}
              onClick={confirmCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling…" : "Yes, cancel referral"}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-700 leading-relaxed">
          Are you sure you want to cancel this referral? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function TabBtn({ active, onClick, children, icon, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
        active
          ? "text-maroon-700 border-maroon-600"
          : "text-gray-500 border-transparent hover:text-gray-900"
      }`}
    >
      {icon}
      {children}
      {typeof count === "number" && (
        <span
          className={`ml-1 inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold tabular-nums ${
            active ? "bg-maroon-100 text-maroon-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

const EMPTY_REFERRAL_FORM = {
  firstName: "",
  middleName: "",
  familyName: "",
  studentIdNumber: "",
  department: "",
  referrerContactNumber: "",
  referrerPosition: "",
  referrerDepartment: "",
  natureOfConcern: "",
  natureOfConcernOther: "",
  description: "",
};

function NewReferralModal({ token, currentUser, onClose, onCreated }) {
  const myDepartments = getDepartments(currentUser?.college);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({
    ...EMPTY_REFERRAL_FORM,
    referrerContactNumber: currentUser?.phone || "",
    referrerPosition: currentUser?.position || "",
    referrerDepartment: currentUser?.department || "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const STEPS = [
    { number: 1, title: "Student Info" },
    { number: 2, title: "Referrer Info" },
    { number: 3, title: "Concern & Details" },
  ];

  const validateStep = (s) => {
    if (s === 1) {
      if (!form.firstName.trim()) return "Student First Name is required.";
      if (!form.middleName.trim()) return "Student Middle Name is required.";
      if (!form.familyName.trim()) return "Student Family Name is required.";
      if (!form.studentIdNumber.trim()) return "Student ID is required.";
      if (!/^\d{9}$/.test(form.studentIdNumber.trim())) return "Student ID must be exactly 9 digits.";
      if (!form.department.trim()) return "Student Department is required.";
    }
    if (s === 2) {
      if (!form.referrerContactNumber.trim()) return "Referrer Contact Number is required.";
      if (!/^09\d{9}$/.test(form.referrerContactNumber.trim())) return "Referrer contact number must start with 09 and be exactly 11 digits.";
      if (!form.referrerPosition.trim()) return "Referrer Position is required.";
      if (!form.referrerDepartment.trim()) return "Referrer Department is required.";
    }
    if (s === 3) {
      if (!form.natureOfConcern.trim()) return "Nature of concern is required.";
      if (form.natureOfConcern === "Other" && !form.natureOfConcernOther.trim()) return "Please specify the concern.";
      if (!form.description.trim()) return "Brief description is required.";
    }
    return null;
  };

  const handleNext = () => {
    setError("");
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError("");
    setStep((s) => s - 1);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const err = validateStep(3);
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/referrals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          middleName: form.middleName.trim(),
          familyName: form.familyName.trim(),
          studentIdNumber: form.studentIdNumber.trim(),
          college: currentUser?.college || "",
          department: form.department.trim(),
          referrerContactNumber: form.referrerContactNumber.trim(),
          referrerPosition: form.referrerPosition.trim(),
          referrerDepartment: form.referrerDepartment.trim(),
          natureOfConcern: form.natureOfConcern,
          natureOfConcernOther: form.natureOfConcernOther.trim() || null,
          description: form.description.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Failed");
      } else {
        onCreated?.();
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New referral"
      subtitle="Refer a student for counseling — the referral is sent to all available counselors."
      size="lg"
      align="top"
      footer={
        <div className="flex justify-between items-center w-full">
          {step === 1 ? (
            <button type="button" onClick={onClose} className={BTN.secondary}>
              Cancel
            </button>
          ) : (
            <button type="button" onClick={handleBack} className={BTN.secondary}>
              Back
            </button>
          )}

          {step < 3 ? (
            <button type="button" onClick={handleNext} className={BTN.primary}>
              Next
            </button>
          ) : (
            <button
              type="submit"
              form="new-referral-form"
              disabled={submitting}
              className={BTN.primary}
            >
              {submitting ? "Sending…" : "Send referral"}
            </button>
          )}
        </div>
      }
    >
      <form id="new-referral-form" onSubmit={submit} className="space-y-4">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          {STEPS.map((s) => (
            <div key={s.number} className="flex items-center gap-1.5">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                step === s.number
                  ? "bg-maroon-600 text-white"
                  : step > s.number
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}>
                {s.number}
              </span>
              <span className={`text-xs font-medium hidden sm:inline ${step === s.number ? "text-gray-900 font-semibold" : "text-gray-400"}`}>
                {s.title}
              </span>
              {s.number < 3 && <span className="text-gray-300 text-xs">➔</span>}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Step 1: Student Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>First Name *</label>
                <input
                  required
                  type="text"
                  className={INPUT}
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Middle Name *</label>
                <input
                  required
                  type="text"
                  className={INPUT}
                  value={form.middleName}
                  onChange={(e) => setField("middleName", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Family Name *</label>
                <input
                  required
                  type="text"
                  className={INPUT}
                  value={form.familyName}
                  onChange={(e) => setField("familyName", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Student ID *</label>
                <input
                  required
                  type="text"
                  maxLength={9}
                  className={INPUT}
                  value={form.studentIdNumber}
                  onChange={(e) => setField("studentIdNumber", e.target.value)}
                  placeholder="9-digit ID (e.g. 123456789)"
                />
              </div>
              <div>
                <label className={LABEL}>Department *</label>
                <select
                  required
                  className={INPUT}
                  value={form.department}
                  onChange={(e) => setField("department", e.target.value)}
                >
                  <option value="">Select department</option>
                  {myDepartments.map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Step 2: Referrer Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Referrer Name</label>
                <input
                  readOnly
                  disabled
                  type="text"
                  className={`${INPUT} bg-gray-50 text-gray-500`}
                  value={currentUser?.name || ""}
                />
              </div>
              <div>
                <label className={LABEL}>Contact Number *</label>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  className={INPUT}
                  value={form.referrerContactNumber}
                  onChange={(e) => setField("referrerContactNumber", sanitizePhoneDigits(e.target.value))}
                  placeholder="09XXXXXXXXX"
                />
              </div>
              <div>
                <label className={LABEL}>Position *</label>
                <input
                  required
                  type="text"
                  className={INPUT}
                  value={form.referrerPosition}
                  onChange={(e) => setField("referrerPosition", e.target.value)}
                  placeholder="e.g. College Dean, Instructor"
                />
              </div>
              <div>
                <label className={LABEL}>Department *</label>
                <select
                  required
                  className={INPUT}
                  value={form.referrerDepartment}
                  onChange={(e) => setField("referrerDepartment", e.target.value)}
                >
                  <option value="">Select department</option>
                  {myDepartments.map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Step 3: Referral Details</h4>
            <div>
              <label className={LABEL}>Nature of concern *</label>
              <select
                required
                className={INPUT}
                value={form.natureOfConcern}
                onChange={(e) => setField("natureOfConcern", e.target.value)}
              >
                <option value="">Select nature of concern</option>
                {NATURE_OF_CONCERN_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            {form.natureOfConcern === "Other" && (
              <div>
                <label className={LABEL}>Please specify *</label>
                <input
                  required
                  type="text"
                  className={INPUT}
                  value={form.natureOfConcernOther}
                  onChange={(e) => setField("natureOfConcernOther", e.target.value)}
                />
              </div>
            )}

            <div>
              <label className={LABEL}>Brief description *</label>
              <textarea
                required
                rows={3}
                className={INPUT}
                placeholder="Why are you referring this student?"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-2 font-medium">{error}</p>}
      </form>
    </Modal>
  );
}
