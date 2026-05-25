// src/pages/student/RequestAppointment.jsx
import React, { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useReactToPrint } from "react-to-print";
import { Printer, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";

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

export default function RequestAppointment() {
  const { currentUser, users } = useAuth();
  const myRecord = users?.find((u) => u.email === currentUser?.email) || currentUser;

  const [form, setForm] = useState({
    date: "",
    timeSlot: "",
    preferredSlots: [],
    isUrgent: false,
    phoneNumber: "",
    reason: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const { createAppointment } = useAppointments?.() || {};
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `appointment-request-${currentUser?.studentId || currentUser?.id || "form"}`,
  });

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
    if (!createAppointment) {
      alert("Appointment system not initialized.");
      return;
    }
    if (
      !form.date ||
      !(form.preferredSlots && form.preferredSlots.length) ||
      !form.reason ||
      !form.phoneNumber
    ) {
      alert("Please complete all required fields, including at least one preferred time slot.");
      return;
    }
    setSubmitted(true);
    const res = await createAppointment({ student: myRecord, form });
    if (res?.success) {
      alert("Appointment request submitted successfully.");
      setForm({
        date: "",
        timeSlot: "",
        preferredSlots: [],
        isUrgent: false,
        phoneNumber: "",
        reason: "",
      });
    } else {
      alert(res?.message || "Failed to submit appointment.");
    }
    setSubmitted(false);
  };

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Student"
        title="Counseling appointment form"
        subtitle="Request a session with the Guidance and Counseling Section."
        actions={
          <>
            <button type="button" onClick={handlePrint} className={BTN.secondary}>
              <Printer size={14} /> Print form
            </button>
            <button
              type="submit"
              form="request-appt-form"
              disabled={submitted}
              className={BTN.primary}
            >
              {submitted ? "Submitting…" : "Submit request"}
            </button>
          </>
        }
      />

      <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-800">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          This form creates two identical slips — one for DSA records and one for your reference.
          Please complete all required fields.
        </p>
      </div>

      <form id="request-appt-form" onSubmit={handleSubmit} className="space-y-4">
        <div ref={printRef} className="space-y-4 print:space-y-2">
          {/* Administrative */}
          <SectionCard title="Administrative" subtitle="Auto-filled on submission">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Date today</label>
                <input
                  type="date"
                  disabled
                  className={INPUT}
                  value={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className={LABEL}>Control number</label>
                <input
                  type="text"
                  disabled
                  className={INPUT}
                  value="Will be generated on submit"
                />
              </div>
            </div>
          </SectionCard>

          {/* Student details */}
          <SectionCard title="Student details" subtitle="Verified from your profile">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Name</label>
                <input type="text" disabled className={INPUT} value={currentUser?.name || ""} />
              </div>
              <div>
                <label className={LABEL}>Student ID</label>
                <input
                  type="text"
                  disabled
                  className={INPUT}
                  value={myRecord?.studentId || "N/A"}
                />
              </div>
              <div>
                <label className={LABEL}>College</label>
                <input
                  type="text"
                  disabled
                  className={INPUT}
                  value={myRecord?.college || "N/A"}
                />
              </div>
              <div>
                <label className={LABEL}>Phone number *</label>
                <input
                  type="tel"
                  required
                  className={INPUT}
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="e.g. 09123456789"
                />
              </div>
            </div>
          </SectionCard>

          {/* Preferences */}
          <SectionCard title="Appointment preferences" subtitle="Date, priority, and time slots">
            <label
              className={`flex items-center gap-3 cursor-pointer rounded-md border p-3 mb-3 transition ${
                form.isUrgent
                  ? "bg-red-50 border-red-300"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={form.isUrgent}
                onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded"
              />
              <AlertTriangle size={15} className={form.isUrgent ? "text-red-600" : "text-gray-400"} />
              <span
                className={`text-sm font-medium ${
                  form.isUrgent ? "text-red-700" : "text-gray-700"
                }`}
              >
                Urgent — immediate attention required
              </span>
            </label>

            <div className="mb-3">
              <label className={LABEL}>Preferred date *</label>
              <input
                type="date"
                required
                className={INPUT}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div>
              <label className={LABEL}>Preferred time slots * (one or more)</label>
              <div className="mt-2">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
                  Morning
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                  {TIME_SLOTS_MORNING.map((slot) => (
                    <SlotChip
                      key={slot.value}
                      slot={slot}
                      checked={form.preferredSlots.includes(slot.value)}
                      onChange={toggleSlot}
                    />
                  ))}
                </div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
                  Afternoon
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {TIME_SLOTS_AFTERNOON.map((slot) => (
                    <SlotChip
                      key={slot.value}
                      slot={slot}
                      checked={form.preferredSlots.includes(slot.value)}
                      onChange={toggleSlot}
                    />
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Reason */}
          <SectionCard title="Reason for counseling" subtitle="What you'd like to discuss">
            <textarea
              required
              rows={5}
              className={INPUT}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Please describe your concern or reason for seeking counseling…"
            />
          </SectionCard>

          {/* Signatures */}
          <SectionCard title="Signatures" subtitle="Sign on the printed form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-700 mb-3">Student signature</p>
                <div className="border-t-2 border-gray-400 pt-1.5 text-center">
                  <p className="text-[11px] text-gray-600">Sign above the line</p>
                </div>
                <p className="text-[11px] text-gray-600 mt-2">{currentUser?.name}</p>
                <p className="text-[11px] text-gray-600 tabular-nums">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 mb-3">Authorized personnel</p>
                <div className="border-t-2 border-gray-400 pt-1.5 text-center">
                  <p className="text-[11px] text-gray-600">Sign above the line</p>
                </div>
                <p className="text-[11px] text-gray-600 mt-2">(DSA personnel)</p>
                <p className="text-[11px] text-gray-600">(To be filled by DSA)</p>
              </div>
            </div>
          </SectionCard>

          {/* Informed consent */}
          <div className="bg-maroon-50 border border-maroon-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-maroon-900 mb-3 inline-flex items-center gap-1.5">
              <ShieldCheck size={15} /> Informed consent
            </h3>
            <div className="text-sm text-maroon-900 space-y-2.5 leading-relaxed">
              <p>
                <span className="font-semibold">Confidentiality:</span> All information shared
                during counseling sessions is confidential and protected under RA 10173 (Data
                Privacy Act of 2012).
              </p>
              <div>
                <span className="font-semibold">Exceptions to confidentiality:</span>
                <ul className="list-disc list-inside ml-2 mt-1.5 space-y-0.5">
                  <li>Consultation within the counseling team for professional care</li>
                  <li>Clear and imminent danger of harm to self or others</li>
                  <li>Legal requirement to report abuse / neglect of minors</li>
                  <li>Court orders</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function SlotChip({ slot, checked, onChange }) {
  return (
    <label
      className={`flex items-center gap-2.5 px-3 py-2 border rounded-md cursor-pointer transition text-sm ${
        checked
          ? "border-maroon-500 bg-maroon-50 text-maroon-900"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(slot.value, e.target.checked)}
        className="w-4 h-4 text-maroon-600 rounded"
      />
      <span className="tabular-nums">{slot.label}</span>
    </label>
  );
}
