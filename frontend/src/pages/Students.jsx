// src/pages/Students.jsx
// Counselor "Manage Students Records" — three tabs:
//   Students        : per-student records with completeness badges (Inventory / Consent / sessions)
//   Session Records : flat archive of all counseling sessions (existing)
//   Overview        : analytics (existing)
import React, { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, Edit, Trash2, Users, FileText, FileDown, Eye, Calendar,
  TrendingUp, Activity, AlertCircle, RefreshCw, UserRound, ClipboardList, Target,
  ListChecks, ArrowLeft, ArrowRight, CheckCircle2, Folder, MoreHorizontal
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCounselingSessions } from "../context/CounselingSessionsContext";
import { useStudentRecords } from "../context/StudentRecordsContext";
import StudentRecordsDrawer from "../components/records/StudentRecordsDrawer";
import { Modal, BTN, INPUT, LABEL, formatDate, BigStat } from "../components/ui";
import { downloadReportAsPdf } from "../utils/sessionReport";
import { getDepartments, getCollegeName } from "../data/msuColleges";

const NEXT_LABELS = { followup: "Follow-up", termination: "Termination" };

// Step-by-step flow for the Add / Edit session record modal so the form is
// broken into digestible parts instead of one long scroll.
const RECORD_STEPS = [
  { id: "who", title: "Student & date" },
  { id: "reason", title: "Presenting concern" },
  { id: "discussion", title: "Goals & summary" },
  { id: "plan", title: "Plan & comments" },
  { id: "closing", title: "Next session & signature" },
];

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

