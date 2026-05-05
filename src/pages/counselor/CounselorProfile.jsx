import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Mail, Phone, Briefcase, Award, FileText, Edit2, Save, X } from "lucide-react";

export default function CounselorProfile() {
  const { currentUser, users, updateUser } = useAuth();
  const myRecord = users?.find((u) => u.email === currentUser?.email) || currentUser;

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

  const departments = [
    "Guidance Office",
    "Psychology Department",
    "Student Affairs",
    "Health Services",
    "Academic Counseling",
    "Career Development"
  ];

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      setMessage({ type: "error", text: "Name and email are required" });
      return;
    }

    updateUser(currentUser.id, formData);
    setIsEditing(false);
    setMessage({ type: "success", text: "Profile updated successfully!" });
    setTimeout(() => setMessage(null), 3000);
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Save size={18} />
                  Save
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

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h4 className="text-sm text-gray-600 mb-2">Total Sessions</h4>
          <p className="text-3xl font-bold text-maroon-600">42</p>
          <p className="text-xs text-gray-500 mt-1">This semester</p>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h4 className="text-sm text-gray-600 mb-2">Active Students</h4>
          <p className="text-3xl font-bold text-maroon-600">18</p>
          <p className="text-xs text-gray-500 mt-1">Currently counseling</p>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h4 className="text-sm text-gray-600 mb-2">Pending Requests</h4>
          <p className="text-3xl font-bold text-maroon-600">5</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
        </div>
      </div>
    </div>
  );
}