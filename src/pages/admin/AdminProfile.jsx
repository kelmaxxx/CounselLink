import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Mail, Phone, Shield, Edit2, Save, X } from "lucide-react";

export default function AdminProfile() {
  const { currentUser, users, updateUser } = useAuth();
  const myRecord = users?.find((u) => u.email === currentUser?.email) || currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: myRecord?.name || "",
    email: myRecord?.email || "",
    phone: myRecord?.phone || "",
    employeeId: myRecord?.employeeId || "",
  });
  const [message, setMessage] = useState(null);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Administrator Information</h3>
          
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
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  <Shield size={16} />
                  Role
                </label>
                <p className="font-medium text-maroon-600">System Administrator</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Access Level</label>
                <p className="font-medium text-gray-900">Full System Access</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Permissions</h3>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start">
              <span className="text-maroon-500 mr-3">✓</span>
              <span>Manage all user accounts (Create, Edit, Delete)</span>
            </li>
            <li className="flex items-start">
              <span className="text-maroon-500 mr-3">✓</span>
              <span>Create and send system announcements</span>
            </li>
            <li className="flex items-start">
              <span className="text-maroon-500 mr-3">✓</span>
              <span>Generate system reports and analytics</span>
            </li>
            <li className="flex items-start">
              <span className="text-maroon-500 mr-3">✓</span>
              <span>Approve/deny data access requests</span>
            </li>
            <li className="flex items-start">
              <span className="text-maroon-500 mr-3">✓</span>
              <span>Monitor system activity and logs</span>
            </li>
            <li className="flex items-start">
              <span className="text-maroon-500 mr-3">✓</span>
              <span>Configure system settings</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}