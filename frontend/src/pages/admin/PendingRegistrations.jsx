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
  useBodyScrollLock,
} from "../../components/ui";
import { COLLEGES } from "../../data/mockData";
import { getDepartments, formatCollege, getPrograms } from "../../data/msuColleges";
import { nextActiveId } from "../../utils/pendingRegistrations";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/shadcn/select";

const SHORTCUTS = [
  { keys: ["?"], label: "Show or hide this help" },
  { keys: ["J", "↓"], label: "Next pending registration" },
  { keys: ["K", "↑"], label: "Previous pending registration" },
  { keys: ["Enter"], label: "Open the highlighted registration" },
  { keys: ["A"], label: "Approve the highlighted or open registration" },
  { keys: ["R"], label: "Reject the highlighted or open registration" },
  { keys: ["Esc"], label: "Close the dialog or leave rejection" },
];


export default function PendingRegistrations() {
  const { fetchPendingRegistrations, fetchApprovedThisWeek, approveRegistration, rejectRegistration } =
    useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  // selectedUser drives the review modal; preview holds an enlarged photo or
  // COR image so opening it never mounts the review dialog underneath it.
  const [selectedUser, setSelectedUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [rejectingUserId, setRejectingUserId] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  // Registration highlighted by the J/K (or arrow) shortcuts.
  const [activeId, setActiveId] = useState(null);
  // Admin corrections to the student's academic info, saved on approve.
  const [editForm, setEditForm] = useState({ userId: null, college: "", department: "", program: "" });

  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedThisWeek, setApprovedThisWeek] = useState(0);
  // Tracks per-user avatar load failures (file deleted from the server) so a
  // broken image is replaced by initials instead of a broken-image icon.
  const [brokenAvatars, setBrokenAvatars] = useState({});
  const [brokenCors, setBrokenCors] = useState({});
  // Same idea for the enlarged preview modal.
  const [previewBroken, setPreviewBroken] = useState(false);
  useBodyScrollLock(showEmailPreview);

  useEffect(() => {
    let mounted = true;
    const loadPending = async () => {
      try {
        const data = await fetchPendingRegistrations();
        if (mounted) setPendingUsers(data);
      } catch (err) {
        setMessage({ type: "error", text: err.message || "Unable to load pending registrations" });
      }
    };
    const loadApprovedThisWeek = async () => {
      try {
        const count = await fetchApprovedThisWeek();
        if (mounted) setApprovedThisWeek(count);
      } catch {
        // non-critical stat; ignore failures
      }
    };
    loadPending();
    loadApprovedThisWeek();
    return () => {
      mounted = false;
    };
  }, [fetchPendingRegistrations, fetchApprovedThisWeek]);

  const draftFor = (user) =>
    editForm.userId === user.id
      ? editForm
      : {
          college: user.college || "",
          department: user.department || "",
          program: user.program || "",
        };

  const handleApprove = async (user) => {
    const draft = draftFor(user);
    try {
      await approveRegistration(user.id, {
        college: draft.college,
        department: draft.department,
        program: draft.program,
        yearLevel: user.yearLevel || "",
      });
      setPendingUsers((prev) => prev.filter((item) => item.id !== user.id));
      setApprovedThisWeek((prev) => prev + 1);
      setActiveId(null);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Unable to approve registration" });
      return;
    }

    setEditForm({ userId: null, college: "", department: "", program: "" });
    setEmailPreviewData({
      type: "approval",
      recipient: user.email,
      name: user.name,
      studentId: user.studentId,
      college: draft.college,
      program: draft.program,
      yearLevel: user.yearLevel || "",
    });

    setMessage({
      type: "success",
      text: `${user.name}'s registration approved. Approval email queued for ${user.email}.`,
    });

    setSelectedUser(null);
    setTimeout(() => setMessage(null), 5000);
  };

  const closeReview = () => {
    setSelectedUser(null);
    setRejectingUserId(null);
    setRejectionReason("");
  };

  const handleReject = async (user) => {
    if (!rejectionReason.trim()) {
      setMessage({ type: "error", text: "Please provide a reason for rejection" });
      return;
    }

    try {
      await rejectRegistration(user.id, { reason: rejectionReason });
      setPendingUsers((prev) => prev.filter((item) => item.id !== user.id));
      setActiveId(null);
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
    setRejectingUserId(null);
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

  const buildAvatarUrl = (user) => {
    const url = user?.avatarUrl || user?.avatar_url;
    if (!url) return null;
    return /^(https?:|data:)/i.test(url) ? url : `${apiBase}${url}`;
  };

  const openPreview = (user, kind) => {
    setPreview({
      src: kind === "cor" ? buildCorUrl(user) : buildAvatarUrl(user),
      title: kind === "cor" ? "Certificate of Registration" : "2x2 photo",
      subtitle: `${user.name} · ${user.studentId || ""}`,
      download: `${kind === "cor" ? "COR" : "Photo"}_${user.studentId}.${kind === "cor" ? "pdf" : "jpg"}`,
    });
    setPreviewBroken(false);
  };

  const openReview = (user) => {
    setSelectedUser(user);
    setRejectingUserId(null);
    setRejectionReason("");
  };

  const moveActive = (delta) =>
    setActiveId((current) => nextActiveId(pendingUsers, current, delta));

  // Shortcuts stay out of the way while a field or button has focus, so typing
  // a rejection reason never approves someone.
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target;
      const typing =
        el instanceof HTMLElement &&
        (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el.tagName) || el.isContentEditable);
      const active = pendingUsers.find((user) => user.id === activeId);

      if (e.key === "Escape") {
        if (showEmailPreview) setShowEmailPreview(false);
        else if (preview) setPreview(null);
        else if (showHelp) setShowHelp(false);
        else if (rejectingUserId) {
          setRejectingUserId(null);
          setRejectionReason("");
        } else if (selectedUser) closeReview();
        return;
      }

      if (typing) return;

      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      if (e.shiftKey && !/^[a-z]$/i.test(e.key)) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        moveActive(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        moveActive(-1);
      } else if (e.key === "Enter") {
        if (selectedUser || preview || showHelp || showEmailPreview) return;
        if (active) {
          e.preventDefault();
          openReview(active);
        }
      } else if (e.key === "a" || e.key === "A") {
        if (preview || showHelp || showEmailPreview || rejectingUserId) return;
        const target = selectedUser || active;
        if (target) {
          e.preventDefault();
          handleApprove(target);
        }
      } else if (e.key === "r" || e.key === "R") {
        if (preview || showHelp || showEmailPreview) return;
        const target = selectedUser || active;
        if (target) {
          e.preventDefault();
          openReview(target);
          setRejectingUserId(target.id);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!activeId) return;
    document
      .getElementById(`pending-${activeId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  // Top-bar Shortcuts button (Header) opens the help owned by this page.
  useEffect(() => {
    const toggle = () => setShowHelp((v) => !v);
    window.addEventListener("counselink:toggle-shortcuts", toggle);
    return () => window.removeEventListener("counselink:toggle-shortcuts", toggle);
  }, []);

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6">
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
          label="Approved this week"
          value={approvedThisWeek}
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
              id={`pending-${user.id}`}
              className={`bg-white rounded-xl shadow-sm overflow-hidden transition-shadow ${
                activeId === user.id
                  ? "ring-2 ring-maroon-400"
                  : "ring-1 ring-gray-950/5"
              }`}
            >
              <div className="p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {(user.avatarUrl || user.avatar_url) && !brokenAvatars[user.id] ? (
                      <img
                        src={buildAvatarUrl(user)}
                        alt={user.name}
                        onError={() => setBrokenAvatars((prev) => ({ ...prev, [user.id]: true }))}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-1 ring-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {initialsOf(user.name)}
                      </div>
                    )}
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
                          {formatCollege(user.college)}
                        </span>
                        {user.department && (
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            {user.department}
                          </span>
                        )}
                        {user.program && (
                          <span className="inline-flex items-center gap-1 text-gray-500 italic">
                            {user.program}
                          </span>
                        )}
                        {user.submittedAt && (
                          <span className="inline-flex items-center gap-1 text-gray-500 tabular-nums">
                            <Calendar size={11} className="text-gray-400" />
                            Submitted {formatDate(user.submittedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setActiveId(user.id);
                      openReview(user);
                    }}
                    className={`${BTN.primary} w-full`}
                  >
                    Review registration
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        open={!!selectedUser}
        onClose={closeReview}
        title="Review registration"
        subtitle={
          selectedUser
            ? `${selectedUser.name} · ${selectedUser.studentId || ""}`
            : ""
        }
        size="xl"
      >
        {selectedUser && (
          <div className="space-y-4">
            {/* Student identity */}
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900 truncate">
                {selectedUser.name}
              </p>
              <p className="text-sm text-gray-600 break-all">{selectedUser.email}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedUser.studentId}
                {selectedUser.submittedAt
                  ? ` · Submitted ${formatDate(selectedUser.submittedAt)}`
                  : ""}
              </p>
            </div>

            {/* Required uploads */}
            <div className="grid grid-cols-2 gap-3">
              <UploadPreview
                label="2x2 photo"
                url={buildAvatarUrl(selectedUser)}
                broken={brokenAvatars[selectedUser.id]}
                onError={() =>
                  setBrokenAvatars((prev) => ({ ...prev, [selectedUser.id]: true }))
                }
                onOpen={() => openPreview(selectedUser, "photo")}
              />
              <UploadPreview
                label="Certificate of Registration"
                url={buildCorUrl(selectedUser)}
                broken={brokenCors[selectedUser.id]}
                onError={() =>
                  setBrokenCors((prev) => ({ ...prev, [selectedUser.id]: true }))
                }
                onOpen={() => openPreview(selectedUser, "cor")}
              />
            </div>

            {rejectingUserId === selectedUser.id ? (
              <div className="space-y-3">
              <div>
                <label className={LABEL}>Reason for rejection</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. COR image is unclear, please resubmit"
                  className={INPUT}
                  rows={3}
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleReject(selectedUser)}
                  className={`${BTN.danger} flex-1`}
                >
                  <XCircle size={14} /> Confirm rejection
                </button>
                <button
                  onClick={() => {
                    setRejectingUserId(null);
                    setRejectionReason("");
                  }}
                  className={BTN.secondary}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={LABEL}>College</label>
                  <Select
                    variant="form"
                    value={draftFor(selectedUser).college}
                    onValueChange={(v) =>
                      setEditForm({
                        ...draftFor(selectedUser),
                        userId: selectedUser.id,
                        college: v,
                        department: "",
                        program: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select college" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLLEGES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {formatCollege(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={LABEL}>Department</label>
                  <Select
                    variant="form"
                    value={draftFor(selectedUser).department}
                    onValueChange={(v) =>
                      setEditForm({
                        ...draftFor(selectedUser),
                        userId: selectedUser.id,
                        department: v,
                        program: "",
                      })
                    }
                    disabled={!draftFor(selectedUser).college}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          draftFor(selectedUser).college
                            ? "Select department"
                            : "Select a college first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {draftFor(selectedUser).department &&
                        !getDepartments(draftFor(selectedUser).college).some(
                          (d) => d.name === draftFor(selectedUser).department
                        ) && (
                          <SelectItem value={draftFor(selectedUser).department}>
                            {draftFor(selectedUser).department}
                          </SelectItem>
                        )}
                      {getDepartments(draftFor(selectedUser).college).map((d) => (
                        <SelectItem key={d.code} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={LABEL}>Course</label>
                  <Select
                    variant="form"
                    value={draftFor(selectedUser).program}
                    onValueChange={(v) =>
                      setEditForm({ ...draftFor(selectedUser), userId: selectedUser.id, program: v })
                    }
                    disabled={!draftFor(selectedUser).department}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          draftFor(selectedUser).department
                            ? "Select course"
                            : "Select a department first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {draftFor(selectedUser).program &&
                        !getPrograms(
                          draftFor(selectedUser).college,
                          draftFor(selectedUser).department
                        ).includes(draftFor(selectedUser).program) && (
                          <SelectItem value={draftFor(selectedUser).program}>
                            {draftFor(selectedUser).program}
                          </SelectItem>
                        )}
                      {getPrograms(
                        draftFor(selectedUser).college,
                        draftFor(selectedUser).department
                      ).map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleApprove(selectedUser)}
                  className={`${BTN.success} flex-1`}
                >
                  <CheckCircle size={14} /> Approve
                </button>
                <button
                  onClick={() => setRejectingUserId(selectedUser.id)}
                  className={`${BTN.danger} flex-1`}
                >
                  <XCircle size={14} /> Reject
                </button>
                <button onClick={closeReview} className={BTN.secondary}>
                  Cancel
                </button>
              </div>
            </div>
            )}
          </div>
        )}
      </Modal>

      {/* Enlarged photo / COR preview */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title}
        subtitle={preview?.subtitle}
        size="2xl"
        align="top"
      >
        {preview && (
          <>
            {previewBroken ? (
              <div className="text-center p-8">
                <FileText size={32} className="text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  This file is no longer available on the server. Ask the student to resubmit
                  it.
                </p>
              </div>
            ) : preview.src?.match(/\.(png|jpg|jpeg)$/i) ? (
              <img
                src={preview.src}
                alt={preview.title}
                onError={() => setPreviewBroken(true)}
                className="w-full h-auto border border-gray-200 rounded-md"
              />
            ) : (
              <div className="text-center p-8">
                <FileText size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">
                  PDF file — cannot preview in browser
                </p>
                <a href={preview.src} download={preview.download} className={BTN.primary}>
                  Download PDF
                </a>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Keyboard shortcuts */}
      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Keyboard shortcuts"
        subtitle="Work through pending registrations without reaching for the mouse."
        size="md"
      >
        <ul className="divide-y divide-gray-100">
          {SHORTCUTS.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-sm text-gray-700">{row.label}</span>
              <span className="flex items-center gap-1 flex-shrink-0">
                {row.keys.map((key) => (
                  <kbd
                    key={key}
                    className="min-w-[24px] text-center rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
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

            <div className="px-5 py-4 max-h-[calc(90vh_-_80px)] overflow-y-auto">
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
                  <div className="bg-gray-50 p-3 text-center text-xs text-gray-600 border-t border-gray-200">
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
                  <div className="bg-gray-50 p-3 text-center text-xs text-gray-600 border-t border-gray-200">
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

function UploadPreview({ label, url, broken, onError, onOpen }) {
  const isPdf = url && !/\.(png|jpe?g|webp)$/i.test(url);
  return (
    <div>
      <p className={LABEL}>{label}</p>
      {broken ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-3 text-xs text-amber-800">
          File no longer on the server — ask the student to resubmit.
        </p>
      ) : !url ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-500">
          Not uploaded
        </div>
      ) : isPdf ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-600 transition hover:bg-gray-100"
        >
          <FileText size={20} /> PDF · view
        </button>
      ) : (
        <button type="button" onClick={onOpen} className="relative block w-full">
          <img
            src={url}
            alt={label}
            onError={onError}
            className="h-24 w-full rounded-lg border border-gray-200 bg-gray-50 object-contain"
          />
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <Eye size={11} /> View
          </span>
        </button>
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

