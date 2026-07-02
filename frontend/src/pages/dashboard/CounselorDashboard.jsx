// src/pages/dashboard/CounselorDashboard.jsx
import React, { useMemo, useState } from "react";
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
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import ProfileViewModal from "../../components/ProfileViewModal";
import WelcomeHero from "../../components/WelcomeHero";
import ChatModal from "../../components/ChatModal";
import { useNotifications } from "../../context/NotificationsContext";
import { PageHeader, StatCard, SectionCard, EmptyState, Modal, BTN, INPUT, LABEL, initialsOf, formatDate } from "../../components/ui";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLLEGE_COLORS = ["#0B6623", "#1d4ed8", "#15803d", "#c2410c", "#7e22ce", "#0e7490", "#9f1239"];
const STATUS_COLORS = {
  pending: "#f59e0b",
  approved: "#16a34a",
  rescheduled: "#0ea5e9",
  rejected: "#dc2626",
  completed: "#065f46",
  "follow-up": "#eab308",
};

const TIME_LABEL = {
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

  const topColleges = Object.entries(studentsByCollege).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const appointmentStatusBreakdown = useMemo(() => {
    const counts = myAppointments.reduce((acc, a) => {
      // Follow-up appointments are plain "approved" rows with this fixed
      // reason (set when a finalized session schedules its follow-up) — split
      // them out so the breakdown reflects what's actually shown elsewhere.
      const isFollowup = a.status === "approved" && a.reason === "Follow-up Session";
      const key = isFollowup ? "followup" : a.status || "pending";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({
      name: name === "followup" ? "Follow-up" : name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [myAppointments]);

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
    }));
    return [...a, ...t];
  }, [pendingAppointments, pendingTests]);

  const onAccept = (row) => (row.type === "test" ? handleAcceptTest(row.id) : handleAccept(row.id));
  const onReschedule = (row) => (row.type === "test" ? openRescheduleTest(row.id) : openReschedule(row.id));
  const onReject = (row) => (row.type === "test" ? handleRejectTest(row.id) : handleReject(row.id));

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
            {dateLabel} · {pendingQueue.length} pending request{pendingQueue.length === 1 ? "" : "s"}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total students"
          value={totalStudents}
          hint="Active caseload"
          icon={Users}
          accent="bg-gray-400"
        />
        <StatCard
          label="Pending requests"
          value={pendingAppointments.length + pendingTests.length}
          hint="Awaiting response"
          icon={Clock3}
          accent="bg-amber-500"
        />
        <StatCard
          label="Today's appointments"
          value={todayAppointments}
          hint="Scheduled for today"
          icon={Calendar}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Incoming appointments"
          value={incomingAppointments}
          hint="Approved, rescheduled & follow-up"
          icon={Inbox}
          accent="bg-blue-500"
        />
      </div>

      {/* Pending queue */}
      <SectionCard
        className="mb-6"
        title="Pending queue"
        subtitle={`${pendingQueue.length} item${pendingQueue.length === 1 ? "" : "s"} awaiting action`}
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
        {pendingQueue.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Inbox zero"
            hint="No appointment or test requests waiting for your review."
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
            {pendingQueue.slice(0, 6).map((row) => {
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
                    <p className="text-xs text-gray-500 mt-1 truncate">{row.detail}</p>
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
                    {row.isUrgent && row.type === "appointment" && (
                      <Link
                        to={`/counselor/appointments/${row.id}/form`}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-maroon-600 hover:bg-maroon-700 text-white text-xs font-medium transition"
                        title="Open form"
                      >
                        <FileText size={13} /> Open form
                      </Link>
                    )}
                    <button
                      onClick={() => onAccept(row)}
                      className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition"
                      title="Accept"
                    >
                      <Check size={13} /> Accept
                    </button>
                    {!row.isUrgent && (
                      <button
                        onClick={() => onReschedule(row)}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-100 transition"
                        title="Reschedule"
                      >
                        <CalendarClock size={13} /> Reschedule
                      </button>
                    )}
                    <button
                      onClick={() => onReject(row)}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 transition"
                      title="Reject"
                    >
                      <X size={14} />
                    </button>
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
          action={
            <span className="text-xs text-gray-500 tabular-nums">
              Total <span className="font-semibold text-gray-900">{totalStudents}</span>
            </span>
          }
        >
          <div>
            {topColleges.filter(([, c]) => c > 0).length === 0 ? (
              <EmptyState icon={Users} title="No students yet" />
            ) : (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topColleges
                        .filter(([, c]) => c > 0)
                        .map(([name, value]) => ({ name, value }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {topColleges
                        .filter(([, c]) => c > 0)
                        .map((_, i) => (
                          <Cell key={i} fill={COLLEGE_COLORS[i % COLLEGE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={32}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, color: "#4b5563" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Appointment status"
          subtitle="Breakdown of your appointments by current status"
          action={
            <span className="text-xs text-gray-500 tabular-nums">
              Total <span className="font-semibold text-gray-900">{myAppointments.length}</span>
            </span>
          }
        >
          <div>
            {appointmentStatusBreakdown.length === 0 ? (
              <EmptyState icon={Calendar} title="No appointments yet" />
            ) : (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={appointmentStatusBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {appointmentStatusBreakdown.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[entry.name.toLowerCase()] || "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={32}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, color: "#4b5563" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
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
