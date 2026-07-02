// src/pages/dashboard/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Pencil,
  Trash2,
  Megaphone,
  Save,
  X,
  Users,
  Shield,
  GraduationCap,
  UserCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import WelcomeHero from "../../components/WelcomeHero";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
  Modal,
  BTN,
  INPUT,
} from "../../components/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const PIE_COLORS = ["#0B6623", "#1d4ed8", "#15803d", "#c2410c", "#7e22ce"];

const splitContent = (content) => {
  const [title, ...rest] = String(content || "").split("\n\n");
  return { title: title || "", message: rest.join("\n\n") };
};

const resolveImageUrl = (url) => {
  if (!url) return null;
  return url.startsWith("/") ? `${API_BASE}${url}` : url;
};

export default function AdminDashboard() {
  const { currentUser, users, token } = useAuth();
  const visibleUsers = users?.filter((u) => u.status !== "rejected") || [];
  const students = visibleUsers.filter((u) => u.role === "student");
  const counselors = visibleUsers.filter((u) => u.role === "counselor");
  const reps = visibleUsers.filter((u) => u.role === "college_rep");
  const admins = visibleUsers.filter((u) => u.role === "admin");
  const pendingApprovals =
    users?.filter((u) => u.role === "student" && u.status === "pending_approval").length || 0;

  const pieData = useMemo(
    () =>
      [
        { name: "Students", value: students.length },
        { name: "Counselors", value: counselors.length },
        { name: "Colleges", value: reps.length },
        { name: "Admins", value: admins.length },
      ].filter((d) => d.value > 0),
    [students.length, counselors.length, reps.length, admins.length]
  );

  const firstName = currentUser?.name?.split(" ")[0] || "Admin";

  return (
    <>
      <WelcomeHero userName={firstName} />
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Administrator"
        title="System overview"
        subtitle="User distribution and recent announcements"
        actions={
          <Link to="/admin/announcements" className={BTN.primary}>
            <Plus size={15} /> New announcement
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total users"
          value={visibleUsers.length}
          hint="All active accounts"
          icon={Users}
          accent="bg-gray-400"
        />
        <StatCard
          label="Counselors"
          value={counselors.length}
          hint="On staff"
          icon={Shield}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Colleges"
          value={reps.length}
          hint="Across colleges"
          icon={GraduationCap}
          accent="bg-blue-500"
        />
        <StatCard
          label="Students"
          value={students.length}
          hint={
            pendingApprovals > 0
              ? `${pendingApprovals} pending approval`
              : "Enrolled & active"
          }
          icon={UserCheck}
          accent={pendingApprovals > 0 ? "bg-amber-500" : "bg-maroon-500"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="User role distribution"
          subtitle="System breakdown by role"
          action={
            <span className="text-xs text-gray-500 tabular-nums">
              Total <span className="font-semibold text-gray-900">{visibleUsers.length}</span>
            </span>
          }
        >
          {pieData.length === 0 ? (
            <EmptyState icon={Users} title="No users yet" />
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={32}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: "#4b5563" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <AnnouncementsPanel token={token} />
      </div>
    </div>
    </>
  );
}

function AnnouncementsPanel({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [slide, setSlide] = useState(0);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

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

  useEffect(() => {
    if (slide > 0 && slide >= items.length) {
      setSlide(Math.max(0, items.length - 1));
    }
  }, [items, slide]);

  const goPrev = () => setSlide((s) => (s - 1 + items.length) % items.length);
  const goNext = () => setSlide((s) => (s + 1) % items.length);

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

  const confirmDelete = async () => {
    const id = deleteId;
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/announcements/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      setDeleteId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const currentItem = items[slide];

  return (
    <>
    <SectionCard
      title={
        <span className="inline-flex items-center gap-1.5">
          <Megaphone size={14} className="text-maroon-600" />
          Recent announcements
        </span>
      }
      subtitle={
        items.length > 0 ? `Slide ${slide + 1} of ${items.length}` : "Most recent 5"
      }
      noBodyPadding
      action={
        <Link
          to="/admin/announcements"
          className="text-xs font-medium text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
        >
          + New
        </Link>
      }
    >
      {error && (
        <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}
      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          hint="Create one to keep students and counselors informed."
        />
      ) : (
        (() => {
          const item = items[slide];
          const { title, message } = splitContent(item.content);
          const isEditing = editingId === item.id;
          return (
            <div className="px-4 py-3" style={{ minHeight: 280 }}>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={INPUT}
                    placeholder="Title"
                  />
                  <textarea
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    rows={3}
                    className={INPUT}
                    placeholder="Message"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelEdit} className={BTN.secondary}>
                      <X size={13} /> Cancel
                    </button>
                    <button onClick={() => saveEdit(item.id)} className={BTN.primary}>
                      <Save size={13} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {item.imageUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-gray-100">
                      <img
                        src={resolveImageUrl(item.imageUrl)}
                        alt={title}
                        className="w-full max-h-48 object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {title || "(untitled)"}
                      </p>
                      <p className="text-xs text-gray-500 tabular-nums">
                        {item.adminName ? `by ${item.adminName} · ` : ""}
                        {item.date_posted ? new Date(item.date_posted).toLocaleString() : ""}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        title="Edit"
                        onClick={() => startEdit(item)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => setDeleteId(item.id)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p
                    onClick={() => setViewOpen(true)}
                    title="Click to read full announcement"
                    className="text-sm text-gray-700 mt-1.5 whitespace-pre-wrap leading-relaxed line-clamp-2 cursor-pointer hover:text-gray-900"
                  >
                    {message}
                  </p>
                </>
              )}

              {items.length > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={goPrev}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <div className="flex items-center gap-1.5">
                    {items.map((it, idx) => (
                      <button
                        key={it.id}
                        onClick={() => setSlide(idx)}
                        aria-label={`Go to announcement ${idx + 1}`}
                        className={`w-1.5 h-1.5 rounded-full transition ${
                          idx === slide ? "bg-maroon-600" : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={goNext}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })()
      )}
    </SectionCard>

    {/* Full announcement view */}
    {currentItem && (
      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title={splitContent(currentItem.content).title || "(untitled)"}
        subtitle={
          `${currentItem.adminName ? `by ${currentItem.adminName} · ` : ""}` +
          (currentItem.date_posted ? new Date(currentItem.date_posted).toLocaleString() : "")
        }
        size="lg"
      >
        {currentItem.imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden border border-gray-100">
            <img
              src={resolveImageUrl(currentItem.imageUrl)}
              alt={splitContent(currentItem.content).title}
              className="w-full max-h-80 object-cover"
            />
          </div>
        )}
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {splitContent(currentItem.content).message}
        </p>
      </Modal>
    )}

    {/* Delete confirmation */}
    <Modal
      open={!!deleteId}
      onClose={() => setDeleteId(null)}
      title="Delete announcement"
      subtitle="This action cannot be undone."
      danger
      footer={
        <>
          <button onClick={() => setDeleteId(null)} className={BTN.secondary}>
            Cancel
          </button>
          <button onClick={confirmDelete} className={BTN.danger}>
            <Trash2 size={14} /> Delete
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        Are you sure you want to delete this announcement?
      </p>
    </Modal>
    </>
  );
}
