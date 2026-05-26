import React, { useState } from "react";
import { ClipboardList, Info, Send } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";

export default function RequestStudentData() {
  const [form, setForm] = useState({
    studentName: "",
    studentId: "",
    reason: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Request submitted to DSA Administrator for approval.");
    setSubmitted(true);
    setForm({ studentName: "", studentId: "", reason: "" });
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <PageHeader
        eyebrow="College Representative"
        title="Request student counseling data"
        subtitle="File a formal data access request. The admin reviews each request."
        actions={
          <button type="submit" form="request-data-form" className={BTN.primary}>
            <Send size={14} /> Submit request
          </button>
        }
      />

      {submitted && (
        <div className="mb-4 px-3 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
          Request submitted successfully to the DSA Administrator.
        </div>
      )}

      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <ClipboardList size={14} className="text-maroon-600" /> Request details
          </span>
        }
        subtitle="Provide the student's identifiers and your reason"
        className="mb-4"
      >
        <form id="request-data-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={LABEL}>Student name *</label>
            <input
              type="text"
              required
              className={INPUT}
              value={form.studentName}
              onChange={(e) => setForm({ ...form, studentName: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Student ID *</label>
            <input
              type="text"
              required
              className={INPUT}
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Reason for request *</label>
            <textarea
              required
              rows={4}
              className={INPUT}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Explain why you need access to this student's data…"
            />
          </div>
        </form>
      </SectionCard>

      <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-800">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          Your request will be reviewed by the DSA Administrator. You will receive a notification
          once it is approved or denied.
        </p>
      </div>
    </div>
  );
}
