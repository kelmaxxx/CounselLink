import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTests } from "../../context/TestsContext";
import { CheckCircle2 } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  INPUT,
  LABEL,
  Modal,
} from "../../components/ui";

const TIME_SLOTS = [
  { value: "9:00-10:00", label: "9:00 – 10:00 AM" },
  { value: "10:00-11:00", label: "10:00 – 11:00 AM" },
  { value: "11:00-12:00", label: "11:00 – 12:00 PM" },
  { value: "1:00-2:00", label: "1:00 – 2:00 PM" },
  { value: "2:00-3:00", label: "2:00 – 3:00 PM" },
  { value: "3:00-4:00", label: "3:00 – 4:00 PM" },
];

export default function RequestPsychTest() {
  const { currentUser, users } = useAuth();
  const { createTestRequest } = useTests();
  const myRecord = users?.find((u) => u.email === currentUser?.email) || currentUser;

  const [form, setForm] = useState({
    testType: "Psychological Test",
    date: "",
    preferredSlots: [],
    phoneNumber: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState({ open: false, data: null });

  const toggleSlot = (val, checked) => {
    setForm((f) => {
      const set = new Set(f.preferredSlots || []);
      if (checked) set.add(val);
      else set.delete(val);
      return { ...f, preferredSlots: Array.from(set) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !(form.preferredSlots && form.preferredSlots.length) || !form.phoneNumber) {
      alert("Please provide date, at least one preferred time, and phone number.");
      return;
    }
    setSubmitting(true);
    const res = await createTestRequest({ student: myRecord, form });
    setSubmitting(false);
    if (res.success) {
      setSuccessModal({
        open: true,
        data: {
          testType: form.testType,
          date: form.date,
          preferredSlots: form.preferredSlots.map(v => {
            return TIME_SLOTS.find(s => s.value === v)?.label || v;
          })
        }
      });
      setForm({
        testType: "Psychological Test",
        date: "",
        preferredSlots: [],
        phoneNumber: "",
        reason: "",
      });
    } else {
      alert(res.message || "Failed to submit test request");
    }
  };

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Student"
        title="Request psychological test"
        subtitle="Schedule a psychological, personality, or career assessment."
        actions={
          <button
            type="submit"
            form="request-psych-form"
            disabled={submitting}
            className={BTN.primary}
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        }
      />

      <form id="request-psych-form" onSubmit={handleSubmit} className="space-y-4">
        <SectionCard title="Test details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Test type</label>
              <select
                className={INPUT}
                value={form.testType}
                onChange={(e) => setForm({ ...form, testType: e.target.value })}
              >
                <option>Psychological Test</option>
                <option>Personality Test</option>
                <option>Career Assessment</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Preferred date *</label>
              <input
                type="date"
                className={INPUT}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Phone number *</label>
              <input
                className={INPUT}
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                placeholder="e.g. 09123456789"
              />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Reason (optional)</label>
              <textarea
                rows={3}
                className={INPUT}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Any specific concerns or context…"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Preferred time slots *"
          subtitle="Select one or more time slots you're available."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {TIME_SLOTS.map((slot) => {
              const checked = form.preferredSlots.includes(slot.value);
              return (
                <label
                  key={slot.value}
                  className={`flex items-center gap-2.5 px-3 py-2 border rounded-md cursor-pointer transition text-sm ${
                    checked
                      ? "border-maroon-500 bg-maroon-50 text-maroon-900"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleSlot(slot.value, e.target.checked)}
                    className="w-4 h-4 text-maroon-600 rounded"
                  />
                  <span className="tabular-nums">{slot.label}</span>
                </label>
              );
            })}
          </div>
        </SectionCard>
      </form>

      <Modal
        open={successModal.open}
        onClose={() => setSuccessModal({ open: false, data: null })}
        title="Psychological Test Request Submitted"
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
            Test Request Submitted Successfully!
          </h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-sm">
            Your request has been recorded. The Guidance and Counseling team will review it and notify you of the status.
          </p>
          
          <div className="w-full bg-gray-50 border border-gray-100 rounded-lg p-4 text-left space-y-2.5">
            <div className="flex justify-between text-xs border-b border-gray-200/60 pb-1.5">
              <span className="text-gray-500 font-medium">Student Name:</span>
              <span className="text-gray-900 font-semibold">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-gray-200/60 pb-1.5">
              <span className="text-gray-500 font-medium">Test Type:</span>
              <span className="text-gray-900 font-semibold">{successModal.data?.testType}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-gray-200/60 pb-1.5">
              <span className="text-gray-500 font-medium">Preferred Date:</span>
              <span className="text-gray-900 font-semibold tabular-nums">{successModal.data?.date}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Preferred Times:</span>
              <span className="text-gray-900 font-semibold truncate max-w-[200px]" title={successModal.data?.preferredSlots?.join(", ")}>
                {successModal.data?.preferredSlots?.join(", ")}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
