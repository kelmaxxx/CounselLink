import React, { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { COLLEGES } from "../../data/mockData";
import { X, Edit2, Trash2, Search, UserPlus, CheckCircle, AlertCircle } from "lucide-react";

export default function ManageUsers() {
  const { users, createUser, updateUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState("All");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState(null);

  // Modals
  const [createModal, setCreateModal] = useState({ open: false, role: "" });
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, userId: null });

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    college: COLLEGES[0]
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    college: "",
    program: "",
    yearLevel: "",
    department: "",
    specialization: "",
    employeeId: ""
  });

  // Programs and Year Levels for students
  const programs = [
    "BS Computer Science",
    "BS Information Technology",
    "BS Mathematics",
    "BS Biology",
    "BS Chemistry",
    "BS Physics",
    "BS Psychology",
    "AB English",
    "AB History",
    "AB Political Science",
    "BS Civil Engineering",
    "BS Electrical Engineering",
    "BS Mechanical Engineering",
    "BS Architecture",
    "BS Business Administration",
    "BS Accountancy",
    "BS Economics",
    "BS Education",
    "BS Elementary Education",
    "BS Secondary Education",
    "LLB",
    "Doctor of Medicine"
  ];

  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

  const departments = [
    "Guidance Office",
    "Psychology Department",
    "Student Affairs",
    "Health Services",
    "Academic Counseling",
    "Career Development"
  ];

  // Show ALL users now (including students)
  const allUsers = users || [];

  const filtered = useMemo(() => {
    return allUsers.filter((u) => {
      const matchesRole = selectedRole === "All" || u.role === selectedRole;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) ||
        u.studentId?.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [allUsers, selectedRole, query]);

  // Handlers
  const openCreateModal = (role) => {
    setCreateForm({ name: "", email: "", password: "password123", college: COLLEGES[0] });
    setCreateModal({ open: true, role });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const res = createUser({
      name: createForm.name,
      email: createForm.email,
      password: createForm.password,
      role: createModal.role,
      college: createModal.role === "college_rep" ? createForm.college : null
    });
    if (res.success) {
      setCreateModal({ open: false, role: "" });
      setMessage({ type: "success", text: "User created successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: res.message || "Failed to create user" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const openEditModal = (user) => {
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      college: user.college || "",
      program: user.program || "",
      yearLevel: user.yearLevel || "",
      department: user.department || "",
      specialization: user.specialization || "",
      employeeId: user.employeeId || ""
    });
    setEditModal({ open: true, user });
  };

  const handleEdit = (e) => {
    e.preventDefault();
    
    const updates = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone
    };

    // Add role-specific fields
    if (editModal.user.role === "student") {
      updates.college = editForm.college;
      updates.program = editForm.program;
      updates.yearLevel = editForm.yearLevel;
    } else if (editModal.user.role === "counselor") {
      updates.department = editForm.department;
      updates.specialization = editForm.specialization;
    } else if (editModal.user.role === "college_rep") {
      updates.college = editForm.college;
    }

    updateUser(editModal.user.id, updates);
    setEditModal({ open: false, user: null });
    setMessage({ type: "success", text: "User updated successfully!" });
    setTimeout(() => setMessage(null), 3000);
  };

  const openDeleteConfirm = (userId) => {
    setDeleteConfirm({ open: true, userId });
  };

  const handleDelete = () => {
    const updatedUsers = users.filter(u => u.id !== deleteConfirm.userId);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    
    setDeleteConfirm({ open: false, userId: null });
    setMessage({ type: "success", text: "User deleted successfully!" });
    setTimeout(() => setMessage(null), 3000);
    
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Manage User Accounts</h2>

      {/* Success/Error Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="bg-white border border-gray-200 p-4 rounded-xl mb-6 shadow">
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 font-medium">Role</label>
            <select
              className="px-3 py-2 rounded border border-gray-300 bg-white text-gray-900"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="student">Students</option>
              <option value="counselor">Counselors</option>
              <option value="college_rep">College Representatives</option>
              <option value="admin">Administrators</option>
            </select>
          </div>

          <div className="mt-3 md:mt-0 flex-1 flex items-center gap-2">
            <Search size={20} className="text-gray-400" />
            <input
              placeholder="Search name, email, or student ID..."
              className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mt-3 md:mt-0 flex gap-2">
            <button 
              onClick={() => openCreateModal("counselor")} 
              className="flex items-center gap-2 px-4 py-2 bg-maroon-500 text-white rounded-lg hover:bg-maroon-600 transition"
            >
              <UserPlus size={18} />
              Create Counselor
            </button>
            <button 
              onClick={() => openCreateModal("college_rep")} 
              className="flex items-center gap-2 px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition"
            >
              <UserPlus size={18} />
              Create Rep
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow overflow-x-auto">
        <p className="text-sm text-gray-600 mb-4">Total: {filtered.length} user(s)</p>
        <table className="w-full text-left">
          <thead>
            <tr className="text-sm text-gray-700 border-b border-gray-200 bg-gray-50">
              <th className="py-3 px-3 font-medium">Name</th>
              <th className="py-3 px-3 font-medium">Role</th>
              <th className="py-3 px-3 font-medium">ID/Email</th>
              <th className="py-3 px-3 font-medium">College</th>
              <th className="py-3 px-3 font-medium">Program/Dept</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">No users match your filters.</td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-maroon-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{u.name}</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.role === 'student' ? 'bg-blue-100 text-blue-800' :
                    u.role === 'counselor' ? 'bg-green-100 text-green-800' :
                    u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {u.role.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-3 text-sm">
                  {u.role === 'student' ? (
                    <div>
                      <p className="font-medium text-gray-900">{u.studentId}</p>
                      <p className="text-gray-600 text-xs">{u.email}</p>
                    </div>
                  ) : (
                    <p className="text-gray-600">{u.email}</p>
                  )}
                </td>
                <td className="py-3 px-3 text-sm text-gray-700">{u.college || "—"}</td>
                <td className="py-3 px-3 text-sm text-gray-700">
                  {u.role === 'student' ? (u.program || "—") : 
                   u.role === 'counselor' ? (u.department || "—") : "—"}
                </td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.status === 'approved' || !u.status ? 'bg-green-100 text-green-800' :
                    u.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {u.status === 'approved' || !u.status ? 'Active' : 
                     u.status === 'pending_approval' ? 'Pending' : 'Rejected'}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(u)} 
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition font-medium"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button 
                      onClick={() => openDeleteConfirm(u.id)} 
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition font-medium"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {createModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create {createModal.role === "counselor" ? "Counselor" : "College Representative"}</h3>
              <button onClick={() => setCreateModal({ open: false, role: "" })} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required 
                  className="w-full border rounded px-3 py-2" 
                  value={createForm.name} 
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input 
                  type="email" 
                  required 
                  className="w-full border rounded px-3 py-2" 
                  value={createForm.email} 
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input 
                  type="text" 
                  required 
                  className="w-full border rounded px-3 py-2" 
                  value={createForm.password} 
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} 
                />
              </div>
              {createModal.role === "college_rep" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">College *</label>
                  <select 
                    className="w-full border rounded px-3 py-2" 
                    value={createForm.college} 
                    onChange={(e) => setCreateForm({ ...createForm, college: e.target.value })}
                  >
                    {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setCreateModal({ open: false, role: "" })} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-maroon-600 text-white rounded hover:bg-maroon-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Edit User</h3>
                <p className="text-sm text-gray-600">
                  Role: <span className="font-medium capitalize">{editModal.user?.role.replace('_', ' ')}</span>
                </p>
              </div>
              <button onClick={() => setEditModal({ open: false, user: null })} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              {/* Basic Info - All Users */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-maroon-500 focus:border-transparent" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input 
                    type="email" 
                    required 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-maroon-500 focus:border-transparent" 
                    value={editForm.email} 
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-maroon-500 focus:border-transparent" 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} 
                  placeholder="09XX XXX XXXX"
                />
              </div>

              {/* Student-Specific Fields */}
              {editModal.user?.role === "student" && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Academic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-maroon-500 focus:border-transparent" 
                        value={editForm.college} 
                        onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                      >
                        <option value="">Select College</option>
                        {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Program/Course</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-maroon-500 focus:border-transparent" 
                        value={editForm.program} 
                        onChange={(e) => setEditForm({ ...editForm, program: e.target.value })}
                      >
                        <option value="">Select Program</option>
                        {programs.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-maroon-500 focus:border-transparent" 
                        value={editForm.yearLevel} 
                        onChange={(e) => setEditForm({ ...editForm, yearLevel: e.target.value })}
                      >
                        <option value="">Select Year Level</option>
                        {yearLevels.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                      <input 
                        type="text" 
                        disabled
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600" 
                        value={editModal.user?.studentId || ""} 
                      />
                      <p className="text-xs text-gray-500 mt-1">Student ID cannot be changed</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Counselor-Specific Fields */}
              {editModal.user?.role === "counselor" && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Professional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-maroon-500 focus:border-transparent" 
                        value={editForm.department} 
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                      <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-maroon-500 focus:border-transparent" 
                        value={editForm.specialization} 
                        onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })} 
                        placeholder="e.g., Academic Counseling"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* College Rep-Specific Fields */}
              {editModal.user?.role === "college_rep" && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Representative Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">College *</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-maroon-500 focus:border-transparent" 
                      value={editForm.college} 
                      onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                    >
                      <option value="">Select College</option>
                      {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setEditModal({ open: false, user: null })} 
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">Confirm Delete</h3>
              <button onClick={() => setDeleteConfirm({ open: false, userId: null })} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-700 mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm({ open: false, userId: null })} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}