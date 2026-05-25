// src/pages/admin/PendingRegistrations.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle, XCircle, Eye, Calendar, Mail, Phone, GraduationCap, User, Clock } from "lucide-react";

export default function PendingRegistrations() {
  const { fetchPendingRegistrations, approveRegistration, rejectRegistration } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCorModal, setShowCorModal] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState(null);
  const [approvalForm, setApprovalForm] = useState({ program: "", yearLevel: "" });
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState(null);

  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedToday, setApprovedToday] = useState(0);

  useEffect(() => {
    let mounted = true;
    const loadPending = async () => {
      try {
        const data = await fetchPendingRegistrations();
        if (mounted) {
          setPendingUsers(data);
          setApprovedToday(0);
        }
      } catch (err) {
        setMessage({ type: "error", text: err.message || "Unable to load pending registrations" });
      }
    };
    loadPending();
    return () => {
      mounted = false;
    };
  }, [fetchPendingRegistrations]);

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

  const handleApprove = async (user) => {
    if (!approvalForm.program || !approvalForm.yearLevel) {
      setMessage({ type: "error", text: "Please select program and year level" });
      return;
    }

    try {
      await approveRegistration(user.id, {
        program: approvalForm.program,
        yearLevel: approvalForm.yearLevel,
      });
      setPendingUsers((prev) => prev.filter((item) => item.id !== user.id));
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Unable to approve registration" });
      return;
    }

    // Simulate email being sent
    setEmailPreviewData({
      type: "approval",
      recipient: user.email,
      name: user.name,
      studentId: user.studentId,
      college: user.college,
      program: approvalForm.program,
      yearLevel: approvalForm.yearLevel
    });

    // Show email sent notification
    setMessage({ 
      type: "success", 
      text: `${user.name}'s registration approved! ✉️ Approval email sent to ${user.email}` 
    });
    
    setSelectedUser(null);
    setApprovalForm({ program: "", yearLevel: "" });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleReject = async (user) => {
    if (!rejectionReason.trim()) {
      setMessage({ type: "error", text: "Please provide a reason for rejection" });
      return;
    }

    try {
      await rejectRegistration(user.id, {
        reason: rejectionReason,
      });
      setPendingUsers((prev) => prev.filter((item) => item.id !== user.id));
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Unable to reject registration" });
      return;
    }

    // Simulate email being sent
    setEmailPreviewData({
      type: "rejection",
      recipient: user.email,
      name: user.name,
      studentId: user.studentId,
      reason: rejectionReason
    });

    // Show email sent notification
    setMessage({ 
      type: "success", 
      text: `${user.name}'s registration rejected. ✉️ Notification email sent to ${user.email}` 
    });
    
    setSelectedUser(null);
    setRejectionReason("");
    setTimeout(() => setMessage(null), 5000);
  };

  const buildCorUrl = (user) => {
    if (!user?.corUrl) return null;
    if (user.corUrl.startsWith("http")) return user.corUrl;
    return `${apiBase}${user.corUrl}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Pending Student Registrations</h2>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">Pending Review</p>
              <p className="text-3xl font-bold text-yellow-900">{pendingUsers.length}</p>
            </div>
            <Clock className="text-yellow-600" size={40} />
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Approved Today</p>
              <p className="text-3xl font-bold text-green-900">{approvedToday}</p>
            </div>
            <CheckCircle className="text-green-600" size={40} />
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div>
            <p className="text-sm text-blue-700 font-medium">Average Time</p>
            <p className="text-3xl font-bold text-blue-900">~18h</p>
            <p className="text-xs text-blue-600">Approval time</p>
          </div>
        </div>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{message.text}</span>
          {message.type === 'success' && emailPreviewData && (
            <button
              onClick={() => setShowEmailPreview(true)}
              className="text-sm px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Preview Email
            </button>
          )}
        </div>
      )}

      {/* Pending Registrations List */}
      {pendingUsers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CheckCircle size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No pending registrations</p>
          <p className="text-gray-500 text-sm">All caught up! New registrations will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <div key={user.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 bg-maroon-600 text-white rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* User Info */}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          <span>ID: {user.studentId}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail size={14} />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={14} />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <GraduationCap size={16} className="text-maroon-600" />
                        <span className="text-sm font-medium text-gray-700">{user.college}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>Submitted: {formatDate(user.submittedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* COR Preview */}
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-2">Certificate of Registration</p>
                    {buildCorUrl(user) ? (
                      <div>
                        {buildCorUrl(user).match(/\.(png|jpg|jpeg)$/i) ? (
                          <img 
                            src={buildCorUrl(user)} 
                            alt="COR Preview" 
                            className="w-32 h-24 object-cover border border-gray-300 rounded-lg cursor-pointer hover:opacity-80 transition"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowCorModal(true);
                            }}
                          />
                        ) : (
                          <div className="w-32 h-24 border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                            <span className="text-xs text-gray-600">PDF File</span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowCorModal(true);
                          }}
                          className="text-xs text-maroon-600 hover:text-maroon-700 mt-1 flex items-center gap-1"
                        >
                          <Eye size={12} />
                          View Full
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No COR uploaded</p>
                    )}
                  </div>
                </div>

                {/* Approval Form */}
                {selectedUser?.id === user.id && !showCorModal ? (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Program Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Program/Course *
                        </label>
                        <select
                          value={approvalForm.program}
                          onChange={(e) => setApprovalForm({ ...approvalForm, program: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-transparent"
                        >
                          <option value="">Select from COR</option>
                          {programs.map(prog => (
                            <option key={prog} value={prog}>{prog}</option>
                          ))}
                        </select>
                      </div>

                      {/* Year Level Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Year Level *
                        </label>
                        <select
                          value={approvalForm.yearLevel}
                          onChange={(e) => setApprovalForm({ ...approvalForm, yearLevel: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-transparent"
                        >
                          <option value="">Select from COR</option>
                          {yearLevels.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Rejection (if rejecting)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g., COR image is unclear, please resubmit"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-transparent resize-none"
                        rows="2"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(user)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        <CheckCircle size={18} />
                        Approve Registration
                      </button>
                      <button
                        onClick={() => handleReject(user)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setApprovalForm({ program: "", yearLevel: "" });
                          setRejectionReason("");
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setApprovalForm({ program: "", yearLevel: "" });
                        setRejectionReason("");
                      }}
                      className="w-full px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition font-medium"
                    >
                      Review Registration
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COR Modal */}
      {showCorModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-maroon-600 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Certificate of Registration</h3>
                <p className="text-sm text-maroon-100">{selectedUser.name} - {selectedUser.studentId}</p>
              </div>
              <button
                onClick={() => setShowCorModal(false)}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
              {buildCorUrl(selectedUser)?.match(/\.(png|jpg|jpeg)$/i) ? (
                <img 
                  src={buildCorUrl(selectedUser)} 
                  alt="Certificate of Registration" 
                  className="w-full h-auto border border-gray-300 rounded-lg"
                />
              ) : (
                <div className="text-center p-12">
                  <p className="text-gray-600">PDF file - Cannot preview in browser</p>
                  <a
                    href={buildCorUrl(selectedUser)}
                    download={`COR_${selectedUser.studentId}.pdf`}
                    className="mt-4 inline-block px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700"
                  >
                    Download PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {showEmailPreview && emailPreviewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-maroon-600 to-maroon-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={24} />
                <div>
                  <h3 className="text-lg font-semibold">Email Preview</h3>
                  <p className="text-xs text-maroon-100">This email would be sent in production</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailPreview(false)}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
              {/* Email Header */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-700">To:</span>
                  <span className="text-gray-900">{emailPreviewData.recipient}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-700">From:</span>
                  <span className="text-gray-900">CounseLink - MSU DSA (noreply@msu.edu.ph)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Subject:</span>
                  <span className="text-gray-900">
                    {emailPreviewData.type === "approval" 
                      ? "✅ CounseLink Account Approved" 
                      : "⚠️ CounseLink Registration Update"}
                  </span>
                </div>
              </div>

              {/* Email Body - Approval */}
              {emailPreviewData.type === "approval" && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Email Header Design */}
                  <div className="bg-gradient-to-r from-maroon-600 to-maroon-700 text-white p-6 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold">Account Approved!</h2>
                  </div>
                  
                  {/* Email Content */}
                  <div className="bg-white p-6 text-gray-800">
                    <p className="text-lg mb-4">Hi <strong>{emailPreviewData.name}</strong>,</p>
                    
                    <p className="mb-4">
                      Great news! Your CounseLink account has been approved by the admin.
                    </p>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-green-900 mb-3">Account Details:</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-700">Student ID:</span>
                          <span className="font-semibold text-green-900">{emailPreviewData.studentId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">College:</span>
                          <span className="font-semibold text-green-900">{emailPreviewData.college}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Program:</span>
                          <span className="font-semibold text-green-900">{emailPreviewData.program}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Year Level:</span>
                          <span className="font-semibold text-green-900">{emailPreviewData.yearLevel}</span>
                        </div>
                      </div>
                    </div>

                    <p className="mb-4">
                      You can now log in to CounseLink using your student ID and password.
                    </p>

                    <div className="text-center my-6">
                      <a 
                        href="#" 
                        className="inline-block px-6 py-3 bg-maroon-600 text-white rounded-lg font-semibold hover:bg-maroon-700 transition"
                      >
                        Go to Login Page
                      </a>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-6 text-sm text-gray-600">
                      <p className="mb-2">What you can do with CounseLink:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>Request counseling appointments</li>
                        <li>Request psychological tests</li>
                        <li>Message counselors directly</li>
                        <li>View your counseling history</li>
                      </ul>
                    </div>

                    <p className="mt-6 text-sm text-gray-600">
                      If you have any questions, please contact the Division of Student Affairs.
                    </p>

                    <p className="mt-4 text-sm text-gray-600">
                      Best regards,<br />
                      <strong>MSU Division of Student Affairs</strong>
                    </p>
                  </div>

                  {/* Email Footer */}
                  <div className="bg-gray-100 p-4 text-center text-xs text-gray-600">
                    <p>© 2024 Mindanao State University - Division of Student Affairs</p>
                    <p className="mt-1">This is an automated message. Please do not reply to this email.</p>
                  </div>
                </div>
              )}

              {/* Email Body - Rejection */}
              {emailPreviewData.type === "rejection" && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Email Header Design */}
                  <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                      <XCircle className="text-red-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold">Registration Update</h2>
                  </div>
                  
                  {/* Email Content */}
                  <div className="bg-white p-6 text-gray-800">
                    <p className="text-lg mb-4">Hi <strong>{emailPreviewData.name}</strong>,</p>
                    
                    <p className="mb-4">
                      Thank you for your interest in CounseLink. Unfortunately, your registration requires attention.
                    </p>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-red-900 mb-2">Reason:</h3>
                      <p className="text-sm text-red-800">{emailPreviewData.reason}</p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-yellow-900 mb-2">What to do next:</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                        <li>Review the reason provided above</li>
                        <li>Prepare the necessary corrections</li>
                        <li>Contact the Division of Student Affairs for assistance</li>
                        <li>You may be able to resubmit your registration (future feature)</li>
                      </ul>
                    </div>

                    <p className="mb-4 text-sm text-gray-700">
                      If you believe this is an error or need clarification, please contact the Division of Student Affairs:
                    </p>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm">
                      <p><strong>Division of Student Affairs</strong></p>
                      <p>Email: dsa@msu.edu.ph</p>
                      <p>Phone: (063) 555-1234</p>
                      <p>Office: MSU Main Campus, Building A</p>
                    </div>

                    <p className="mt-4 text-sm text-gray-600">
                      We appreciate your understanding.<br />
                      <strong>MSU Division of Student Affairs</strong>
                    </p>
                  </div>

                  {/* Email Footer */}
                  <div className="bg-gray-100 p-4 text-center text-xs text-gray-600">
                    <p>© 2024 Mindanao State University - Division of Student Affairs</p>
                    <p className="mt-1">This is an automated message. Please do not reply to this email.</p>
                  </div>
                </div>
              )}

              {/* Production Note */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-semibold mb-1">📌 Note for Development:</p>
                <p>In production, this email will be automatically sent using SendGrid API or SMTP service when admin approves/rejects registration.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
