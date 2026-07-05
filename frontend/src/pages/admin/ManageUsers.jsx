import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { COLLEGES } from "../../data/mockData";
import { getDepartments, getCollegeName, getPrograms } from "../../data/msuColleges";
import {
  Edit2,
  Trash2,
  Search,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  StatusPill,
  Modal,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
} from "../../components/ui";
import { sanitizePhoneDigits } from "../../utils/phone";

const POSITIONS = [
  "Section Chief",
  "Guidance Service Specialist I",
  "Guidance Service Specialist II",
  "Guidance Service Specialist III",
  "Guidance Service Specialist IV",
  "Guidance Service Specialist V",
];

const SPECIALIZATIONS = [
  "Career Counseling",
  "Personal / Social Counseling",
  "Academic Counseling",
  "Mental Health Counseling",
  "Family Counseling",
  "Crisis Counseling",
  "Group Counseling",
  "Rehabilitation Counseling",
];

const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const STAFF_EMAIL_DOMAINS = ["@s.msumain.edu.ph"];
const isInstitutionalEmail = (email) => {
  const lower = String(email || "").trim().toLowerCase();
  return STAFF_EMAIL_DOMAINS.some((d) => lower.endsWith(d));
};

const buildCorUrl = (user) => {
  if (!user?.corUrl) return null;
  if (user.corUrl.startsWith("http")) return user.corUrl;
  return `${apiBase}${user.corUrl}`;
};

const statusInfo = (u) => {
  if (u.status === "pending_approval") return { status: "pending", label: "Pending" };
  if (u.status && u.status !== "approved") return { status: "rejected", label: "Rejected" };
  return { status: "active", label: "Active" };
};

const studentIdEmailCell = (u) => (
  <div>
    <p className="text-sm font-medium text-gray-900 tabular-nums">{u.studentId || "—"}</p>
    <p className="text-xs text-gray-500 break-all">{u.email}</p>
  </div>
);

const counselorIdEmailCell = (u) => (
  <div>
    <p className="text-sm font-medium text-gray-900 tabular-nums">{u.employeeId || "—"}</p>
    <p className="text-xs text-gray-500 break-all">{u.email}</p>
  </div>
);

const emailCell = (u) => <p className="text-sm text-gray-600 break-all">{u.email}</p>;

const STUDENT_COLUMNS = [
  { header: "ID / Email", render: studentIdEmailCell },
  { header: "College", render: (u) => u.college || "—" },
  { header: "Department", render: (u) => u.department || "—" },
  { header: "Course", render: (u) => u.program || "—" },
];

const COUNSELOR_COLUMNS = [
  { header: "ID / Email", render: counselorIdEmailCell },
  { header: "Position", render: (u) => u.position || "—" },
  { header: "Specialization", render: (u) => u.specialization || "—" },
];

const REP_COLUMNS = [
  { header: "Email", render: emailCell },
  { header: "College", render: (u) => u.college || "—" },
  { header: "Department", render: (u) => u.department || "—" },
];

const ADMIN_COLUMNS = [{ header: "Email", render: emailCell }];

