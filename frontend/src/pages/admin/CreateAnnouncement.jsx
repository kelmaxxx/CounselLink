import React, { useState } from "react";
import { useNotifications } from "../../context/NotificationsContext";
import { Megaphone, Send } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";

export default function CreateAnnouncement() {
  const { addNotification } = useNotifications();

  const [form, setForm] = useState({
    title: "",
    message: "",
    sendTo: "all",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await addNotification({
        title: form.title,
        message: form.message,
        sendTo: form.sendTo,
      });
      setFeedback({
        type: "success",
        text: `Announcement sent to ${result.recipientCount} user${result.recipientCount === 1 ? "" : "s"}.`,
      });
      setForm({ title: "", message: "", sendTo: "all" });
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Failed to send announcement" });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <PageHeader
        eyebrow="Administrator"
        title="Create announcement"
        subtitle="Broadcast a message to students, counselors, or college deans."
        actions={
          <button type="submit" form="announcement-form" disabled={submitting} className={BTN.primary}>
            <Send size={14} /> {submitting ? "Sending…" : "Send announcement"}
          </button>
        }
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

      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <Megaphone size={14} className="text-maroon-600" /> Announcement
          </span>
        }
        subtitle="Title, body, and audience"
      >
        <form id="announcement-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={LABEL}>Title *</label>
            <input
              type="text"
              required
              className={INPUT}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Counseling office hours updated"
            />
          </div>

          <div>
            <label className={LABEL}>Message *</label>
            <textarea
              required
              rows={6}
              className={INPUT}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Type your announcement message here…"
            />
          </div>

          <div>
            <label className={LABEL}>Send to</label>
            <select
              className={INPUT}
              value={form.sendTo}
              onChange={(e) => setForm({ ...form, sendTo: e.target.value })}
            >
              <option value="all">All users</option>
              <option value="students">Students only</option>
              <option value="counselors">Counselors only</option>
              <option value="reps">College deans only</option>
            </select>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
