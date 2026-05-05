import React, { useState } from "react";
import { useNotifications } from "../../context/NotificationsContext";

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
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Create Announcement</h2>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            feedback.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Announcement Title</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter announcement title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              required
              rows="6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Type your announcement message here..."
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Send To</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              value={form.sendTo}
              onChange={(e) => setForm({ ...form, sendTo: e.target.value })}
            >
              <option value="all">All Users</option>
              <option value="students">Students Only</option>
              <option value="counselors">Counselors Only</option>
              <option value="reps">College Representatives Only</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-maroon-500 text-white py-3 rounded-lg hover:bg-maroon-600 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending..." : "Send Announcement"}
          </button>
        </form>
      </div>
    </div>
  );
}
