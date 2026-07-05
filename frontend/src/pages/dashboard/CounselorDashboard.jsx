// src/pages/dashboard/CounselorDashboard.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { COLLEGES } from "../../data/mockData";
import {
  Users,
  Calendar,
  Clock3,
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  CalendarClock,
  User2,
  MessageCircle,
  Inbox,
  ClipboardList,
  AlertTriangle,
  MoreVertical,
} from "lucide-react";
import { Link } from "react-router-dom";
import ProfileViewModal from "../../components/ProfileViewModal";
import WelcomeHero from "../../components/WelcomeHero";
import ChatModal from "../../components/ChatModal";
import { useNotifications } from "../../context/NotificationsContext";
import { SectionCard, EmptyState, BigStat, DonutStat, Modal, BTN, INPUT, LABEL, initialsOf, formatDate } from "../../components/ui";

const COLLEGE_COLORS = [
  "#0B6623", "#1d4ed8", "#c2410c", "#7e22ce", "#0e7490", "#9f1239",
  "#b45309", "#065f46", "#1e3a5f", "#6d28d9", "#be185d", "#0f766e",
  "#92400e", "#1e40af", "#166534", "#7c3aed",
];
const STATUS_COLORS = {
  pending: "#f59e0b",
  approved: "#16a34a",
  rescheduled: "#0ea5e9",
  rejected: "#dc2626",
  completed: "#065f46",
  "follow-up": "#eab308",
  urgent: "#ef4444",
};

const TIME_LABEL = {
  morning: "9:00 AM – 12:00 PM",
  afternoon: "1:00 PM – 5:00 PM",
  "9:00-10:00": "9:00 – 10:00 AM",
  "10:00-11:00": "10:00 – 11:00 AM",
  "11:00-12:00": "11:00 – 12:00 PM",
  "1:00-2:00": "1:00 – 2:00 PM",
  "2:00-3:00": "2:00 – 3:00 PM",
  "3:00-4:00": "3:00 – 4:00 PM",
};
const timeLabel = (slot) => TIME_LABEL[slot] || slot || "—";

