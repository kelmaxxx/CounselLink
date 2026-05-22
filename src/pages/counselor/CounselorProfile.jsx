import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Mail, Phone, Briefcase, Award, FileText, Edit2, Save, X, Star } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function CounselorProfile() {
  const { currentUser, refreshCurrentUser, updateProfile } = useAuth();
  const myRecord = currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: myRecord?.name || "",
    email: myRecord?.email || "",
    phone: myRecord?.phone || "",
    employeeId: myRecord?.employeeId || "",
    department: myRecord?.department || "",
    specialization: myRecord?.specialization || "",
    bio: myRecord?.bio || "",
  });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    refreshCurrentUser?.().then((fresh) => {
      if (!fresh) return;
      setFormData((f) => ({
        ...f,
        name: fresh.name || "",
        email: fresh.email || "",
        phone: fresh.phone || "",
        employeeId: fresh.employeeId || "",
        department: fresh.department || "",
        specialization: fresh.specialization || "",
        bio: fresh.bio || "",
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const departments = [
    "Guidance Office",
    "Psychology Department",
    "Student Affairs",
    "Health Services",
    "Academic Counseling",
    "Career Development"
  ];

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      setMessage({ type: "error", text: "Name and email are required" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        department: formData.department,
        specialization: formData.specialization,
      });
      setIsEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update profile" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: myRecord?.name || "",
      email: myRecord?.email || "",
      phone: myRecord?.phone || "",
      employeeId: myRecord?.employeeId || "",
      department: myRecord?.department || "",
      specialization: myRecord?.specialization || "",
      bio: myRecord?.bio || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">My Profile</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition"
          >
            <Edit2 size={18} />
            Edit Profile
          </button>
        )}
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          
          {isEditing ? (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm text-gray-600 font-medium flex items-center gap-2 mb-1">
                  <User size={16} />
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm text-gray-600 font-medium flex items-center gap-2 mb-1">
                  <Mail size={16} />
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm text-gray-600 font-medium flex items-center gap-2 mb-1">
                  <Phone size={16} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>

              {/* Employee ID (Read-only) */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">Employee ID</label>
                <p className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">{myRecord?.employeeId || "Not assigned"}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  <User size={16} />
                  Name
                </label>
                <p className="font-medium text-gray-900">{myRecord?.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  <Mail size={16} />
                  Email
                </label>
                <p className="font-medium text-gray-900">{myRecord?.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  <Phone size={16} />
                  Phone
                </label>
                <p className="font-medium text-gray-900">{myRecord?.phone || "Not provided"}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Employee ID</label>
                <p className="font-medium text-gray-900">{myRecord?.employeeId || "Not assigned"}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Role</label>
                <p className="font-medium text-gray-900">Counselor</p>
              </div>
            </div>
          )}
        </div>

        {/* Professional Information */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
          
          {isEditing ? (
            <div className="space-y-4">
              {/* Department */}
              <div>
                <label className="text-sm text-gray-600 font-medium flex items-center gap-2 mb-1">
                  <Briefcase size={16} />
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Specialization */}
              <div>
                <label className="text-sm text-gray-600 font-medium flex items-center gap-2 mb-1">
                  <Award size={16} />
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-transparent"
                  placeholder="e.g., Academic Counseling, Career Guidance"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  <Briefcase size={16} />
                  Department
                </label>
                <p className="font-medium text-gray-900">{myRecord?.department || "Not provided"}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  <Award size={16} />
                  Specialization
                </label>
                <p className="font-medium text-gray-900">{myRecord?.specialization || "Not provided"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bio/About */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About Me</h3>
          
          {isEditing ? (
            <div>
              <label className="text-sm text-gray-600 font-medium flex items-center gap-2 mb-1">
                <FileText size={16} />
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-transparent resize-none"
                rows="6"
                placeholder="Tell students about yourself and your counseling approach..."
              />
            </div>
          ) : (
            <p className="text-gray-700 text-sm">
              {myRecord?.bio || "No bio provided yet. Click 'Edit Profile' to add information about yourself and your counseling approach."}
            </p>
          )}
        </div>
      </div>

      <FeedbackPanel />
    </div>
  );
}

function FeedbackPanel() {
  const { token } = useAuth();
  const [data, setData] = useState({ items: [], count: 0, average: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    fetch(`${API_BASE}/api/feedback?counselorId=me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json().then((body) => ({ res, body })))
      .then(({ res, body }) => {
        if (!mounted) return;
        if (!res.ok) {
          setError(body.message || "Unable to load feedback");
          setData({ items: [], count: 0, average: null });
        } else {
          setData({
            items: Array.isArray(body.items) ? body.items : [],
            count: body.count || 0,
            average: body.average,
          });
        }
      })
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="mt-6 bg-white border border-gray-200 p-6 rounded-xl shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Student Feedback</h3>
          <p className="text-sm text-gray-600">
            {data.count > 0
              ? `${data.count} response${data.count === 1 ? "" : "s"} · average ${
                  data.average?.toFixed(1) ?? "—"
                } / 5`
              : "No feedback received yet."}
          </p>
        </div>
        <div className="flex items-center gap-1 text-amber-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={18}
              fill={data.average && i < Math.round(data.average) ? "currentColor" : "none"}
              stroke="currentColor"
            />
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {!loading && data.items.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {data.items.map((fb) => (
            <li key={fb.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{fb.studentName || "Anonymous"}</p>
                  <p className="text-xs text-gray-500">
                    {fb.created_at ? new Date(fb.created_at).toLocaleString() : ""}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < fb.rating ? "currentColor" : "none"}
                      stroke="currentColor"
                    />
                  ))}
                </div>
              </div>
              {fb.comment && <p className="text-sm text-gray-700 mt-1">{fb.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}