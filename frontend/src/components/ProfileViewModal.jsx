import React, { useState } from "react";
import { X, Mail, Phone, MapPin, GraduationCap, Briefcase, MessageCircle } from "lucide-react";
import { useMessages } from "../context/MessagesContext";
import { useAuth } from "../context/AuthContext";

export default function ProfileViewModal({ user, onClose, onOpenChat }) {
  const { currentUser } = useAuth();
  
  if (!user) return null;

  const getRoleDisplay = (role) => {
    const roleMap = {
      student: "Student",
      counselor: "Counselor",
      admin: "Administrator",
      college_rep: "College Representative",
    };
    return roleMap[role] || role;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-maroon-600 to-maroon-500 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-maroon-100">{getRoleDisplay(user.role)}</p>
              {user.college && (
                <p className="text-maroon-100 text-sm mt-1">{user.college}</p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-700">
                <Mail size={18} className="text-maroon-600" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone size={18} className="text-maroon-600" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Academic/Professional Information */}
          {user.role === "student" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Academic Information</h3>
              <div className="space-y-3">
                {user.studentId && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <GraduationCap size={18} className="text-maroon-600" />
                    <div>
                      <p className="text-sm text-gray-500">Student ID</p>
                      <p className="font-medium">{user.studentId}</p>
                    </div>
                  </div>
                )}
                {user.college && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <GraduationCap size={18} className="text-maroon-600" />
                    <div>
                      <p className="text-sm text-gray-500">College</p>
                      <p className="font-medium">{user.college}</p>
                    </div>
                  </div>
                )}
                {user.program && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <GraduationCap size={18} className="text-maroon-600" />
                    <div>
                      <p className="text-sm text-gray-500">Program</p>
                      <p className="font-medium">{user.program}</p>
                    </div>
                  </div>
                )}
                {user.yearLevel && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <GraduationCap size={18} className="text-maroon-600" />
                    <div>
                      <p className="text-sm text-gray-500">Year Level</p>
                      <p className="font-medium">{user.yearLevel}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(user.role === "counselor" || user.role === "admin" || user.role === "college_rep") && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Information</h3>
              <div className="space-y-3">
                {user.employeeId && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Briefcase size={18} className="text-maroon-600" />
                    <div>
                      <p className="text-sm text-gray-500">Employee ID</p>
                      <p className="font-medium">{user.employeeId}</p>
                    </div>
                  </div>
                )}
                {user.department && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Briefcase size={18} className="text-maroon-600" />
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="font-medium">{user.department}</p>
                    </div>
                  </div>
                )}
                {user.specialization && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Briefcase size={18} className="text-maroon-600" />
                    <div>
                      <p className="text-sm text-gray-500">Specialization</p>
                      <p className="font-medium">{user.specialization}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bio */}
          {user.bio && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
              <p className="text-gray-700">{user.bio}</p>
            </div>
          )}

          {/* Action Buttons */}
          {currentUser && currentUser.id !== user.id && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  onClose();
                  onOpenChat(user);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition font-medium"
              >
                <MessageCircle size={18} />
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