export default function CounselorDashboard() {
  const { currentUser, users, lookupUser } = useAuth();
  const {
    fetchAppointments,
    acceptAppointment,
    rescheduleAppointment,
    rejectAppointment,
  } = useAppointments?.() || {};
  const { getTestsForCurrentUser, acceptTest, rescheduleTest, rejectTest } = useTests?.() || {};
  const { getNotificationsForCurrentUser } = useNotifications?.() || {};

  const urgentNotifications = (getNotificationsForCurrentUser?.() || []).filter(
    (n) => n.type === "urgent_counseling" && !n.read
  );

  const openProfile = async (id, fallbackName) => {
    if (!id) return;
    const cached = users?.find((u) => u.id === id);
    if (cached) {
      setSelectedProfile(cached);
      return;
    }
    const fetched = await lookupUser?.(id);
    if (fetched) setSelectedProfile(fetched);
    else if (fallbackName) setSelectedProfile({ id, name: fallbackName });
  };

  const openChat = async (id, fallbackName) => {
    if (!id) return;
    const cached = users?.find((u) => u.id === id);
    if (cached) {
      setChatRecipient(cached);
      return;
    }
    const fetched = await lookupUser?.(id);
    if (fetched) setChatRecipient(fetched);
    else if (fallbackName) setChatRecipient({ id, name: fallbackName });
  };

  const [myAppointments, setMyAppointments] = useState([]);

  React.useEffect(() => {
    let mounted = true;
    const loadAppointments = async () => {
      try {
        const data = await fetchAppointments();
        if (mounted) setMyAppointments(data);
      } catch (err) {
        console.error(err);
      }
    };
    if (fetchAppointments) loadAppointments();
    return () => {
      mounted = false;
    };
  }, [fetchAppointments]);

  const myTests = getTestsForCurrentUser ? getTestsForCurrentUser() : [];

  const [rescheduleModal, setRescheduleModal] = useState({ open: false, apptId: null, date: "", timeSlot: "", note: "" });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, kind: null, id: null, note: "" });
  const [rescheduleTestModal, setRescheduleTestModal] = useState({ open: false, testId: null, date: "", timeSlot: "", note: "" });
  const [openQueuePopoverId, setOpenQueuePopoverId] = useState(null);
  const queuePopoverRefs = useRef({});

  useEffect(() => {
    if (!openQueuePopoverId) return;
    const handler = (e) => {
      const node = queuePopoverRefs.current[openQueuePopoverId];
      if (node && !node.contains(e.target)) setOpenQueuePopoverId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openQueuePopoverId]);

  const students = users?.filter((u) => u.role === "student") || [];

  const studentsByCollege = useMemo(() => {
    return COLLEGES.reduce((acc, col) => {
      acc[col] = students.filter((s) => s.college === col).length;
      return acc;
    }, {});
  }, [students]);

  const totalStudents = students.length;
  const pendingAppointments = myAppointments.filter((a) => a.status === "pending");
  const pendingTests = myTests.filter((t) => t.status === "pending");
  const isSameDay = (value) => {
    if (!value) return false;
    const d = new Date(value);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };
  // "Today's appointments" — scheduled to actually happen today.
  const todayAppointments = myAppointments.filter(
    (a) => (a.status === "approved" || a.status === "rescheduled") && isSameDay(a.scheduledDate)
  ).length;
  // "Incoming appointments" — every appointment still ahead of us, regardless
  // of date: fresh approvals, reschedules, and follow-ups all carry one of
  // these two statuses (there's no separate DB status for follow-ups).
  const incomingAppointments = myAppointments.filter(
    (a) => a.status === "approved" || a.status === "rescheduled"
  ).length;

  const topColleges = Object.entries(studentsByCollege).sort((a, b) => b[1] - a[1]);

  const appointmentStatusBreakdown = useMemo(() => {
    const counts = {};
    const myId = Number(currentUser?.id);
    myAppointments.forEach((a) => {
      const isPending = a.status === "pending";
      const isFollowup = a.status === "approved" && a.reason === "Follow-up Session";
      const isActiveUrgent = !!(a.is_urgent || a.isUrgent) && !isFollowup && (isPending || a.status === "approved" || a.status === "rescheduled");

      // Pending and urgent are global — every counselor sees the full pool
      if (isPending) { counts["pending"] = (counts["pending"] || 0) + 1; return; }
      if (isActiveUrgent) { counts["urgent"] = (counts["urgent"] || 0) + 1; return; }

      // All other statuses (approved, rescheduled, follow-up, completed, no_show, rejected)
      // only count if this counselor owns the appointment
      if (Number(a.counselor_id ?? a.counselorId) !== myId) return;

      const key = isFollowup ? "followup" : a.status || "pending";
      counts[key] = (counts[key] || 0) + 1;
    });
    myTests.forEach((t) => {
      // Pending tests are global; accepted/completed tests only for this counselor
      if (t.status === "pending") { counts["pending"] = (counts["pending"] || 0) + 1; return; }
      if (Number(t.counselor_id ?? t.counselorId) !== myId) return;
      const key = t.status || "pending";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name === "followup" ? "Follow-up" : name === "urgent" ? "Urgent" : name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [myAppointments, myTests, currentUser]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleAccept = async (id) => {
    const appt = myAppointments.find((a) => a.id === id);
    const slot =
      appt.preferredTime ||
      appt.preferred_time ||
      appt.preferredSlots?.[0] ||
      (appt.preferred_slots ? appt.preferred_slots.split(",")[0] : null) ||
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const date =
      appt.preferredDate ||
      appt.preferred_date ||
      new Date().toISOString().split("T")[0];
    const result = await acceptAppointment({ id, date, timeSlot: slot, note: null });
    if (result.success) {
      setMyAppointments((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "approved", scheduledDate: date, scheduledTimeSlot: slot }
            : a
        )
      );
    } else {
      alert(result.message || "Failed to accept appointment");
    }
  };

  const openRejectModal = (kind, id) => setRejectModal({ open: true, kind, id, note: "" });

  const submitReject = async () => {
    const note = rejectModal.note.trim() || null;
    if (rejectModal.kind === "appointment") {
      const result = await rejectAppointment({ id: rejectModal.id, note });
      if (result.success) {
        setMyAppointments((prev) =>
          prev.map((a) =>
            a.id === rejectModal.id ? { ...a, status: "rejected", counselor_action_note: note } : a
          )
        );
        setRejectModal({ open: false, kind: null, id: null, note: "" });
      } else {
        alert(result.message || "Failed to reject appointment");
      }
    } else if (rejectModal.kind === "test") {
      const result = await rejectTest({ id: rejectModal.id, note });
      if (result?.success) {
        setRejectModal({ open: false, kind: null, id: null, note: "" });
      } else {
        alert(result?.message || "Failed to reject test request");
      }
    }
  };

  const handleReject = (id) => openRejectModal("appointment", id);
  const openReschedule = (id) => setRescheduleModal({ open: true, apptId: id, date: "", timeSlot: "", note: "" });

  const submitReschedule = async () => {
    if (!rescheduleModal.date || !rescheduleModal.timeSlot) {
      alert("Select date and time");
      return;
    }
    const result = await rescheduleAppointment({
      id: rescheduleModal.apptId,
      date: rescheduleModal.date,
      timeSlot: rescheduleModal.timeSlot,
      note: rescheduleModal.note,
    });
    if (result.success) {
      setMyAppointments((prev) =>
        prev.map((a) =>
          a.id === rescheduleModal.apptId
            ? {
                ...a,
                status: "rescheduled",
                scheduledDate: rescheduleModal.date,
                scheduledTimeSlot: rescheduleModal.timeSlot,
                note: rescheduleModal.note,
              }
            : a
        )
      );
      setRescheduleModal({ open: false, apptId: null, date: "", timeSlot: "", note: "" });
    } else {
      alert(result.message || "Failed to reschedule appointment");
    }
  };

  const handleAcceptTest = async (id) => {
    const test = myTests.find((t) => t.id === id);
    const slot = Array.isArray(test.preferredSlots) ? test.preferredSlots[0] : null;
    const result = await acceptTest({ id, date: test.preferredDate, timeSlot: slot, note: null });
    if (!result?.success) alert(result?.message || "Failed to accept test request");
  };
  const handleRejectTest = (id) => openRejectModal("test", id);
  const openRescheduleTest = (id) =>
    setRescheduleTestModal({ open: true, testId: id, date: "", timeSlot: "", note: "" });

  const submitRescheduleTest = async () => {
    if (!rescheduleTestModal.date || !rescheduleTestModal.timeSlot) {
      alert("Select date and time");
      return;
    }
    const result = await rescheduleTest({
      id: rescheduleTestModal.testId,
      date: rescheduleTestModal.date,
      timeSlot: rescheduleTestModal.timeSlot,
      note: rescheduleTestModal.note,
    });
    if (!result?.success) {
      alert(result?.message || "Failed to reschedule test request");
      return;
    }
    setRescheduleTestModal({ open: false, testId: null, date: "", timeSlot: "", note: "" });
  };

  const recentlyRejected = useMemo(() => {
    const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000; // last 2 days only — "recently"
    return myAppointments
      .filter((a) => {
        if (a.status !== "rejected") return false;
        const rejectedAt = a.updatedAt || a.updated_at;
        return rejectedAt ? new Date(rejectedAt).getTime() >= cutoff : false;
      })
      .sort((a, b) => new Date(b.updatedAt || b.updated_at) - new Date(a.updatedAt || a.updated_at))
      .slice(0, 5);
  }, [myAppointments]);

  // ── Unified pending queue (appointments + tests) ─────────────────────
  const pendingQueue = useMemo(() => {
    const a = pendingAppointments.map((x) => ({
      key: `a-${x.id}`,
      type: "appointment",
      id: x.id,
      studentId: x.student_id || x.studentUserId,
      studentName: x.studentName,
      college: x.college,
      detail: "General Counseling",
      date: x.preferredDate,
      slot: Array.isArray(x.preferredSlots) ? x.preferredSlots[0] : x.timeSlot,
      isUrgent: Boolean(x.is_urgent || x.isUrgent),
      createdAt: x.createdAt || x.created_at,
    }));
    const t = pendingTests.map((x) => ({
      key: `t-${x.id}`,
      type: "test",
      id: x.id,
      studentId: x.student_id || x.studentUserId,
      studentName: x.studentName,
      college: x.college,
      detail: x.testType || "Psychological Test",
      date: x.preferredDate,
      slot: Array.isArray(x.preferredSlots) ? x.preferredSlots[0] : null,
      createdAt: x.createdAt || x.created_at,
    }));
    return [...a, ...t];
  }, [pendingAppointments, pendingTests]);

  const onAccept = (row) => (row.type === "test" ? handleAcceptTest(row.id) : handleAccept(row.id));
  const onReschedule = (row) => (row.type === "test" ? openRescheduleTest(row.id) : openReschedule(row.id));
  const onReject = (row) => (row.type === "test" ? handleRejectTest(row.id) : handleReject(row.id));

  // Only requests submitted today — regardless of when the appointment is for
  const todayPendingQueue = useMemo(
    () => pendingQueue.filter((row) => isSameDay(row.createdAt)),
    [pendingQueue]
  );

  // Queue number per time block for today's requests
  const todayQueueMap = useMemo(() => {
    const map = {};
    const getBlock = (slot) =>
      slot === "morning" || !slot || slot.startsWith("9:") || slot.startsWith("10:") || slot.startsWith("11:")
        ? "morning"
        : "afternoon";
    const groups = { morning: [], afternoon: [] };
    todayPendingQueue.forEach((row) => {
      groups[getBlock(row.slot)].push(row);
    });
    ["morning", "afternoon"].forEach((block) => {
      groups[block].forEach((row, i) => {
        map[row.key] = i + 1;
      });
    });
    return map;
  }, [todayPendingQueue]);

  const firstName = currentUser?.name?.split(" ")[0] || "Counselor";
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <WelcomeHero userName={firstName} />
    <div className="px-6 py-6 max-w-7xl mx-auto">
      {urgentNotifications.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle size={18} />
            <p className="text-sm font-medium">
              {urgentNotifications.length} urgent counseling request{urgentNotifications.length === 1 ? "" : "s"} need attention.
            </p>
          </div>
          <Link
            to="/counselor/appointments"
            className="text-sm font-semibold text-red-700 hover:underline whitespace-nowrap"
          >
            View →
          </Link>
        </div>
      )}
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Good morning, {firstName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {dateLabel}
          </p>
        </div>
        <Link
          to="/counselor/appointments"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-maroon-600 hover:bg-maroon-700 text-white text-sm font-medium transition-colors"
        >
          View all appointments
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <BigStat
          label="Total students"
          value={totalStudents}
          hint="Active caseload"
          icon={Users}
          tone="maroon"
        />
        <BigStat
          label="Pending requests"
          value={pendingAppointments.length + pendingTests.length}
          hint="Awaiting response"
          icon={Clock3}
          tone="amber"
        />
        <BigStat
          label="Today's appointments"
          value={todayAppointments}
          hint="Scheduled for today"
          icon={Calendar}
          tone="emerald"
        />
        <BigStat
          label="Incoming appointments"
          value={incomingAppointments}
          hint="Approved, rescheduled & follow-up"
          icon={Inbox}
          tone="blue"
        />
      </div>

      {/* Pending queue — today only */}
      <SectionCard
        className="mb-6"
        title="Pending queue"
        subtitle={
          todayPendingQueue.length === 0 && pendingQueue.length > 0
            ? `${pendingQueue.length} pending on other days — open queue to review`
            : `${todayPendingQueue.length} item${todayPendingQueue.length === 1 ? "" : "s"} for today`
        }
        noBodyPadding
        action={
          <Link
            to="/counselor/appointments"
            className="text-xs font-medium text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
          >
            Open queue <ArrowUpRight size={12} />
          </Link>
        }
      >
        {todayPendingQueue.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={pendingQueue.length > 0 ? "No requests for today" : "Inbox zero"}
            hint={
              pendingQueue.length > 0
                ? "Open the queue to see all pending requests."
                : "No appointment or test requests waiting for your review."
            }
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Column header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60">
              <div className="col-span-4">Student</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Preferred</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            {todayPendingQueue.slice(0, 6).map((row) => {
              const isTest = row.type === "test";
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-gray-50/70 transition"
                >
                  {/* Student */}
                  <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => openProfile(row.studentId, row.studentName)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition ${
                        isTest
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "bg-maroon-100 text-maroon-700 hover:bg-maroon-200"
                      }`}
                      title="View profile"
                    >
                      {initialsOf(row.studentName)}
                    </button>
                    <div className="min-w-0">
                      <button
                        onClick={() => openProfile(row.studentId, row.studentName)}
                        className="text-sm font-medium text-gray-900 hover:underline truncate text-left block max-w-full"
                      >
                        {row.studentName}
                      </button>
                      <p className="text-xs text-gray-500 truncate">{row.college || "—"}</p>
                    </div>
                  </div>

                  {/* Type */}
                  <div className="md:col-span-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                        isTest
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-maroon-50 text-maroon-700 border-maroon-200"
                      }`}
                    >
                      {isTest ? <ClipboardList size={11} /> : <Calendar size={11} />}
                      {isTest ? "Test" : "Appointment"}
                    </span>
                  </div>

                  {/* Preferred */}
                  <div className="md:col-span-3 text-xs text-gray-700 tabular-nums">
                    {row.isUrgent ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle size={11} /> Urgent
                      </span>
                    ) : (
                      <>
                        <div className="font-medium text-gray-900">{formatDate(row.date)}</div>
                        <div className="text-gray-500">{timeLabel(row.slot)}</div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-3 flex md:justify-end items-center gap-1">
                    <button
                      onClick={() => openChat(row.studentId, row.studentName)}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                      title="Message"
                    >
                      <MessageCircle size={14} />
                    </button>
                    <div ref={(el) => { queuePopoverRefs.current[row.key] = el; }} className="relative">
                      <button
                        onClick={() => setOpenQueuePopoverId(openQueuePopoverId === row.key ? null : row.key)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                        title="Actions"
                      >
                        <MoreVertical size={15} />
                      </button>
                      {openQueuePopoverId === row.key && (
                        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg ring-1 ring-gray-950/10 z-30 py-1 overflow-hidden">
                          <button
                            onClick={() => { onAccept(row); setOpenQueuePopoverId(null); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition text-left"
                          >
                            <Check size={14} /> Accept
                          </button>
                          {!row.isUrgent && (
                            <button
                              onClick={() => { onReschedule(row); setOpenQueuePopoverId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                            >
                              <CalendarClock size={14} /> Reschedule
                            </button>
                          )}
                          <button
                            onClick={() => { onReject(row); setOpenQueuePopoverId(null); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition text-left"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard
          title="Students by college"
          subtitle="Distribution of your caseload"
        >
          <DonutStat
            compact
            data={topColleges
              .filter(([, c]) => c > 0)
              .map(([name, value], i) => ({
                name,
                value,
                color: COLLEGE_COLORS[i % COLLEGE_COLORS.length],
              }))}
            total={totalStudents}
            centerLabel="students"
            emptyIcon={Users}
            emptyTitle="No students yet"
          />
        </SectionCard>

        <SectionCard
          title="Appointment status"
          subtitle="Breakdown of your appointments by current status"
        >
          <DonutStat
            data={appointmentStatusBreakdown.map((entry) => ({
              name: entry.name,
              value: entry.value,
              color: STATUS_COLORS[entry.name.toLowerCase()] || "#94a3b8",
            }))}
            total={myAppointments.length + myTests.length}
            centerLabel="appointments"
            emptyIcon={Calendar}
            emptyTitle="No appointments yet"
          />
        </SectionCard>
      </div>

      {/* Activity strip */}
      {recentlyRejected.length > 0 && (
        <SectionCard
          title="Recently rejected"
          subtitle="Most recent declined requests"
          noBodyPadding
        >
          <ul className="divide-y divide-gray-100">
            {recentlyRejected.map((a) => (
              <li
                key={a.id}
                className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {initialsOf(a.studentName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.studentName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {formatDate(a.preferredDate || a.scheduledDate)}
                      {a.counselor_action_note ? ` · ${a.counselor_action_note}` : ""}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex-shrink-0">
                  Rejected
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <Modal
        open={rescheduleModal.open}
        onClose={() => setRescheduleModal({ open: false, apptId: null, date: "", timeSlot: "", note: "" })}
        title="Reschedule appointment"
        subtitle="Propose a new date and time. The student will be notified."
        footer={
          <>
            <button
              type="button"
              className={BTN.secondary}
              onClick={() => setRescheduleModal({ open: false, apptId: null, date: "", timeSlot: "", note: "" })}
            >
              Cancel
            </button>
            <button type="button" className={BTN.primary} onClick={submitReschedule}>
              Confirm reschedule
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={LABEL}>New date</label>
            <input
              type="date"
              className={INPUT}
              value={rescheduleModal.date}
              onChange={(e) => setRescheduleModal((s) => ({ ...s, date: e.target.value }))}
            />
          </div>
          <div>
            <label className={LABEL}>New time slot</label>
            <select
              className={INPUT}
              value={rescheduleModal.timeSlot}
              onChange={(e) => setRescheduleModal((s) => ({ ...s, timeSlot: e.target.value }))}
            >
              <option value="">Select a slot</option>
              {Object.entries(TIME_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Note (optional)</label>
            <textarea
              rows={3}
              className={`${INPUT} resize-none`}
              value={rescheduleModal.note}
              onChange={(e) => setRescheduleModal((s) => ({ ...s, note: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={rescheduleTestModal.open}
        onClose={() => setRescheduleTestModal({ open: false, testId: null, date: "", timeSlot: "", note: "" })}
        title="Reschedule test"
        subtitle="Propose a new date and time for the psychological test."
        footer={
          <>
            <button
              type="button"
              className={BTN.secondary}
              onClick={() => setRescheduleTestModal({ open: false, testId: null, date: "", timeSlot: "", note: "" })}
            >
              Cancel
            </button>
            <button type="button" className={BTN.primary} onClick={submitRescheduleTest}>
              Confirm reschedule
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={LABEL}>New date</label>
            <input
              type="date"
              className={INPUT}
              value={rescheduleTestModal.date}
              onChange={(e) => setRescheduleTestModal((s) => ({ ...s, date: e.target.value }))}
            />
          </div>
          <div>
            <label className={LABEL}>New time slot</label>
            <select
              className={INPUT}
              value={rescheduleTestModal.timeSlot}
              onChange={(e) => setRescheduleTestModal((s) => ({ ...s, timeSlot: e.target.value }))}
            >
              <option value="">Select a slot</option>
              {Object.entries(TIME_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Note (optional)</label>
            <textarea
              rows={3}
              className={`${INPUT} resize-none`}
              value={rescheduleTestModal.note}
              onChange={(e) => setRescheduleTestModal((s) => ({ ...s, note: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, kind: null, id: null, note: "" })}
        title={`Reject ${rejectModal.kind === "test" ? "test request" : "appointment"}`}
        subtitle="The student will be notified. Please add a short note explaining why."
        danger
        footer={
          <>
            <button
              type="button"
              className={BTN.secondary}
              onClick={() => setRejectModal({ open: false, kind: null, id: null, note: "" })}
            >
              Cancel
            </button>
            <button
              type="button"
              className={BTN.danger}
              onClick={submitReject}
              disabled={!rejectModal.note.trim()}
            >
              Confirm reject
            </button>
          </>
        }
      >
        <textarea
          rows={4}
          className={`${INPUT} resize-none`}
          placeholder="e.g. Schedule conflict — please request another slot."
          value={rejectModal.note}
          onChange={(e) => setRejectModal((s) => ({ ...s, note: e.target.value }))}
        />
      </Modal>

      {selectedProfile && (
        <ProfileViewModal
          user={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onOpenChat={(user) => {
            setSelectedProfile(null);
            setChatRecipient(user);
          }}
        />
      )}
      {chatRecipient && (
        <ChatModal recipientUser={chatRecipient} onClose={() => setChatRecipient(null)} />
      )}
    </div>
    </>
  );
}
