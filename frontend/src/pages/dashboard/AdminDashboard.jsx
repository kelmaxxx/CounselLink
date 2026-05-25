// src/pages/dashboard/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Pencil, Trash2, Megaphone, Save, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const PIE_COLORS = ["#7f1d1d", "#9f1239", "#b91c1c", "#dc2626", "#f59e0b"];

const splitContent = (content) => {
  const [title, ...rest] = String(content || "").split("\n\n");
  return { title: title || "", message: rest.join("\n\n") };
};

export default function AdminDashboard() {
  const { users, token } = useAuth();
  const students = users?.filter((u) => u.role === "student") || [];
  const counselors = users?.filter((u) => u.role === "counselor") || [];
  const reps = users?.filter((u) => u.role === "college_rep") || [];
  const admins = users?.filter((u) => u.role === "admin") || [];

  const pieData = useMemo(
    () => [
      { name: "Students", value: students.length },
      { name: "Counselors", value: counselors.length },
      { name: "College Dean", value: reps.length },
      { name: "Admin", value: admins.length },
    ].filter((d) => d.value > 0),
    [students.length, counselors.length, reps.length, admins.length]
  );

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Administrator Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-maroon-500 text-white p-6 rounded-xl shadow">
          <h3 className="text-sm font-medium text-maroon-100">Total Users</h3>
          <p className="text-3xl font-bold">{users?.length || 0}</p>
        </div>
        <div className="bg-maroon-600 text-white p-6 rounded-xl shadow">
          <h3 className="text-sm font-medium text-maroon-100">Counselors</h3>
          <p className="text-3xl font-bold">{counselors.length}</p>
        </div>
        <div className="bg-maroon-700 text-white p-6 rounded-xl shadow">
          <h3 className="text-sm font-medium text-maroon-100">College Dean</h3>
          <p className="text-3xl font-bold">{reps.length}</p>
        </div>
        <div className="bg-maroon-700 text-white p-6 rounded-xl shadow">
          <h3 className="text-sm font-medium text-maroon-100">Students</h3>
          <p className="text-3xl font-bold">{students.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">User Role Distribution</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-500">No users yet.</p>
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <AnnouncementsPanel token={token} />
      </div>
    </div>
  );
}

function AnnouncementsPanel({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/announcements`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to load announcements");
      setItems(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const startEdit = (item) => {
    const { title, message } = splitContent(item.content);
    setEditingId(item.id);
    setEditTitle(title);
    setEditMessage(message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditMessage("");
  };

  const saveEdit = async (id) => {
    if (!editTitle.trim() || !editMessage.trim()) {
      setError("Title and message are required.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/announcements/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ title: editTitle.trim(), message: editMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      cancelEdit();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/announcements/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Megaphone size={20} className="text-maroon-600" />
          Recent Announcements
        </h3>
        <a
          href="/admin/announcements"
          className="text-sm text-maroon-600 hover:text-maroon-700 font-medium"
        >
          + New
        </a>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-gray-500">No announcements yet.</p>}

      <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {items.map((item) => {
          const { title, message } = splitContent(item.content);
          const isEditing = editingId === item.id;
          return (
            <li key={item.id} className="border border-gray-200 rounded-lg p-3">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    placeholder="Title"
                  />
                  <textarea
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    placeholder="Message"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-1"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(item.id)}
                      className="text-xs px-2 py-1 rounded bg-maroon-500 text-white hover:bg-maroon-600 inline-flex items-center gap-1"
                    >
                      <Save size={14} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{title || "(untitled)"}</p>
                      <p className="text-xs text-gray-500">
                        {item.adminName ? `by ${item.adminName} · ` : ""}
                        {item.date_posted ? new Date(item.date_posted).toLocaleString() : ""}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        title="Edit"
                        onClick={() => startEdit(item)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => remove(item.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-3">
                    {message}
                  </p>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
