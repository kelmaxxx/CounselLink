import React, { useState } from "react";
import { useNotifications } from "../../context/NotificationsContext";
import { useAuth } from "../../context/AuthContext";

export default function CreateAnnouncement() {
  const { addNotification } = useNotifications();
  const { users } = useAuth();
  
  const [form, setForm] = useState({
    title: "",
    message: "",
    sendTo: "all"
  });

  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Determine recipients based on sendTo
    const roleMap = {
      all: null,
      students: "student",
      counselors: "counselor",
      reps: "college_rep"
    };
    
    const targetRole = roleMap[form.sendTo];
    
    // Create a single notification with recipientRole
    // recipientId: null (broadcast), recipientRole: specific or null (all)
    addNotification({
      recipientId: null,
      recipientRole: targetRole,
      title: form.title,
      message: form.message,
      type: "info",
      link: null
    });
    
    setSent(true);
    setForm({ title: "", message: "", sendTo: "all" });
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Create Announcement</h2>

      {sent && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">✓ Announcement sent successfully</p>
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
            className="w-full bg-maroon-500 text-white py-3 rounded-lg hover:bg-maroon-600 font-medium transition"
          >
            Send Announcement
          </button>
        </form>
      </div>
    </div>
  );
}