function UserTable({ rows, columns, onEdit, onDelete, emptyText, hideEdit = false, hideDelete = false }) {
  if (!rows.length) {
    return <EmptyState title={emptyText} />;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
          <th className="px-4 py-2.5">Name</th>
          {columns.map((col) => (
            <th key={col.header} className="px-4 py-2.5">
              {col.header}
            </th>
          ))}
          <th className="px-4 py-2.5">Status</th>
          <th className="px-4 py-2.5 w-16 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((u) => {
          const { status, label } = statusInfo(u);
          return (
            <tr key={u.id} className="hover:bg-gray-50/70 transition">
              <td className="px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                    {initialsOf(u.name)}
                  </div>
                  <span className="font-medium text-gray-900 text-sm break-words leading-snug">{u.name}</span>
                </div>
              </td>
              {columns.map((col) => (
                <td key={col.header} className="px-4 py-3 text-gray-700 text-sm break-words leading-snug">
                  {col.render(u)}
                </td>
              ))}
              <td className="px-4 py-3">
                <StatusPill status={status}>{label}</StatusPill>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  {!hideEdit && (
                    <button
                      onClick={() => onEdit(u)}
                      title="Edit"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 transition"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                  {!hideDelete && (
                    <button
                      onClick={() => onDelete(u.id)}
                      title="Delete"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-red-500 hover:bg-red-50 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ManageUsers() {
  const { users, createUser, updateUser, deleteUser, banUser, unbanUser } = useAuth();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("student");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [page, setPage] = useState(0);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const [_busy, setBusy] = useState(false);

  const [createModal, setCreateModal] = useState({ open: false, role: "" });
  const [createStep, setCreateStep] = useState(1);
  const [createError, setCreateError] = useState("");
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, userId: null });
  const [corModalOpen, setCorModalOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setActionsOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    college: COLLEGES[0],
    department: "",
    employeeId: "",
    position: "",
    specialization: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    college: "",
    department: "",
    specialization: "",
    position: "",
    employeeId: "",
    studentId: "",
    program: "",
  });

  const filtered = useMemo(() => {
    const allUsers = (users || []).filter((u) => u.status !== "banned");
    const q = query.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.studentId?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q)
    );
  }, [users, query]);

  const students = useMemo(
    () => filtered.filter((u) => u.role === "student" && u.status !== "rejected"),
    [filtered]
  );
  const counselors = useMemo(() => filtered.filter((u) => u.role === "counselor"), [filtered]);
  const reps = useMemo(() => filtered.filter((u) => u.role === "college_rep"), [filtered]);
  const admins = useMemo(() => filtered.filter((u) => u.role === "admin"), [filtered]);

  const suggestions = useMemo(() => {
    const allCounselors = (users || []).filter((u) => u.role === "counselor");
    if (!query.trim()) return allCounselors.slice(0, 6);
    return allCounselors
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.email.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 6);
  }, [users, query]);

  const bannedUsers = useMemo(
    () => (users || []).filter((u) => u.status === "banned"),
    [users]
  );

  useEffect(() => { setPage(0); }, [activeTab, query]);

  const PAGE_SIZE = 10;
  const activeRows = { student: students, counselor: counselors, college_rep: reps, admin: admins }[activeTab] || [];
  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
  const pagedRows = activeRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openCreateModal = (role) => {
    setCreateForm({ name: "", email: "", password: "password123", college: COLLEGES[0], department: "", employeeId: "", position: "", specialization: "" });
    setCreateStep(1);
    setCreateError("");
    setCreateModal({ open: true, role });
  };

  const handleCreateNext = () => {
    if (createStep === 1) {
      if (!createForm.name.trim()) return setCreateError("Full name is required.");
      if (!createForm.email.trim()) return setCreateError("Institutional email is required.");
      if (!isInstitutionalEmail(createForm.email)) return setCreateError(`Email must end with ${STAFF_EMAIL_DOMAINS.join(" or ")}.`);
      if (!createForm.password.trim()) return setCreateError("Password is required.");
    }
    setCreateError("");
    setCreateStep((s) => s + 1);
  };

  const closeCreateModal = () => {
    setCreateModal({ open: false, role: "" });
    setCreateStep(1);
    setCreateError("");
  };

  const handleCreate = async () => {
    setBusy(true);
    const isCounselor = createModal.role === "counselor";
    const res = await createUser({
      name: createForm.name,
      email: createForm.email,
      password: createForm.password,
      role: createModal.role,
      college: isCounselor ? null : (createForm.college || null),
      department: isCounselor ? null : (createForm.department || null),
      employeeId: isCounselor ? createForm.employeeId : null,
      position: isCounselor ? createForm.position : null,
      specialization: isCounselor ? createForm.specialization : null,
    });
    setBusy(false);
    if (res.success) {
      setCreateModal({ open: false, role: "" });
      setMessage({ type: "success", text: "User created successfully" });
    } else {
      setMessage({ type: "error", text: res.message || "Failed to create user" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const openEditModal = (user) => {
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      college: user.college || "",
      department: user.department || "",
      specialization: user.specialization || "",
      position: user.position || "",
      employeeId: user.employeeId || "",
      studentId: user.studentId || "",
      program: user.program || "",
    });
    setEditModal({ open: true, user });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (editModal.user.role === "student" && !/^\d{9}$/.test(editForm.studentId)) {
      setMessage({ type: "error", text: "Student ID must be exactly 9 digits." });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const updates = {
      name: editForm.name,
      email: editForm.email,
    };
    if (editModal.user.role !== "admin") {
      updates.phone = editForm.phone;
    }
    if (editModal.user.role === "student") {
      updates.studentId = editForm.studentId;
      updates.college = editForm.college;
      updates.department = editForm.department;
      updates.program = editForm.program;
    } else if (editModal.user.role === "counselor") {
      updates.employeeId = editForm.employeeId;
      updates.position = editForm.position;
      updates.specialization = editForm.specialization;
    } else if (editModal.user.role === "college_rep") {
      updates.college = editForm.college;
      updates.department = editForm.department;
    }
    setBusy(true);
    const res = await updateUser(editModal.user.id, updates);
    setBusy(false);
    if (res.success) {
      setEditModal({ open: false, user: null });
      setCorModalOpen(false);
      setMessage({ type: "success", text: "User updated successfully" });
    } else {
      setMessage({ type: "error", text: res.message || "Failed to update user" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const openDeleteConfirm = (userId) => setDeleteConfirm({ open: true, userId });

  const editDepartments = getDepartments(editForm.college);
  const editPrograms = getPrograms(editForm.college, editForm.department);

  const handleDelete = async () => {
    const userId = deleteConfirm.userId;
    setDeleteConfirm({ open: false, userId: null });
    const res = await banUser(userId);
    if (res.success) {
      setMessage({ type: "success", text: "Account banned. The user can no longer log in." });
    } else {
      setMessage({ type: "error", text: res.message || "Failed to ban account" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Administrator"
        title="Manage user accounts"
        subtitle="Create, edit, and delete accounts across all roles."
        actions={
          <div className="relative" ref={actionsRef}>
            <button
              onClick={() => setActionsOpen((o) => !o)}
              className={BTN.primary}
            >
              <UserPlus size={14} /> Actions <ChevronDown size={13} className={`transition-transform ${actionsOpen ? "rotate-180" : ""}`} />
            </button>
            {actionsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg ring-1 ring-gray-950/10 z-30 py-1 overflow-hidden">
                <button
                  onClick={() => { openCreateModal("counselor"); setActionsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                >
                  <UserPlus size={14} className="text-gray-400" /> Create counselor
                </button>
                <button
                  onClick={() => { openCreateModal("college_rep"); setActionsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                >
                  <UserPlus size={14} className="text-gray-400" /> Create college
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { setRecoverOpen(true); setActionsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                >
                  <RotateCcw size={14} className="text-gray-400" /> Recover account
                  {bannedUsers.length > 0 && (
                    <span className="ml-auto bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {bannedUsers.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        }
      />

      {message && (
        <div
          className={`mb-4 px-3 py-2 rounded-md border text-sm inline-flex items-center gap-2 ${message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
            }`}
        >
          {message.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      {/* Search bar with counselor suggestions on hover */}
      <div className="mb-4">
        <div
          className="relative max-w-md"
          onMouseEnter={() => setShowSuggestions(true)}
          onMouseLeave={() => setShowSuggestions(false)}
        >
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <input
            className={`${INPUT} pl-8`}
            placeholder="Search by name, email, or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg ring-1 ring-gray-950/10 z-30 overflow-hidden">
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Counselors
                </p>
              </div>
              <ul>
                {suggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left transition"
                      onClick={() => {
                        setQuery(c.name);
                        setActiveTab("counselor");
                        setShowSuggestions(false);
                      }}
                    >
                      <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {initialsOf(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 truncate">{c.position || c.email}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Tabbed user table */}
      <SectionCard noBodyPadding>
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 px-4 pt-3 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: "student", label: "Students", count: students.length },
            { id: "counselor", label: "Counselors", count: counselors.length },
            { id: "college_rep", label: "Colleges", count: reps.length },
            { id: "admin", label: "Administrators", count: admins.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${activeTab === tab.id
                  ? "border-maroon-600 text-maroon-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              {tab.label}
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.id
                    ? "bg-maroon-100 text-maroon-700"
                    : "bg-gray-100 text-gray-500"
                  }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Active tab content */}
        <UserTable
          rows={pagedRows}
          columns={
            activeTab === "student" ? STUDENT_COLUMNS
              : activeTab === "counselor" ? COUNSELOR_COLUMNS
                : activeTab === "college_rep" ? REP_COLUMNS
                  : ADMIN_COLUMNS
          }
          onEdit={openEditModal}
          onDelete={openDeleteConfirm}
          hideEdit={activeTab === "student" || activeTab === "counselor" || activeTab === "college_rep"}
          hideDelete={activeTab === "admin"}
          emptyText={
            activeTab === "student" ? "No students match your search"
              : activeTab === "counselor" ? "No counselors match your search"
                : activeTab === "college_rep" ? "No college representatives match your search"
                  : "No administrators match your search"
          }
        />

        {/* Pagination */}
        {activeRows.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, activeRows.length)} of {activeRows.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-gray-600 px-2 tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Create modal — 3-step wizard */}
      <Modal
        open={createModal.open}
        onClose={closeCreateModal}
        title={`Create ${createModal.role === "counselor" ? "counselor" : "college"} account`}
        footer={
          <div className="flex justify-between w-full">
            <button
              type="button"
              onClick={() => {
                if (createStep === 1) closeCreateModal();
                else { setCreateStep((s) => s - 1); setCreateError(""); }
              }}
              className={BTN.secondary}
            >
              {createStep === 1 ? "Cancel" : <><ArrowLeft size={14} /> Back</>}
            </button>
            {createStep < 3 ? (
              <button type="button" onClick={handleCreateNext} className={BTN.primary}>
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button type="button" onClick={handleCreate} className={BTN.primary}>
                Create account
              </button>
            )}
          </div>
        }
      >
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Step {createStep} <span className="text-gray-400">of 3</span>
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-maroon-500 rounded-full transition-all duration-300"
              style={{ width: `${(createStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step label */}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">
          {createModal.role === "counselor"
            ? ["Account credentials", "Professional details", "Review & confirm"][createStep - 1]
            : ["Account credentials", "College assignment", "Review & confirm"][createStep - 1]}
        </p>

        {/* Inline error */}
        {createError && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle size={14} className="flex-shrink-0" /> {createError}
          </div>
        )}

        <form
          id="create-user-form"
          onSubmit={(e) => e.preventDefault()}
          className="space-y-3"
        >
          {/* ── Step 1: Account credentials ── */}
          {createStep === 1 && (
            <>
              <div>
                <label className={LABEL}>Full name *</label>
                <input
                  type="text"
                  autoFocus
                  className={INPUT}
                  value={createForm.name}
                  onChange={(e) => { setCreateError(""); setCreateForm({ ...createForm, name: e.target.value }); }}
                  placeholder="e.g. Maria Santos"
                />
              </div>
              <div>
                <label className={LABEL}>Institutional Email *</label>
                <input
                  type="email"
                  className={INPUT}
                  value={createForm.email}
                  onChange={(e) => { setCreateError(""); setCreateForm({ ...createForm, email: e.target.value }); }}
                  placeholder="username@msu.edu.ph"
                />
              </div>
              <div>
                <label className={LABEL}>Password *</label>
                <input
                  type="text"
                  className={INPUT}
                  value={createForm.password}
                  onChange={(e) => { setCreateError(""); setCreateForm({ ...createForm, password: e.target.value }); }}
                />
                <p className="text-xs text-gray-400 mt-1">The user can change their password after first login.</p>
              </div>
            </>
          )}

          {/* ── Step 2 counselor: Professional details ── */}
          {createStep === 2 && createModal.role === "counselor" && (
            <>
              <div>
                <label className={LABEL}>Employee ID</label>
                <input
                  type="text"
                  autoFocus
                  className={INPUT}
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  placeholder="e.g. EMP-00123"
                />
              </div>
              <div>
                <label className={LABEL}>Position</label>
                <select
                  className={INPUT}
                  value={createForm.position}
                  onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
                >
                  <option value="">Select position</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Specialization</label>
                <select
                  className={INPUT}
                  value={createForm.specialization}
                  onChange={(e) => setCreateForm({ ...createForm, specialization: e.target.value })}
                >
                  <option value="">Select specialization</option>
                  {SPECIALIZATIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ── Step 2 college_rep: College assignment ── */}
          {createStep === 2 && createModal.role === "college_rep" && (
            <>
              <div>
                <label className={LABEL}>College *</label>
                <select
                  autoFocus
                  className={INPUT}
                  value={createForm.college}
                  onChange={(e) => setCreateForm({ ...createForm, college: e.target.value, department: "" })}
                >
                  {COLLEGES.map((c) => (
                    <option key={c} value={c}>{c} — {getCollegeName(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Department</label>
                <select
                  className={INPUT}
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                >
                  <option value="">Select department</option>
                  {getDepartments(createForm.college).map((d) => (
                    <option key={d.code} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ── Step 3: Review & confirm ── */}
          {createStep === 3 && (
            <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
              <CreateReviewRow label="Full name" value={createForm.name} />
              <CreateReviewRow label="Institutional Email" value={createForm.email} />
              <CreateReviewRow label="Password" value={"•".repeat(Math.min(createForm.password.length, 12))} />
              {createModal.role === "counselor" && (
                <>
                  <CreateReviewRow label="Employee ID" value={createForm.employeeId || "—"} />
                  <CreateReviewRow label="Position" value={createForm.position || "—"} />
                  <CreateReviewRow label="Specialization" value={createForm.specialization || "—"} />
                </>
              )}
              {createModal.role === "college_rep" && (
                <>
                  <CreateReviewRow label="College" value={createForm.college} />
                  <CreateReviewRow label="Department" value={createForm.department || "—"} />
                </>
              )}
            </div>
          )}
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editModal.open}
        onClose={() => {
          setEditModal({ open: false, user: null });
          setCorModalOpen(false);
        }}
        title="Edit user"
        subtitle={
          editModal.user
            ? `Role: ${editModal.user.role?.replace("_", " ")}`
            : ""
        }
        size="2xl"
        align="top"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setEditModal({ open: false, user: null });
                setCorModalOpen(false);
              }}
              className={BTN.secondary}
            >
              Cancel
            </button>
            <button type="submit" form="edit-user-form" className={BTN.primary}>
              Save changes
            </button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={handleEdit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Full name *</label>
              <input
                type="text"
                required
                className={INPUT}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Email *</label>
              <input
                type="email"
                required
                className={INPUT}
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
          </div>
          {editModal.user?.role !== "admin" && (
            <div>
              <label className={LABEL}>Phone number</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                className={INPUT}
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: sanitizePhoneDigits(e.target.value) })}
                placeholder="09XXXXXXXXX"
              />
            </div>
          )}

          {editModal.user?.role === "student" && (
            <div className="pt-3 border-t border-gray-100">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
                Academic information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Student ID</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={9}
                    className={INPUT}
                    value={editForm.studentId}
                    onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value.replace(/\D/g, "").slice(0, 9) })}
                    placeholder="9-digit ID"
                  />
                </div>
                <div>
                  <label className={LABEL}>College</label>
                  <select
                    className={INPUT}
                    value={editForm.college}
                    onChange={(e) =>
                      setEditForm({ ...editForm, college: e.target.value, department: "", program: "" })
                    }
                  >
                    <option value="">Select college</option>
                    {COLLEGES.map((c) => (
                      <option key={c} value={c}>
                        {c} — {getCollegeName(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Department</label>
                  <select
                    className={INPUT}
                    value={editForm.department}
                    onChange={(e) =>
                      setEditForm({ ...editForm, department: e.target.value, program: "" })
                    }
                    disabled={!editForm.college}
                  >
                    <option value="">
                      {editForm.college ? "Select department" : "Select a college first"}
                    </option>
                    {editForm.department &&
                      !editDepartments.some((d) => d.name === editForm.department) && (
                        <option value={editForm.department}>{editForm.department}</option>
                      )}
                    {editDepartments.map((d) => (
                      <option key={d.code} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Course</label>
                  <select
                    className={INPUT}
                    value={editForm.program}
                    onChange={(e) => setEditForm({ ...editForm, program: e.target.value })}
                    disabled={!editForm.department}
                  >
                    <option value="">
                      {editForm.department ? "Select course" : "Select a department first"}
                    </option>
                    {editForm.program && !editPrograms.includes(editForm.program) && (
                      <option value={editForm.program}>{editForm.program}</option>
                    )}
                    {editPrograms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                {buildCorUrl(editModal.user) ? (
                  <button
                    type="button"
                    onClick={() => setCorModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-maroon-600 hover:text-maroon-700 font-medium"
                  >
                    <Eye size={12} /> View COR
                  </button>
                ) : (
                  <p className="text-xs text-gray-500">No COR uploaded</p>
                )}
              </div>
            </div>
          )}

          {editModal.user?.role === "counselor" && (
            <div className="pt-3 border-t border-gray-100">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
                Professional information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>ID / Employee number</label>
                  <input
                    type="text"
                    className={INPUT}
                    value={editForm.employeeId}
                    onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                    placeholder="e.g. EMP-00123"
                  />
                </div>
                <div>
                  <label className={LABEL}>Position</label>
                  <select
                    className={INPUT}
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  >
                    <option value="">Select position</option>
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Specialization</label>
                  <input
                    type="text"
                    className={INPUT}
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    placeholder="e.g. Career Counseling"
                  />
                </div>
              </div>
            </div>
          )}

          {editModal.user?.role === "college_rep" && (
            <div className="pt-3 border-t border-gray-100">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
                College information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>College *</label>
                  <select
                    className={INPUT}
                    value={editForm.college}
                    onChange={(e) =>
                      setEditForm({ ...editForm, college: e.target.value, department: "" })
                    }
                  >
                    <option value="">Select college</option>
                    {COLLEGES.map((c) => (
                      <option key={c} value={c}>
                        {c} — {getCollegeName(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Department</label>
                  <select
                    className={INPUT}
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    disabled={!editForm.college}
                  >
                    <option value="">
                      {editForm.college ? "Select department" : "Select a college first"}
                    </option>
                    {editForm.department &&
                      !editDepartments.some((d) => d.name === editForm.department) && (
                        <option value={editForm.department}>{editForm.department}</option>
                      )}
                    {editDepartments.map((d) => (
                      <option key={d.code} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* COR view modal */}
      <Modal
        open={corModalOpen && editModal.user?.role === "student"}
        onClose={() => setCorModalOpen(false)}
        title="Certificate of Registration"
        subtitle={
          editModal.user
            ? `${editModal.user.name} · ${editForm.studentId || ""}`
            : ""
        }
        size="2xl"
        align="top"
      >
        {editModal.user && (
          <>
            {buildCorUrl(editModal.user)?.match(/\.(png|jpg|jpeg)$/i) ? (
              <img
                src={buildCorUrl(editModal.user)}
                alt="Certificate of Registration"
                className="w-full h-auto border border-gray-200 rounded-md"
              />
            ) : (
              <div className="text-center p-8">
                <FileText size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">
                  PDF file — cannot preview in browser
                </p>
                <a
                  href={buildCorUrl(editModal.user)}
                  download={`COR_${editForm.studentId || editModal.user.id}.pdf`}
                  className={BTN.primary}
                >
                  Download PDF
                </a>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Delete/ban confirmation */}
      <Modal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, userId: null })}
        title="Ban user"
        subtitle="The account will be suspended immediately."
        danger
        footer={
          <>
            <button
              onClick={() => setDeleteConfirm({ open: false, userId: null })}
              className={BTN.secondary}
            >
              Cancel
            </button>
            <button onClick={handleDelete} className={BTN.danger}>
              <Trash2 size={14} /> Ban account
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          The user will be blocked from logging in and will see a message to contact the DSA admin.
          You can restore the account at any time from <strong>Recover account</strong>.
        </p>
      </Modal>

      {/* Recover Account modal */}
      <Modal
        open={recoverOpen}
        onClose={() => setRecoverOpen(false)}
        title="Recover account"
        subtitle="Banned accounts. Click Restore to re-enable login."
      >
        {bannedUsers.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No banned accounts.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {bannedUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {initialsOf(u.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    <p className="text-[11px] text-gray-400 capitalize">{u.role?.replace("_", " ")}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const res = await unbanUser(u.id);
                    if (res.success) {
                      setMessage({ type: "success", text: `${u.name} has been restored.` });
                      setTimeout(() => setMessage(null), 3000);
                    }
                  }}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 flex-shrink-0 transition"
                >
                  <RotateCcw size={11} /> Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

function CreateReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm bg-white">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-900 font-medium text-right break-all">{value}</span>
    </div>
  );
}
