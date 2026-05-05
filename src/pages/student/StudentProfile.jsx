import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Mail, GraduationCap, BookOpen, Calendar, Phone, Edit2, Save, X } from "lucide-react";

export default function StudentProfile() {
  const { currentUser, users, updateUser } = useAuth();
  const myRecord = users?.find((u) => u.email === currentUser?.email) || currentUser;
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: myRecord?.name || "",
    email: myRecord?.email || "",
    phone: myRecord?.phone || "",
    college: myRecord?.college || "",
    program: myRecord?.program || "",
    yearLevel: myRecord?.yearLevel || "",
    bio: myRecord?.bio || "",
  });
  const [message, setMessage] = useState(null);

  const colleges = [
    "CAS - College of Arts and Sciences",
    "COE - College of Engineering",
    "CICS - College of Information and Computing Sciences",
    "COB - College of Business",
    "CED - College of Education",
    "COL - College of Law",
    "COM - College of Medicine"
  ];

  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

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
      college: myRecord?.college || "",
      program: myRecord?.program || "",
      yearLevel: myRecord?.yearLevel || "",
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

              {/* Student ID (Read-only) */}
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">Student ID</label>
                <p className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">{myRecord?.studentId || "N/A"}</p>
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
                <label className="text-sm text-gray-600">Student ID</label>
                <p className="font-medium text-gray-900">{myRecord?.studentId || "N/A"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Academic Information - READ ONLY (Set by Admin) */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Academic Information</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Set by Admin</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 flex items-center gap-2">
                <GraduationCap size={16} />
                College
              </label>
              <p className="font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                {myRecord?.college || "Not set"}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 flex items-center gap-2">
                <BookOpen size={16} />
                Program/Course
              </label>
              <p className="font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                {myRecord?.program || "Not set"}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 flex items-center gap-2">
                <Calendar size={16} />
                Year Level
              </label>
              <p className="font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                {myRecord?.yearLevel || "Not set"}
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <p className="font-semibold mb-1">ℹ️ Note:</p>
            <p>Academic information is verified and set by the admin based on your Certificate of Registration. Contact the admin if you need to update this information.</p>
          </div>
        </div>

        {/* Bio/About */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About Me</h3>
          
          {isEditing ? (
            <div>
              <label className="text-sm text-gray-600 font-medium mb-1 block">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-transparent resize-none"
                rows="6"
                placeholder="Tell us about yourself..."
              />
            </div>
          ) : (
            <p className="text-gray-700 text-sm">
              {myRecord?.bio || "No bio provided yet. Click 'Edit Profile' to add information about yourself."}
            </p>
          )}
        </div>
      </div>

      {/* Counseling History */}
      <div className="mt-6 bg-white border border-gray-200 p-6 rounded-xl shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Counseling History</h3>
        <div className="space-y-3">
          <div className="border-l-4 border-maroon-500 pl-4 py-2">
            <p className="font-medium text-gray-900">Academic Guidance Session</p>
            <p className="text-sm text-gray-600">November 15, 2025 with Dr. Maria Santos</p>
          </div>
          <div className="border-l-4 border-maroon-500 pl-4 py-2">
            <p className="font-medium text-gray-900">Career Planning Consultation</p>
            <p className="text-sm text-gray-600">October 8, 2025 with Dr. Maria Santos</p>
          </div>
        </div>
      </div>
    </div>
  );
}