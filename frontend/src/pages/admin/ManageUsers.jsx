import React, { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { COLLEGES } from "../../data/mockData";
import {
  Edit2,
  Trash2,
  Search,
  UserPlus,
  CheckCircle,
  AlertCircle,
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

const DEPARTMENTS = [
  "Guidance Office",
  "Psychology Department",
  "Student Affairs",
  "Health Services",
  "Academic Counseling",
  "Career Development",
];

const ROLE_PILL = {
  student: "bg-blue-50 text-blue-700 border-blue-200",
  counselor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  college_rep: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function ManageUsers() {
  const { users, createUser, updateUser, deleteUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState("All");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState(null);
  const [_busy, setBusy] = useState(false);

  const [createModal, setCreateModal] = useState({ open: false, role: "" });
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, userId: null });

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    college: COLLEGES[0],
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    college: "",
    department: "",
    specialization: "",
    employeeId: "",
  });

  const allUsers = users || [];

  const filtered = useMemo(() => {
    return allUsers.filter((u) => {
      const matchesRole = selectedRole === "All" || u.role === selectedRole;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.studentId?.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [allUsers, selectedRole, query]);

  const openCreateModal = (role) => {
    setCreateForm({ name: "", email: "", password: "password123", college: COLLEGES[0] });
    setCreateModal({ open: true, role });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await createUser({
      name: createForm.name,
      email: createForm.email,
      password: createForm.password,
      role: createModal.role,
      college: createModal.role === "college_rep" ? createForm.college : null,
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
      employeeId: user.employeeId || "",
    });
    setEditModal({ open: true, user });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const updates = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
    };
    if (editModal.user.role === "counselor") {
      updates.department = editForm.department;
      updates.specialization = editForm.specialization;
    } else if (editModal.user.role === "college_rep") {
      updates.college = editForm.college;
    }
    setBusy(true);
    const res = await updateUser(editModal.user.id, updates);
    setBusy(false);
    if (res.success) {
      setEditModal({ open: false, user: null });
      setMessage({ type: "success", text: "User updated successfully" });
    } else {
      setMessage({ type: "error", text: res.message || "Failed to update user" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const openDeleteConfirm = (userId) => setDeleteConfirm({ open: true, userId });

  const handleDelete = async () => {
    setBusy(true);
    const res = await deleteUser(deleteConfirm.userId);
    setBusy(false);
    if (res.success) {
      setDeleteConfirm({ open: false, userId: null });
      setMessage({ type: "success", text: "User deleted successfully" });
    } else {
      setMessage({ type: "error", text: res.message || "Failed to delete user" });
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
          <>
            <button onClick={() => openCreateModal("counselor")} className={BTN.secondary}>
              <UserPlus size={14} /> Create counselor
            </button>
            <button onClick={() => openCreateModal("college_rep")} className={BTN.primary}>
              <UserPlus size={14} /> Create rep
            </button>
          </>
        }
      />

      {message && (
        <div
          className={`mb-4 px-3 py-2 rounded-md border text-sm inline-flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      <SectionCard className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Role</label>
            <select
              className={INPUT}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="All">All roles</option>
              <option value="student">Students</option>
              <option value="counselor">Counselors</option>
              <option value="college_rep">College representatives</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Search</label>
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className={`${INPUT} pl-8`}
                placeholder="Name, email, or student ID…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Users"
        subtitle={`${filtered.length} match${filtered.length === 1 ? "" : "es"}`}
        noBodyPadding
      >
        {filtered.length === 0 ? (
          <EmptyState title="No users match your filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">ID / Email</th>
                  <th className="px-4 py-2.5">College</th>
                  <th className="px-4 py-2.5">Program / Dept</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initialsOf(u.name)}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
                          ROLE_PILL[u.role] || "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "student" ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900 tabular-nums">
                            {u.studentId}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">{u.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm">{u.college || "—"}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm">
                      {u.role === "student"
                        ? u.program || "—"
                        : u.role === "counselor"
                        ? u.department || "—"
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        status={
                          u.status === "pending_approval"
                            ? "pending"
                            : u.status && u.status !== "approved"
                            ? "rejected"
                            : "active"
                        }
                      >
                        {u.status === "pending_approval"
                          ? "Pending"
                          : u.status && u.status !== "approved"
                          ? "Rejected"
                          : "Active"}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(u.id)}
                          className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Create modal */}
      <Modal
        open={createModal.open}
        onClose={() => setCreateModal({ open: false, role: "" })}
        title={`Create ${createModal.role === "counselor" ? "counselor" : "college dean"}`}
        subtitle="Account credentials and basic details"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateModal({ open: false, role: "" })}
              className={BTN.secondary}
            >
              Cancel
            </button>
            <button type="submit" form="create-user-form" className={BTN.primary}>
              Create user
            </button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className={LABEL}>Full name *</label>
            <input
              type="text"
              required
              className={INPUT}
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Email *</label>
            <input
              type="email"
              required
              className={INPUT}
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Password *</label>
            <input
              type="text"
              required
              className={INPUT}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            />
          </div>
          {createModal.role === "college_rep" && (
            <div>
              <label className={LABEL}>College *</label>
              <select
                className={INPUT}
                value={createForm.college}
                onChange={(e) => setCreateForm({ ...createForm, college: e.target.value })}
              >
                {COLLEGES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, user: null })}
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
              onClick={() => setEditModal({ open: false, user: null })}
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
          <div>
            <label className={LABEL}>Phone number</label>
            <input
              type="tel"
              className={INPUT}
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="09XX XXX XXXX"
            />
          </div>

          {editModal.user?.role === "student" && (
            <div className="px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-xs text-blue-800">
              Academic information (college, program, year level, student ID) is managed by the
              student or the College Representative and is no longer editable here.
            </div>
          )}

          {editModal.user?.role === "counselor" && (
            <div className="pt-3 border-t border-gray-100">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
                Professional information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Department</label>
                  <select
                    className={INPUT}
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
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
                    onChange={(e) =>
                      setEditForm({ ...editForm, specialization: e.target.value })
                    }
                    placeholder="e.g. Academic Counseling"
                  />
                </div>
              </div>
            </div>
          )}

          {editModal.user?.role === "college_rep" && (
            <div className="pt-3 border-t border-gray-100">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
                Representative information
              </h4>
              <div>
                <label className={LABEL}>College *</label>
                <select
                  className={INPUT}
                  value={editForm.college}
                  onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                >
                  <option value="">Select college</option>
                  {COLLEGES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, userId: null })}
        title="Delete user"
        subtitle="This action cannot be undone."
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
              <Trash2 size={14} /> Delete user
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Are you sure you want to delete this user? Related data may also be affected.
        </p>
      </Modal>
    </div>
  );
}