export default function ManageStudents() {
  const { currentUser, fetchUsersByRole } = useAuth();
  const { sessions, fetchSessions, createSession, updateSession, deleteSession } = useCounselingSessions();
  const { getRecords } = useStudentRecords();

  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("students");
  const [search, setSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("all");
  const [editing, setEditing] = useState(null); // null | {} | session row
  const [recordStep, setRecordStep] = useState(0);
  const [form, setForm] = useState(blankForm());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Drawer state
  const [drawerStudent, setDrawerStudent] = useState(null);
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [viewSession, setViewSession] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);
  // Session Records tab folder navigation
  const [selectedRecordsFolder, setSelectedRecordsFolder] = useState(null);
  const [selectedRecordsDept, setSelectedRecordsDept] = useState(null);

  const reportTitleFor = (s) =>
    `Session Report — ${s.studentName} (${(s.sessionDate || "").split("T")[0]})`;
  // Per-student records cache: { [studentId]: { inventory, consent, loaded: bool } }
  const [recordsByStudent, setRecordsByStudent] = useState({});
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    if (currentUser?.role === "counselor" || currentUser?.role === "admin") {
      fetchUsersByRole("student").then(setStudents).catch((err) => console.error(err));
    }
    fetchSessions().catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);

  // Fan out and fetch each student's inventory + consent so completeness
  // badges have data. Best-effort — failures fall back to "—".
  const refreshAllRecords = async (list = students) => {
    if (!list?.length) return;
    setLoadingRecords(true);
    const next = { ...recordsByStudent };
    await Promise.all(
      list.map(async (s) => {
        try {
          const r = await getRecords(s.id);
          next[s.id] = { ...r, loaded: true };
        } catch {
          next[s.id] = { inventory: null, consent: null, loaded: true };
        }
      })
    );
    setRecordsByStudent(next);
    setLoadingRecords(false);
  };

  // Auto-load records the first time the Students tab becomes active (and the
  // student list has resolved) so the badges aren't blank on landing.
  useEffect(() => {
    if (activeTab === "students" && students.length > 0 && Object.keys(recordsByStudent).length === 0) {
      refreshAllRecords(students);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, students.length]);

  const handleRecordsChanged = (studentId, { inventory, consent }) => {
    setRecordsByStudent((prev) => ({ ...prev, [studentId]: { inventory, consent, loaded: true } }));
  };

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
    setRecordStep(0);
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
    setRecordStep(0);
    setEditing(session);
  };

  const closeModal = () => {
    setEditing(null);
    setRecordStep(0);
    setForm(blankForm());
  };

  const showFeedback = (type, text, ms = 3000) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), ms);
  };

  const recordStepValid = (i = recordStep) => {
    if (RECORD_STEPS[i].id === "who") return Boolean(form.studentId) && Boolean(form.sessionDate);
    return true;
  };

  const isLastRecordStep = recordStep === RECORD_STEPS.length - 1;

  const goRecordBack = () => setRecordStep((s) => Math.max(0, s - 1));
  const goRecordNext = () => {
    if (!recordStepValid()) {
      if (RECORD_STEPS[recordStep].id === "who") {
        showFeedback("error", "Student and session date are required");
      }
      return;
    }
    setRecordStep((s) => Math.min(s + 1, RECORD_STEPS.length - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Enter key inside an input can fire submit early — only commit on the
    // final step; otherwise advance the wizard.
    if (!isLastRecordStep) {
      goRecordNext();
      return;
    }
    if (!form.studentId || !form.sessionDate) {
      setRecordStep(0);
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
      // Stay open on this step so the counselor can keep reviewing/editing —
      // they close the modal themselves (X button) once they're done, rather
      // than the save action exiting for them.
      setEditing(res.session);
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Manage Students Records</h2>
          <p className="text-sm text-gray-600">Archive of counseling session records — add, edit, or delete each session.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 font-medium transition ${activeTab === "students" ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"}`}
          >
            <div className="flex items-center gap-2"><Users size={18} /> Students</div>
          </button>
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

        {activeTab === "students" && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  className="pl-10 pr-3 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
                  placeholder="Search by name, ID, or college..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => refreshAllRecords(students)}
                disabled={loadingRecords}
                className="flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={14} className={loadingRecords ? "animate-spin" : ""} /> Refresh records
              </button>
            </div>

            {(() => {
              const q = studentSearch.trim().toLowerCase();
              const list = students.filter((s) => {
                if (!q) return true;
                return (
                  (s.name || "").toLowerCase().includes(q) ||
                  (s.studentId || "").toLowerCase().includes(q) ||
                  (s.college || "").toLowerCase().includes(q) ||
                  (s.email || "").toLowerCase().includes(q)
                );
              });

              const byCollege = {};
              list.forEach((s) => {
                const col = s.college || "Unassigned";
                if (!byCollege[col]) byCollege[col] = [];
                byCollege[col].push(s);
              });

              const renderStudent = (s) => {
                const rec = recordsByStudent[s.id];
                const inv = rec?.inventory;
                const con = rec?.consent;
                const sessionCount = sessions.filter((x) => x.studentId === s.id).length;
                const ack = inv?.formData?.acknowledgment;
                let authBadge;
                if (!rec?.loaded) {
                  authBadge = <span className="text-xs text-gray-400">—</span>;
                } else if (!inv || !ack?.disclaimerAgreed) {
                  authBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Awaiting</span>;
                } else if (ack?.disclaimerRevokedAt) {
                  authBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">Revoked</span>;
                } else {
                  authBadge = <CheckCircle2 size={17} className="text-green-600" />;
                }
                const invFilled = !!(inv?.scanUrl || inv?.formData?.personal?.surname);
                const invBadge = !rec?.loaded
                  ? <span className="text-xs text-gray-400">—</span>
                  : invFilled
                    ? <CheckCircle2 size={17} className="text-green-600" />
                    : inv
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Incomplete</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Missing</span>;
                let conBadge;
                if (!rec?.loaded) {
                  conBadge = <span className="text-xs text-gray-400">—</span>;
                } else if (!con) {
                  conBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Awaiting</span>;
                } else if (con.revokedAt) {
                  conBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">Revoked</span>;
                } else if (con.eConsentSignedAt) {
                  conBadge = <CheckCircle2 size={17} className="text-green-600" />;
                } else if (con.scanUrl) {
                  conBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Paper</span>;
                } else {
                  conBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Awaiting</span>;
                }
                return (
                  <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDrawerStudent(s)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{s.college || "—"}</div>
                      <div className="text-xs text-gray-500">{s.studentId || "—"}</div>
                    </td>
                    <td className="px-4 py-3">{invBadge}</td>
                    <td className="px-4 py-3">{authBadge}</td>
                    <td className="px-4 py-3">{conBadge}</td>
                    <td className="px-4 py-3 text-gray-700">{sessionCount}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenPopoverId(openPopoverId === s.id ? null : s.id); }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                          title="Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openPopoverId === s.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenPopoverId(null)} />
                            <div className="absolute right-0 z-20 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                              <button
                                onClick={() => { setOpenPopoverId(null); setDrawerStudent(s); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye size={14} /> View
                              </button>
                              <button
                                onClick={() => {
                                  setOpenPopoverId(null);
                                  setForm({ ...blankForm(), studentId: String(s.id), sessionDate: new Date().toISOString().split("T")[0] });
                                  setRecordStep(0);
                                  setEditing({});
                                  setActiveTab("records");
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Plus size={14} /> Add Record
                              </button>
                              <button
                                onClick={() => {
                                  setOpenPopoverId(null);
                                  setStudentSearch(s.name || s.studentId || "");
                                  setActiveTab("records");
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <ClipboardList size={14} /> Manage
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              };

              // Level 1 — College folders (e.g. CICS, COE …)
              if (!selectedFolder) {
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {Object.keys(byCollege).sort().map(college => (
                      <div
                        key={college}
                        onClick={() => { setSelectedFolder(college); setSelectedDept(null); }}
                        className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:border-maroon-300 transition-all text-center gap-3"
                      >
                        <Folder size={48} className="text-maroon-600 fill-maroon-100" />
                        <div className="font-semibold text-gray-800 text-sm">{college}</div>
                        <div className="text-[11px] text-gray-500 leading-tight">{getCollegeName(college)}</div>
                        <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {byCollege[college].length} student{byCollege[college].length !== 1 && "s"}
                        </div>
                      </div>
                    ))}
                    {Object.keys(byCollege).length === 0 && (
                      <div className="col-span-full py-8 text-center text-gray-500">
                        {students.length === 0 ? "No students yet." : "No students match your search."}
                      </div>
                    )}
                  </div>
                );
              }

              // Group the selected college's students into department sub-folders.
              const collegeStudents = byCollege[selectedFolder] || [];
              const byDept = {};
              collegeStudents.forEach((s) => {
                const d = s.department || "Unassigned";
                if (!byDept[d]) byDept[d] = [];
                byDept[d].push(s);
              });

              // Level 2 — Department sub-folders within a college (e.g. CICS ▸ DCS / DIS)
              if (!selectedDept) {
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => setSelectedFolder(null)}
                        className="text-sm font-medium text-maroon-700 hover:text-maroon-800 flex items-center gap-1"
                      >
                        <ArrowLeft size={16} /> Back to Folders
                      </button>
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Folder size={20} className="text-maroon-600 fill-maroon-100" />
                        {selectedFolder}
                        <span className="text-sm font-normal text-gray-500">· {getCollegeName(selectedFolder)}</span>
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {Object.keys(byDept).sort().map((dept) => {
                        const code = getDepartments(selectedFolder).find((d) => d.name === dept)?.code;
                        return (
                          <div
                            key={dept}
                            onClick={() => setSelectedDept(dept)}
                            className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:border-maroon-300 transition-all text-center gap-3"
                          >
                            <Folder size={40} className="text-amber-600 fill-amber-100" />
                            <div className="font-semibold text-gray-800 text-sm">{code || dept}</div>
                            {code && <div className="text-[11px] text-gray-500 leading-tight">{dept}</div>}
                            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {byDept[dept].length} student{byDept[dept].length !== 1 && "s"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Level 3 — Students within the chosen department
              const folderStudents = byDept[selectedDept] || [];
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <button
                      onClick={() => { setSelectedFolder(null); setSelectedDept(null); }}
                      className="font-medium text-maroon-700 hover:text-maroon-800 flex items-center gap-1"
                    >
                      <ArrowLeft size={16} /> Folders
                    </button>
                    <span className="text-gray-400">/</span>
                    <button
                      onClick={() => setSelectedDept(null)}
                      className="font-medium text-maroon-700 hover:text-maroon-800"
                    >
                      {selectedFolder}
                    </button>
                    <span className="text-gray-400">/</span>
                    <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                      <Folder size={16} className="text-amber-600 fill-amber-100" />
                      {selectedDept}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow overflow-x-auto">
                    <table className="min-w-full divide-y">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-xs text-gray-700">
                          <th className="px-4 py-3 font-medium">Student</th>
                          <th className="px-4 py-3 font-medium">College / ID</th>
                          <th className="px-4 py-3 font-medium">Inventory</th>
                          <th className="px-4 py-3 font-medium">Authorize</th>
                          <th className="px-4 py-3 font-medium">Consent</th>
                          <th className="px-4 py-3 font-medium">Sessions</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-sm">
                        {folderStudents.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              No students found.
                            </td>
                          </tr>
                        ) : (
                          folderStudents.map(renderStudent)
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <BigStat
                label="Total session records"
                value={analytics.total}
                icon={FileText}
                tone="blue"
              />
              <BigStat
                label="Distinct students"
                value={analytics.distinctStudents}
                icon={Users}
                tone="emerald"
              />
              <BigStat
                label="Sessions in last 30 days"
                value={analytics.last30}
                icon={Calendar}
                tone="purple"
              />
              <BigStat
                label="Pending follow-ups"
                value={analytics.followups}
                icon={Activity}
                tone="amber"
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-6 shadow-sm">
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

        {activeTab === "records" && (() => {
          // Build college → department groups from sessions (resolved via studentsById)
          const sessionsByCollege = {};
          sessions.forEach((s) => {
            const st = studentsById[s.studentId];
            const college = st?.college || s.studentCollege || "Unassigned";
            if (!sessionsByCollege[college]) sessionsByCollege[college] = [];
            sessionsByCollege[college].push(s);
          });

          // Level 1 — college folders
          if (!selectedRecordsFolder) {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Object.keys(sessionsByCollege).sort().map((college) => (
                  <div
                    key={college}
                    onClick={() => { setSelectedRecordsFolder(college); setSelectedRecordsDept(null); }}
                    className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:border-maroon-300 transition-all text-center gap-3"
                  >
                    <Folder size={48} className="text-maroon-600 fill-maroon-100" />
                    <div className="font-semibold text-gray-800 text-sm">{college}</div>
                    <div className="text-[11px] text-gray-500 leading-tight">{getCollegeName(college)}</div>
                    <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {sessionsByCollege[college].length} record{sessionsByCollege[college].length !== 1 && "s"}
                    </div>
                  </div>
                ))}
                {Object.keys(sessionsByCollege).length === 0 && (
                  <div className="col-span-full py-8 text-center text-gray-500">
                    {sessions.length === 0 ? "No session records yet." : "No records found."}
                  </div>
                )}
              </div>
            );
          }

          // Build department sub-groups within the chosen college
          const collegeSessions = sessionsByCollege[selectedRecordsFolder] || [];
          const sessionsByDept = {};
          collegeSessions.forEach((s) => {
            const st = studentsById[s.studentId];
            const dept = st?.department || "Unassigned";
            if (!sessionsByDept[dept]) sessionsByDept[dept] = [];
            sessionsByDept[dept].push(s);
          });

          // Level 2 — department sub-folders
          if (!selectedRecordsDept) {
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setSelectedRecordsFolder(null)}
                    className="text-sm font-medium text-maroon-700 hover:text-maroon-800 flex items-center gap-1"
                  >
                    <ArrowLeft size={16} /> Back to Folders
                  </button>
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Folder size={20} className="text-maroon-600 fill-maroon-100" />
                    {selectedRecordsFolder}
                    <span className="text-sm font-normal text-gray-500">· {getCollegeName(selectedRecordsFolder)}</span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Object.keys(sessionsByDept).sort().map((dept) => {
                    const deptCode = getDepartments(selectedRecordsFolder).find((d) => d.name === dept)?.code;
                    return (
                      <div
                        key={dept}
                        onClick={() => setSelectedRecordsDept(dept)}
                        className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:border-maroon-300 transition-all text-center gap-3"
                      >
                        <Folder size={40} className="text-amber-600 fill-amber-100" />
                        <div className="font-semibold text-gray-800 text-sm">{deptCode || dept}</div>
                        {deptCode && <div className="text-[11px] text-gray-500 leading-tight">{dept}</div>}
                        <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {sessionsByDept[dept].length} record{sessionsByDept[dept].length !== 1 && "s"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Level 3 — session records table for the selected college + department
          const deptSessions = sessionsByDept[selectedRecordsDept] || [];
          const q = search.trim().toLowerCase();
          const deptFiltered = deptSessions.filter((s) => {
            const matchesQuery = !q
              || (s.studentName || "").toLowerCase().includes(q)
              || (s.presentingConcern || "").toLowerCase().includes(q)
              || (s.summary || "").toLowerCase().includes(q);
            const matchesStudent = studentFilter === "all" || s.studentId === Number(studentFilter);
            return matchesQuery && matchesStudent;
          });

          return (
            <div className="space-y-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <button
                  onClick={() => { setSelectedRecordsFolder(null); setSelectedRecordsDept(null); }}
                  className="font-medium text-maroon-700 hover:text-maroon-800 flex items-center gap-1"
                >
                  <ArrowLeft size={16} /> Folders
                </button>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => setSelectedRecordsDept(null)}
                  className="font-medium text-maroon-700 hover:text-maroon-800"
                >
                  {selectedRecordsFolder}
                </button>
                <span className="text-gray-400">/</span>
                <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Folder size={16} className="text-amber-600 fill-amber-100" />
                  {selectedRecordsDept}
                </span>
              </div>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start">
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
                    {deptSessions
                      .reduce((acc, s) => {
                        if (!acc.find((x) => x.id === s.studentId))
                          acc.push({ id: s.studentId, name: s.studentName });
                        return acc;
                      }, [])
                      .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {currentUser?.role === "counselor" && (
                  <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-maroon-600 text-white hover:bg-maroon-700"
                  >
                    <Plus size={16} /> Add Record
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-x-auto">
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
                    {deptFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          {deptSessions.length === 0
                            ? "No session records for this department yet."
                            : "No records match your filters."}
                        </td>
                      </tr>
                    ) : deptFiltered.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(s.sessionDate)}</td>
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
                          <div className="inline-flex items-center gap-1 flex-wrap justify-end">
                            <button onClick={() => setViewSession(s)} className="p-1.5 rounded hover:bg-gray-100" title="View report">
                              <Eye size={14} className="text-gray-700" />
                            </button>
                            <button onClick={() => downloadReportAsPdf(s, { title: reportTitleFor(s) })} className="p-1.5 rounded hover:bg-gray-100" title="Download / print as PDF">
                              <FileDown size={14} className="text-gray-700" />
                            </button>
                            {currentUser?.role === "counselor" && Number(s.counselorId) === Number(currentUser.id) && (
                              <>
                                <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-gray-100" title="Edit">
                                  <Edit size={14} className="text-blue-600" />
                                </button>
                                <button onClick={() => setConfirmDelete(s)} className="p-1.5 rounded hover:bg-gray-100" title="Delete">
                                  <Trash2 size={14} className="text-red-600" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={editing !== null}
        onClose={closeModal}
        title={editing?.id ? "Edit session record" : "Add session record"}
        subtitle={`Step ${recordStep + 1} of ${RECORD_STEPS.length} · ${RECORD_STEPS[recordStep].title}`}
        size="2xl"
        align="top"
        footer={
          <>
            <button
              type="button"
              onClick={recordStep === 0 ? closeModal : goRecordBack}
              className={BTN.secondary}
            >
              {recordStep === 0 ? "Cancel" : (<><ArrowLeft size={14} /> Back</>)}
            </button>
            {isLastRecordStep ? (
              <button
                type="submit"
                form="session-record-form"
                disabled={busy}
                className={BTN.primary}
              >
                {busy ? "Saving…" : editing?.id ? "Save changes" : "Add record"}
              </button>
            ) : (
              <button type="button" onClick={goRecordNext} className={BTN.primary}>
                Continue <ArrowRight size={14} />
              </button>
            )}
          </>
        }
      >
        {editing !== null && (
          <form id="session-record-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Step indicator */}
            <RecordStepper steps={RECORD_STEPS} current={recordStep} onJump={setRecordStep} />

            {RECORD_STEPS[recordStep].id === "who" && (
              <RecordStepShell
                icon={UserRound}
                title="Student & date"
                subtitle="Who is this counseling record for, and when did the session happen?"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Student *</label>
                    <select
                      required
                      className={INPUT}
                      value={form.studentId}
                      onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                      disabled={!!editing.id}
                    >
                      <option value="">Select a student…</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.studentId || s.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Session date *</label>
                    <input
                      type="date"
                      required
                      className={INPUT}
                      value={form.sessionDate}
                      onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
                    />
                  </div>
                </div>
              </RecordStepShell>
            )}

            {RECORD_STEPS[recordStep].id === "reason" && (
              <RecordStepShell
                icon={ClipboardList}
                title="Presenting concern"
                subtitle="What brought the student to counseling?"
              >
                <textarea
                  rows={6}
                  className={INPUT}
                  value={form.presentingConcern}
                  onChange={(e) => setForm({ ...form, presentingConcern: e.target.value })}
                  placeholder="Describe the reason for the session…"
                />
              </RecordStepShell>
            )}

            {RECORD_STEPS[recordStep].id === "discussion" && (
              <RecordStepShell
                icon={Target}
                title="Goals & summary"
                subtitle="The goals set and the key points discussed."
              >
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Goals</label>
                    <textarea
                      rows={3}
                      className={INPUT}
                      value={form.goals}
                      onChange={(e) => setForm({ ...form, goals: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Summary / key points of discussion</label>
                    <textarea
                      rows={5}
                      className={INPUT}
                      value={form.summary}
                      onChange={(e) => setForm({ ...form, summary: e.target.value })}
                    />
                  </div>
                </div>
              </RecordStepShell>
            )}

            {RECORD_STEPS[recordStep].id === "plan" && (
              <RecordStepShell
                icon={ListChecks}
                title="Plan & comments"
                subtitle="The plan of action and any counselor notes."
              >
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Plan of action</label>
                    <textarea
                      rows={3}
                      className={INPUT}
                      value={form.plan}
                      onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Counselor&apos;s comments</label>
                    <textarea
                      rows={3}
                      className={INPUT}
                      value={form.comments}
                      onChange={(e) => setForm({ ...form, comments: e.target.value })}
                    />
                  </div>
                </div>
              </RecordStepShell>
            )}

            {RECORD_STEPS[recordStep].id === "closing" && (
              <RecordStepShell
                icon={CheckCircle2}
                title="Next session & signature"
                subtitle="Wrap up the record and sign off."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Next session</label>
                    <select
                      className={INPUT}
                      value={form.nextSession}
                      onChange={(e) => setForm({ ...form, nextSession: e.target.value })}
                    >
                      <option value="followup">Follow-up</option>
                      <option value="termination">Termination</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Counselor signature</label>
                    <input
                      className={INPUT}
                      value={form.counselorSignature}
                      onChange={(e) => setForm({ ...form, counselorSignature: e.target.value })}
                      placeholder="Type counselor name"
                    />
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Summary</p>
                  <RecordSummaryLine
                    label="Student"
                    value={students.find((s) => String(s.id) === String(form.studentId))?.name}
                  />
                  <RecordSummaryLine label="Session date" value={formatDate(form.sessionDate)} />
                  <RecordSummaryLine
                    label="Next session"
                    value={NEXT_LABELS[form.nextSession] || form.nextSession}
                  />
                </div>
              </RecordStepShell>
            )}
          </form>
        )}
      </Modal>

      {drawerStudent && (
        <StudentRecordsDrawer
          student={drawerStudent}
          onClose={() => setDrawerStudent(null)}
          onRecordsChanged={handleRecordsChanged}
          readOnly={currentUser?.role !== "counselor"}
          onEditSession={(s) => openEdit(s)}
          onDeleteSession={(s) => setConfirmDelete(s)}
        />
      )}

      {/* View individual session report */}
      <Modal
        open={!!viewSession}
        onClose={() => setViewSession(null)}
        title={viewSession ? reportTitleFor(viewSession) : "Session report"}
        subtitle={
          viewSession
            ? `${viewSession.studentCollege || ""}${
                viewSession.finalizedAt
                  ? ` · Finalized ${new Date(viewSession.finalizedAt).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                  : viewSession.counselorId === currentUser?.id
                  ? " · Draft (not finalized)"
                  : ""
              }`
            : ""
        }
        size="lg"
        align="top"
        footer={
          viewSession && (
            <div className="flex items-center gap-2">
              <button
                className={BTN.secondary}
                onClick={() => downloadReportAsPdf(viewSession, { title: reportTitleFor(viewSession) })}
              >
                <FileDown size={14} /> Download PDF
              </button>
              <button className={BTN.primary} onClick={() => setViewSession(null)}>
                Close
              </button>
            </div>
          )
        }
      >
        {viewSession && (
          <dl className="divide-y divide-gray-100 text-sm">
            <ViewRow label="Student" value={viewSession.studentName} />
            <ViewRow label="College" value={viewSession.studentCollege} />
            <ViewRow label="Session date" value={formatDate(viewSession.sessionDate)} />
            <ViewRow label="Counselor" value={viewSession.counselorName} />
            <ViewRow label="Presenting concern" value={viewSession.presentingConcern} />
            <ViewRow label="Goals" value={viewSession.goals} />
            <ViewRow label="Summary" value={viewSession.summary} />
            <ViewRow label="Plan" value={viewSession.plan} />
            <ViewRow label="Comments" value={viewSession.comments} />
            <ViewRow label="Next session" value={NEXT_LABELS[viewSession.nextSession] || viewSession.nextSession} />
            <ViewRow label="Signed by" value={viewSession.counselorSignature} />
          </dl>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete session record?"
        subtitle={
          confirmDelete
            ? `${confirmDelete.studentName} · ${(confirmDelete.sessionDate || "").split("T")[0]}`
            : ""
        }
        danger
        footer={
          <>
            <button onClick={() => setConfirmDelete(null)} className={BTN.secondary}>
              Cancel
            </button>
            <button onClick={handleDelete} disabled={busy} className={BTN.danger}>
              {busy ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600 flex-shrink-0">
            <AlertCircle size={16} />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            This will permanently delete the session record. This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function ViewRow({ label, value }) {
  return (
    <div className="py-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-gray-900 whitespace-pre-wrap">
        {value || <span className="text-gray-400">—</span>}
      </dd>
    </div>
  );
}

// Compact numbered stepper shown atop the Add / Edit session record modal.
function RecordStepper({ steps, current, onJump }) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => {
        const state = i === current ? "current" : i < current ? "done" : "todo";
        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              onClick={() => i <= current && onJump(i)}
              disabled={i > current}
              className={[
                "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition flex-shrink-0",
                state === "current"
                  ? "bg-maroon-600 text-white"
                  : state === "done"
                  ? "bg-maroon-100 text-maroon-700 hover:bg-maroon-200"
                  : "bg-gray-100 text-gray-400",
              ].join(" ")}
              title={s.title}
            >
              {i + 1}
            </button>
            {i < steps.length - 1 && (
              <span className={`h-0.5 flex-1 rounded-full ${i < current ? "bg-maroon-200" : "bg-gray-100"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function RecordStepShell({ icon: Icon, title, subtitle, children }) {
  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        {Icon && (
          <span className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-maroon-50 text-maroon-600">
            <Icon size={17} />
          </span>
        )}
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-gray-900">{title}</h4>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function RecordSummaryLine({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value || "—"}</span>
    </div>
  );
}
