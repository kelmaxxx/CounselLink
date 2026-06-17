import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { Megaphone, Send, ImagePlus, X } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function CreateAnnouncement() {
  const { token } = useAuth();
  const { addNotification } = useNotifications();

  const [form, setForm] = useState({
    title: "",
    message: "",
    sendTo: "all",
  });
  const [pubmatFile, setPubmatFile] = useState(null);
  const [pubmatPreview, setPubmatPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
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
        title: form.title,
        message: form.message,
        sendTo: form.sendTo,
        imageUrl,
      });
      setFeedback({
        type: "success",
        text: `Announcement sent to ${result.recipientCount} user${result.recipientCount === 1 ? "" : "s"}.`,
      });
      setForm({ title: "", message: "", sendTo: "all" });
      removePubmat();
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
        subtitle="Title, body, audience, and an optional Pubmat image"
      >
        <form id="announcement-form" onSubmit={handleSubmit} className="space-y-3">
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
                  onClick={removePubmat}
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
                <span className="text-xs text-gray-400">JPG, PNG, or WEBP — up to 5MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePubmatChange}
                />
              </label>
            )}
          </div>

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
