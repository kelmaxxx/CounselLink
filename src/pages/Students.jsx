// src/pages/Students.jsx
// Counselor "Manage Students" — archive of counseling session records.
import React, { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, Edit, Trash2, Users, FileText, Download, Calendar,
  TrendingUp, Activity, X, AlertCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCounselingSessions } from "../context/CounselingSessionsContext";

const NEXT_LABELS = { followup: "Follow-up", termination: "Termination" };

const blankForm = () => ({
  studentId: "",
  appointmentId: "",
  sessionDate: new Date().toISOString().split("T")[0],
  presentingConcern: "",
  goals: "",
  summary: "",
  plan: "",
  comments: "",
  nextSession: "followup",
  counselorSignature: "",
});

function downloadCSV(rows, filename = "session-records.csv") {
  if (!rows || !rows.length) return;
  const cols = [
    "id", "sessionDate", "studentName", "studentNumber", "studentCollege",
    "presentingConcern", "summary", "plan", "nextSession",
  ];
  const csv = [
    cols.join(","),
    ...rows.map(r => cols.map(c => `"${(r[c] ?? "").toString().replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ManageStudents() {
  const { currentUser, fetchUsersByRole } = useAuth();
  const { sessions, fetchSessions, createSession, updateSession, deleteSession } = useCounselingSessions();

  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("records");
  const [search, setSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("all");
  const [editing, setEditing] = useState(null); // null | {} | session row
  const [form, setForm] = useState(blankForm());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (currentUser?.role === "counselor" || currentUser?.role === "admin") {
      fetchUsersByRole("student").then(setStudents).catch((err) => console.error(err));
    }
    fetchSessions().catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);

  const studentsById = useMemo(() => {
    const map = {};
    for (const s of students) map[s.id] = s;
    return map;
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      const matchesQuery = !q
        || (s.studentName || "").toLowerCase().includes(q)
        || (s.presentingConcern || "").toLowerCase().includes(q)
        || (s.summary || "").toLowerCase().includes(q);
      const matchesStudent = studentFilter === "all" || s.studentId === Number(studentFilter);
      return matchesQuery && matchesStudent;
    });
  }, [sessions, search, studentFilter]);

  const analytics = useMemo(() => {
    const total = sessions.length;
    const distinctStudents = new Set(sessions.map(s => s.studentId)).size;
    const followups = sessions.filter(s => s.nextSession === "followup").length;
    const terminations = sessions.filter(s => s.nextSession === "termination").length;
    const last30 = sessions.filter(s => {
      const d = new Date(s.sessionDate);
      return (Date.now() - d.getTime()) < 1000 * 60 * 60 * 24 * 30;
    }).length;

    const byCollege = {};
    for (const s of sessions) {
      const c = s.studentCollege || "Unknown";
      byCollege[c] = (byCollege[c] || 0) + 1;
    }
    return { total, distinctStudents, followups, terminations, last30, byCollege };
  }, [sessions]);

  const openCreate = () => {
    setForm(blankForm());
    setEditing({});
  };

  const openEdit = (session) => {
    setForm({
      studentId: session.studentId,
      appointmentId: session.appointmentId || "",
      sessionDate: session.sessionDate ? session.sessionDate.split("T")[0] : "",
      presentingConcern: session.presentingConcern || "",
      goals: session.goals || "",
      summary: session.summary || "",
      plan: session.plan || "",
      comments: session.comments || "",
      nextSession: session.nextSession || "followup",
      counselorSignature: session.counselorSignature || "",
    });
    setEditing(session);
  };

  const closeModal = () => {
    setEditing(null);
    setForm(blankForm());
  };

  const showFeedback = (type, text, ms = 3000) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), ms);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.sessionDate) {
      showFeedback("error", "Student and session date are required");
      return;
    }
    setBusy(true);
    const payload = {
      ...form,
      studentId: Number(form.studentId),
      appointmentId: form.appointmentId ? Number(form.appointmentId) : null,
    };
    const res = editing?.id
      ? await updateSession(editing.id, payload)
      : await createSession(payload);
    setBusy(false);
    if (res.success) {
      closeModal();
      showFeedback("success", editing?.id ? "Session updated" : "Session record added");
    } else {
      showFeedback("error", res.message || "Failed to save");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    const res = await deleteSession(confirmDelete.id);
    setBusy(false);
    setConfirmDelete(null);
    showFeedback(res.success ? "success" : "error", res.success ? "Session deleted" : (res.message || "Failed to delete"));
  };

  return (
    <div className="p-6">
      <div className="max-w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Manage Students</h2>
          <p className="text-sm text-gray-600">Archive of counseling session records — add, edit, or delete each session.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("records")}
            className={`px-4 py-2 font-medium transition ${activeTab === "records" ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"}`}
          >
            <div className="flex items-center gap-2"><FileText size={18} /> Session Records</div>
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-medium transition ${activeTab === "overview" ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"}`}
          >
            <div className="flex items-center gap-2"><TrendingUp size={18} /> Overview</div>
          </button>
        </div>

        {feedback && (
          <div className={`mb-4 p-3 rounded-lg border ${feedback.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            {feedback.text}
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="text-blue-600" size={24} />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total}</p>
                <p className="text-sm text-gray-600">Total session records</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Users className="text-green-600" size={24} />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.distinctStudents}</p>
                <p className="text-sm text-gray-600">Distinct students</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="text-purple-600" size={24} />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.last30}</p>
                <p className="text-sm text-gray-600">Sessions in last 30 days</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="text-orange-600" size={24} />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.followups}</p>
                <p className="text-sm text-gray-600">Pending follow-ups</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessions by College</h3>
              {Object.keys(analytics.byCollege).length === 0 ? (
                <p className="text-sm text-gray-500">No session data yet.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.byCollege).sort((a, b) => b[1] - a[1]).map(([col, count]) => {
                    const pct = (count / analytics.total) * 100;
                    return (
                      <div key={col}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{col}</span>
                          <span className="text-gray-600">{count} session{count === 1 ? "" : "s"} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-maroon-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "records" && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start mb-4">
              <div className="flex gap-2 flex-1 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    className="pl-10 pr-3 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
                    placeholder="Search by student, concern, or summary..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 rounded border bg-white"
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                >
                  <option value="all">All students</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadCSV(filtered)}
                  className="flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50"
                >
                  <Download size={16} /> Export CSV
                </button>
                {currentUser?.role === "counselor" && (
                  <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-maroon-600 text-white hover:bg-maroon-700"
                  >
                    <Plus size={16} /> Add Record
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow overflow-x-auto">
              <table className="min-w-full divide-y">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs text-gray-700">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Concern</th>
                    <th className="px-4 py-3 font-medium">Summary</th>
                    <th className="px-4 py-3 font-medium">Next</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        {sessions.length === 0 ? "No session records yet. Click \"Add Record\" to create one." : "No records match your filters."}
                      </td>
                    </tr>
                  ) : filtered.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{(s.sessionDate || "").split("T")[0]}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{s.studentName}</div>
                        <div className="text-xs text-gray-500">{s.studentNumber || "—"} • {s.studentCollege || "N/A"}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={s.presentingConcern}>{s.presentingConcern || "—"}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={s.summary}>{s.summary || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${s.nextSession === "termination" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"}`}>
                          {NEXT_LABELS[s.nextSession] || s.nextSession}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {currentUser?.role === "counselor" && s.counselorId === currentUser.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEdit(s)}
                              className="p-1.5 rounded hover:bg-gray-100"
                              title="Edit"
                            >
                              <Edit size={14} className="text-blue-600" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(s)}
                              className="p-1.5 rounded hover:bg-gray-100"
                              title="Delete"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editing.id ? "Edit Session Record" : "Add Session Record"}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                  <select
                    required
                    className="w-full border rounded px-3 py-2"
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                    disabled={!!editing.id}
                  >
                    <option value="">Select a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.studentId || s.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full border rounded px-3 py-2"
                    value={form.sessionDate}
                    onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Presenting concern</label>
                <textarea
                  rows={2}
                  className="w-full border rounded px-3 py-2"
                  value={form.presentingConcern}
                  onChange={(e) => setForm({ ...form, presentingConcern: e.target.value })}
                  placeholder="What brought the student to counseling?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
                <textarea
                  rows={2}
                  className="w-full border rounded px-3 py-2"
                  value={form.goals}
                  onChange={(e) => setForm({ ...form, goals: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary / Key points of discussion</label>
                <textarea
                  rows={3}
                  className="w-full border rounded px-3 py-2"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan of action</label>
                <textarea
                  rows={2}
                  className="w-full border rounded px-3 py-2"
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Counselor's comments</label>
                <textarea
                  rows={2}
                  className="w-full border rounded px-3 py-2"
                  value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next session</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={form.nextSession}
                    onChange={(e) => setForm({ ...form, nextSession: e.target.value })}
                  >
                    <option value="followup">Follow-up</option>
                    <option value="termination">Termination</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Counselor signature</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={form.counselorSignature}
                    onChange={(e) => setForm({ ...form, counselorSignature: e.target.value })}
                    placeholder="Type counselor name"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded border">Cancel</button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 rounded bg-maroon-600 text-white hover:bg-maroon-700 disabled:opacity-50"
                >
                  {busy ? "Saving..." : (editing.id ? "Save changes" : "Add record")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="text-red-600" size={24} />
              <h3 className="text-lg font-semibold text-red-700">Delete session record?</h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              This will permanently delete the session record for <span className="font-medium">{confirmDelete.studentName}</span> on {(confirmDelete.sessionDate || "").split("T")[0]}.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={handleDelete} disabled={busy} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
