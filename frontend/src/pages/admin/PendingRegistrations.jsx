// src/pages/admin/PendingRegistrations.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Mail,
  Phone,
  GraduationCap,
  User,
  Clock,
  CheckCircle2,
  Hash,
  FileText,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
  Modal,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
} from "../../components/ui";

const PROGRAMS = [
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
  "Doctor of Medicine",
];

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

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

    setEmailPreviewData({
      type: "approval",
      recipient: user.email,
      name: user.name,
      studentId: user.studentId,
      college: user.college,
      program: approvalForm.program,
      yearLevel: approvalForm.yearLevel,
    });

    setMessage({
      type: "success",
      text: `${user.name}'s registration approved. Approval email queued for ${user.email}.`,
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
      await rejectRegistration(user.id, { reason: rejectionReason });
      setPendingUsers((prev) => prev.filter((item) => item.id !== user.id));
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Unable to reject registration" });
      return;
    }

    setEmailPreviewData({
      type: "rejection",
      recipient: user.email,
      name: user.name,
      studentId: user.studentId,
      reason: rejectionReason,
    });

    setMessage({
      type: "success",
      text: `${user.name}'s registration rejected. Notification email queued for ${user.email}.`,
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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Administrator"
        title="Pending student registrations"
        subtitle="Review Certificate of Registration uploads and approve or reject accounts."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Pending review"
          value={pendingUsers.length}
          hint="Awaiting your decision"
          icon={Clock}
          accent="bg-amber-500"
        />
        <StatCard
          label="Approved today"
          value={approvedToday}
          hint="Sent welcome emails"
          icon={CheckCircle2}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Average time"
          value="~18h"
          hint="From submission to decision"
          icon={Calendar}
          accent="bg-blue-500"
        />
      </div>

      {message && (
        <div
          className={`mb-4 px-3 py-2 rounded-md border text-sm flex items-center justify-between gap-3 ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <span>{message.text}</span>
          {message.type === "success" && emailPreviewData && (
            <button
              onClick={() => setShowEmailPreview(true)}
              className="text-xs font-medium underline whitespace-nowrap"
            >
              Preview email
            </button>
          )}
        </div>
      )}

      {/* Registration list */}
      {pendingUsers.length === 0 ? (
        <SectionCard noBodyPadding>
          <EmptyState
            icon={CheckCircle}
            title="All caught up"
            hint="No pending registrations. New submissions will appear here."
          />
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {initialsOf(user.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {user.name}
                      </h3>
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Hash size={11} className="text-gray-400" />
                          {user.studentId}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mail size={11} className="text-gray-400" />
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={11} className="text-gray-400" />
                            {user.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1 text-xs">
                        <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                          <GraduationCap size={11} className="text-maroon-600" />
                          {user.college}
                        </span>
                        <span className="inline-flex items-center gap-1 text-gray-500 tabular-nums">
                          <Calendar size={11} className="text-gray-400" />
                          Submitted {formatDate(user.submittedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* COR Preview */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                      Certificate of Registration
                    </p>
                    {buildCorUrl(user) ? (
                      <>
                        {buildCorUrl(user).match(/\.(png|jpg|jpeg)$/i) ? (
                          <img
                            src={buildCorUrl(user)}
                            alt="COR Preview"
                            className="w-28 h-20 object-cover border border-gray-200 rounded-md cursor-pointer hover:opacity-80 transition"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowCorModal(true);
                            }}
                          />
                        ) : (
                          <div className="w-28 h-20 border border-gray-200 rounded-md flex items-center justify-center bg-gray-50 text-xs text-gray-600">
                            <FileText size={16} className="mr-1" /> PDF
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowCorModal(true);
                          }}
                          className="text-[11px] text-maroon-600 hover:text-maroon-700 font-medium inline-flex items-center gap-1"
                        >
                          <Eye size={11} /> View full
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">No COR uploaded</p>
                    )}
                  </div>
                </div>

                {/* Inline review form */}
                {selectedUser?.id === user.id && !showCorModal ? (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Program / course *</label>
                        <select
                          value={approvalForm.program}
                          onChange={(e) =>
                            setApprovalForm({ ...approvalForm, program: e.target.value })
                          }
                          className={INPUT}
                        >
                          <option value="">Select from COR</option>
                          {PROGRAMS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={LABEL}>Year level *</label>
                        <select
                          value={approvalForm.yearLevel}
                          onChange={(e) =>
                            setApprovalForm({ ...approvalForm, yearLevel: e.target.value })
                          }
                          className={INPUT}
                        >
                          <option value="">Select from COR</option>
                          {YEAR_LEVELS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>Reason for rejection (if rejecting)</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g. COR image is unclear, please resubmit"
                        className={INPUT}
                        rows={2}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleApprove(user)}
                        className={`${BTN.success} flex-1`}
                      >
                        <CheckCircle size={14} /> Approve registration
                      </button>
                      <button onClick={() => handleReject(user)} className={`${BTN.danger} flex-1`}>
                        <XCircle size={14} /> Reject
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setApprovalForm({ program: "", yearLevel: "" });
                          setRejectionReason("");
                        }}
                        className={BTN.secondary}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setApprovalForm({ program: "", yearLevel: "" });
                        setRejectionReason("");
                      }}
                      className={`${BTN.primary} w-full`}
                    >
                      Review registration
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COR Modal */}
      <Modal
        open={showCorModal && !!selectedUser}
        onClose={() => setShowCorModal(false)}
        title="Certificate of Registration"
        subtitle={
          selectedUser ? `${selectedUser.name} · ${selectedUser.studentId || ""}` : ""
        }
        size="2xl"
        align="top"
      >
        {selectedUser && (
          <>
            {buildCorUrl(selectedUser)?.match(/\.(png|jpg|jpeg)$/i) ? (
              <img
                src={buildCorUrl(selectedUser)}
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
                  href={buildCorUrl(selectedUser)}
                  download={`COR_${selectedUser.studentId}.pdf`}
                  className={BTN.primary}
                >
                  Download PDF
                </a>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Email preview modal — preserves visual email mockup */}
      {showEmailPreview && emailPreviewData && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowEmailPreview(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-2xl my-8"
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 inline-flex items-center gap-1.5">
                  <Mail size={15} className="text-maroon-600" />
                  Email preview
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  This email would be delivered in production
                </p>
              </div>
              <button
                onClick={() => setShowEmailPreview(false)}
                className="text-gray-400 hover:text-gray-700 transition"
                aria-label="Close"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="px-5 py-4 max-h-[calc(90vh-80px)] overflow-y-auto">
              {/* Email headers */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4 text-sm space-y-1">
                <div>
                  <span className="font-semibold text-gray-700">To: </span>
                  <span className="text-gray-900">{emailPreviewData.recipient}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">From: </span>
                  <span className="text-gray-900">
                    CounseLink · MSU DSA (noreply@msu.edu.ph)
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Subject: </span>
                  <span className="text-gray-900">
                    {emailPreviewData.type === "approval"
                      ? "CounseLink Account Approved"
                      : "CounseLink Registration Update"}
                  </span>
                </div>
              </div>

              {/* Email body */}
              {emailPreviewData.type === "approval" ? (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gradient-to-r from-maroon-600 to-maroon-700 text-white p-6 text-center">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="text-emerald-600" size={28} />
                    </div>
                    <h2 className="text-xl font-bold">Account approved</h2>
                  </div>
                  <div className="bg-white p-5 text-gray-800 text-sm leading-relaxed">
                    <p className="mb-3">
                      Hi <strong>{emailPreviewData.name}</strong>,
                    </p>
                    <p className="mb-3">Your CounseLink account has been approved by the admin.</p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 mb-3 text-xs">
                      <p className="font-semibold text-emerald-900 mb-2">Account details</p>
                      <dl className="space-y-1">
                        <EmailRow label="Student ID" value={emailPreviewData.studentId} />
                        <EmailRow label="College" value={emailPreviewData.college} />
                        <EmailRow label="Program" value={emailPreviewData.program} />
                        <EmailRow label="Year level" value={emailPreviewData.yearLevel} />
                      </dl>
                    </div>
                    <p className="mb-3">You can now log in to CounseLink with your credentials.</p>
                    <p className="text-xs text-gray-600 mt-4">
                      Best regards,
                      <br />
                      <strong>MSU Division of Student Affairs</strong>
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 text-center text-[11px] text-gray-600 border-t border-gray-200">
                    <p>© 2024 Mindanao State University — Division of Student Affairs</p>
                    <p>This is an automated message. Please do not reply.</p>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 text-center">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-2">
                      <XCircle className="text-red-600" size={28} />
                    </div>
                    <h2 className="text-xl font-bold">Registration update</h2>
                  </div>
                  <div className="bg-white p-5 text-gray-800 text-sm leading-relaxed">
                    <p className="mb-3">
                      Hi <strong>{emailPreviewData.name}</strong>,
                    </p>
                    <p className="mb-3">
                      Thank you for your interest in CounseLink. Unfortunately, your registration
                      requires attention.
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3 text-xs">
                      <p className="font-semibold text-red-900 mb-1">Reason</p>
                      <p className="text-red-800">{emailPreviewData.reason}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3 text-xs text-amber-800">
                      <p className="font-semibold mb-1">What to do next</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Review the reason provided above</li>
                        <li>Prepare the necessary corrections</li>
                        <li>Contact the Division of Student Affairs for assistance</li>
                      </ul>
                    </div>
                    <p className="text-xs text-gray-600 mt-4">
                      We appreciate your understanding.
                      <br />
                      <strong>MSU Division of Student Affairs</strong>
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 text-center text-[11px] text-gray-600 border-t border-gray-200">
                    <p>© 2024 Mindanao State University — Division of Student Affairs</p>
                    <p>This is an automated message. Please do not reply.</p>
                  </div>
                </div>
              )}

              <div className="mt-4 px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-xs text-blue-800">
                <p className="font-semibold mb-0.5">Development note</p>
                <p>
                  In production, this email is sent automatically (SendGrid / SMTP) when the admin
                  approves or rejects a registration.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/60 rounded-b-lg">
              <button onClick={() => setShowEmailPreview(false)} className={BTN.primary}>
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-emerald-700">{label}</dt>
      <dd className="font-semibold text-emerald-900 tabular-nums">{value}</dd>
    </div>
  );
}
