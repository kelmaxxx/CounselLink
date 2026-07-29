import React, { useEffect, useRef, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
import { useReferrals } from "../../context/ReferralsContext";
import {
  User2,
  MessageCircle,
  Calendar,
  ClipboardList,
  Hash,
  CalendarClock,
  CheckCircle2,
  Check,
  X,
  Clock3,
  AlertTriangle,
  Search,
  MoreVertical,
  FileText,
} from "lucide-react";
import ProfileViewModal from "../../components/ProfileViewModal";
import ChatModal from "../../components/ChatModal";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  StatusPill,
  Modal,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
  formatDate,
  Pagination,
} from "../../components/ui";

const TIME_LABEL = {
  "9:00-10:00": "9:00 – 10:00 AM",
  "10:00-11:00": "10:00 – 11:00 AM",
  "11:00-12:00": "11:00 – 12:00 PM",
  "1:00-2:00": "1:00 – 2:00 PM",
  "2:00-3:00": "2:00 – 3:00 PM",
  "3:00-4:00": "3:00 – 4:00 PM",
  "4:00-5:00": "4:00 – 5:00 PM",
};
const timeLabel = (slot) => {
  if (slot === "morning") return "9:00 AM – 12:00 PM";
  if (slot === "afternoon") return "1:00 PM – 5:00 PM";
  return TIME_LABEL[slot] || slot || "—";
};

const getTimeBlock = (slot) => {
  if (!slot || slot === "morning" || slot.startsWith("9:") || slot.startsWith("10:") || slot.startsWith("11:"))
    return "AM";
  return "PM";
};

const SESSION_SUB_TABS = [
  { id: "approved", label: "Approved" },
  { id: "rescheduled", label: "Rescheduled" },
  { id: "follow_up", label: "Follow-up" },
  { id: "urgent", label: "Urgent" },
  { id: "missing", label: "Missed" },
];

const TEST_SUB_TABS = [
  { id: "approved", label: "Approved" },
  { id: "rescheduled", label: "Rescheduled" },
  { id: "missed", label: "Missed" },
];

export default function CounselorAppointments() {
  const { users, lookupUser } = useAuth();
  const {
    getAppointmentsForCurrentUser,
    completeAppointment,
    acceptAppointment,
    rejectAppointment,
    rescheduleAppointment,
    removeNoShows,
  } = useAppointments();
  const { getTestsForCurrentUser, fetchTests, acceptTest } = useTests();
  const { sessions } = useCounselingSessions();
  const { referrals, fetchReferrals } = useReferrals?.() || {};
  const [busyId, setBusyId] = useState(null);
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const actionRefs = useRef({});

  useEffect(() => {
    fetchReferrals?.().catch(() => undefined);
  }, [fetchReferrals]);

  useEffect(() => {
    if (!openPopoverId) return;
    const handleOutside = (e) => {
      const node = actionRefs.current[openPopoverId];
      if (node && !node.contains(e.target)) setOpenPopoverId(null);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openPopoverId]);

  const [rescheduleModal, setRescheduleModal] = useState({ open: false, apptId: null, date: "", timeSlot: "", note: "" });
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, note: "" });
  const [completeConfirmModal, setCompleteConfirmModal] = useState({ open: false, id: null, type: "counseling" });
  const [actionErrorModal, setActionErrorModal] = useState({ open: false, message: "" });
  const [activeTab, setActiveTab] = useState("pending");
  const [sessionSubTab, setSessionSubTab] = useState("approved");
  const [testSubTab, setTestSubTab] = useState("approved");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const PAGE_SIZE = 10;
  const [pendingPage, setPendingPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [testsPage, setTestsPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);

  const cleanupDone = useRef(false);
  useEffect(() => {
    if (!cleanupDone.current && removeNoShows) {
      cleanupDone.current = true;
      removeNoShows().catch(() => undefined);
    }
  }, [removeNoShows]);

  const handleMarkDone = (id, type = "counseling") => setCompleteConfirmModal({ open: true, id, type });

  const submitComplete = async () => {
    const { id, type } = completeConfirmModal;
    setCompleteConfirmModal({ open: false, id: null, type: "counseling" });
    setBusyId(id);
    const res = await completeAppointment({ id });
    setBusyId(null);
    if (!res.success) { setActionErrorModal({ open: true, message: res.message || "Failed to mark as done" }); return; }
    if (type === "test") fetchTests().catch(() => undefined);
  };

  const handleAccept = async (a) => {
    const date = a.preferredDate || a.preferred_date;
    const slot = Array.isArray(a.preferredSlots)
      ? a.preferredSlots[0]
      : a.timeSlot || (a.preferred_slots ? a.preferred_slots.split(",")[0] : null);
    if (!date || !slot) {
      setActionErrorModal({ open: true, message: "Date and time slot are required. Use Reschedule to assign a date and time before approving." });
      return;
    }
    setBusyId(a.id);
    const res = await acceptAppointment({ id: a.id, date, timeSlot: slot, note: null });
    setBusyId(null);
    if (!res.success) setActionErrorModal({ open: true, message: res.message || "Failed to accept request" });
  };

  const handleAcceptTest = async (t) => {
    const date = t.preferredDate || t.preferred_date;
    const slot = Array.isArray(t.preferredSlots)
      ? t.preferredSlots[0]
      : t.timeSlot || (t.preferred_slots ? t.preferred_slots.split(",")[0] : null);
    if (!date || !slot) {
      setActionErrorModal({ open: true, message: "Date and time slot are required. Use Reschedule to assign a date and time before approving." });
      return;
    }
    setBusyId(t.id);
    const res = await acceptTest({ id: t.id, date, timeSlot: slot });
    setBusyId(null);
    if (!res.success) setActionErrorModal({ open: true, message: res.message || "Failed to approve test request" });
  };

  const submitReject = async () => {
    const note = rejectModal.note.trim() || null;
    setBusyId(rejectModal.id);
    const res = await rejectAppointment({ id: rejectModal.id, note });
    setBusyId(null);
    if (res.success) setRejectModal({ open: false, id: null, note: "" });
    else alert(res.message || "Failed to reject request");
  };

  const submitReschedule = async () => {
    if (!rescheduleModal.date || !rescheduleModal.timeSlot) { alert("Select a date and time slot"); return; }
    setBusyId(rescheduleModal.apptId);
    const res = await rescheduleAppointment({ id: rescheduleModal.apptId, date: rescheduleModal.date, timeSlot: rescheduleModal.timeSlot, note: rescheduleModal.note || null });
    setBusyId(null);
    if (res.success) setRescheduleModal({ open: false, apptId: null, date: "", timeSlot: "", note: "" });
    else alert(res.message || "Failed to reschedule request");
  };

  const myAppointments = useMemo(() => getAppointmentsForCurrentUser(), [getAppointmentsForCurrentUser]);
  const myTests = useMemo(() => getTestsForCurrentUser(), [getTestsForCurrentUser]);
  const pendingTests = useMemo(() => {
    return myTests
      .filter((t) => t.status === "pending")
      .sort((x, y) => new Date(x.preferredDate || x.preferred_date || 0) - new Date(y.preferredDate || y.preferred_date || 0));
  }, [myTests]);

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);

  const openProfile = async (id, fallbackName) => {
    if (!id) return;
    const cached = users?.find((u) => u.id === id);
    if (cached) { setSelectedProfile(cached); return; }
    const fetched = await lookupUser?.(id);
    if (fetched) setSelectedProfile(fetched);
    else if (fallbackName) setSelectedProfile({ id, name: fallbackName });
  };

  const openChat = async (id, fallbackName) => {
    if (!id) return;
    const cached = users?.find((u) => u.id === id);
    if (cached) { setChatRecipient(cached); return; }
    const fetched = await lookupUser?.(id);
    if (fetched) setChatRecipient(fetched);
    else if (fallbackName) setChatRecipient({ id, name: fallbackName });
  };

  const pendingAppointments = useMemo(() => {
    return myAppointments
      .filter((a) => a.status === "pending")
      .sort((x, y) => {
        const dx = new Date(x.preferredDate || x.preferred_date || 0);
        const dy = new Date(y.preferredDate || y.preferred_date || 0);
        return dx - dy;
      });
  }, [myAppointments]);

  // Queue for pending urgent appointments only
  const queueMap = useMemo(() => {
    const map = {};
    const groups = {};
    pendingAppointments.forEach((a) => {
      const slot = Array.isArray(a.preferredSlots) ? a.preferredSlots[0] : a.timeSlot || "";
      const date = a.preferredDate || a.preferred_date || "";
      const key = `${date}|${getTimeBlock(slot)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    Object.values(groups).forEach((group) => {
      group.sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
      group.forEach((a, i) => { map[a.id] = i + 1; });
    });
    return map;
  }, [pendingAppointments]);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const isSlotOver = (slot) => {
    const mins = now.getHours() * 60 + now.getMinutes();
    const s = (slot || "").toLowerCase();
    const isAM = s === "morning" || s.startsWith("9:") || s.startsWith("10:") || s.startsWith("11:");
    const isPM = s === "afternoon" || s.startsWith("1:") || s.startsWith("2:") || s.startsWith("3:");
    if (isAM) return mins >= 12 * 60;
    if (isPM) return mins >= 17 * 60;
    return mins >= 17 * 60;
  };

  const standardizeDate = (dStr) => {
    if (!dStr) return "";
    try {
      return new Date(dStr).toISOString().split("T")[0];
    } catch {
      return String(dStr).split("T")[0];
    }
  };

  const upcomingAppointments = myAppointments.filter((a) => {
    if (a.status !== "approved" && a.status !== "rescheduled") return false;
    const sched = standardizeDate(a.scheduledDate || a.scheduled_date || a.preferredDate || a.preferred_date);
    if (!sched) return true; // Keep urgent/unscheduled
    if (sched > today) return true;
    if (sched === today) return !isSlotOver(a.scheduledTimeSlot || a.timeSlot || a.preferredTime || a.preferred_time);
    return false;
  });

  // Queue for approved/rescheduled/follow-up (non-urgent) — per scheduledDate + AM/PM, sorted by when counselor acted
  const sessionQueueMap = useMemo(() => {
    const map = {};
    const eligible = upcomingAppointments.filter((a) => !(a.is_urgent || a.isUrgent));
    const groups = {};
    eligible.forEach((a) => {
      const date = a.scheduledDate || "";
      const key = `${date}|${getTimeBlock(a.scheduledTimeSlot || "")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    Object.values(groups).forEach((group) => {
      group.sort((x, y) => new Date(x.updated_at || x.created_at || 0) - new Date(y.updated_at || y.created_at || 0));
      group.forEach((a, i) => { map[a.id] = i + 1; });
    });
    return map;
  }, [upcomingAppointments]);

  // Separate urgent queue — per scheduledDate + AM/PM, sorted by created_at
  const urgentSessionQueueMap = useMemo(() => {
    const map = {};
    const urgents = upcomingAppointments.filter((a) => a.is_urgent || a.isUrgent);
    const groups = {};
    urgents.forEach((a) => {
      const date = a.scheduledDate || a.preferredDate || "";
      const key = `${date}|${getTimeBlock(a.scheduledTimeSlot || a.timeSlot || "")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    Object.values(groups).forEach((group) => {
      group.sort((x, y) => new Date(x.created_at || 0) - new Date(y.created_at || 0));
      group.forEach((a, i) => { map[a.id] = i + 1; });
    });
    return map;
  }, [upcomingAppointments]);

  const completedAppointments = myAppointments.filter((a) => {
    if (a.status !== "completed") return false;
    const s = sessions?.find((s) => s.appointmentId === a.id || s.appointment_id === a.id);
    if (s) return s.nextSession === "termination";
    return true;
  });

  // Missed — no-shows + overdue follow-ups (violet) + overdue urgents (red)
  const overdueAppts = myAppointments.filter((a) => {
    if (a.status !== "approved" && a.status !== "rescheduled") return false;
    const sched = standardizeDate(a.scheduledDate || a.scheduled_date || a.preferredDate || a.preferred_date);
    if (!sched) return false;
    if (sched < today) return true;
    if (sched === today) return isSlotOver(a.scheduledTimeSlot || a.timeSlot || a.preferredTime || a.preferred_time);
    return false;
  });
  const missedAppointments = [
    ...myAppointments.filter((a) => a.status === "no_show").map((a) => ({ ...a, _missedType: "no_show" })),
    ...overdueAppts.filter((a) => a.reason === "Follow-up Session").map((a) => ({ ...a, _missedType: "follow_up" })),
    ...overdueAppts.filter((a) => !!(a.is_urgent || a.isUrgent) && a.reason !== "Follow-up Session").map((a) => ({ ...a, _missedType: "urgent" })),
  ];

  const upcomingTests = myTests.filter((t) => {
    if (t.status !== "approved" && t.status !== "rescheduled") return false;
    const sched = standardizeDate(t.scheduledDate || t.scheduled_date || t.preferredDate || t.preferred_date);
    if (!sched) return true;
    if (sched > today) return true;
    if (sched === today) return !isSlotOver(t.scheduledTimeSlot || t.timeSlot || t.preferredTime || t.preferred_time);
    return false;
  });
  const completedTests = myTests.filter((t) => t.status === "completed");

  const overdueTests = myTests.filter((t) => {
    if (t.status !== "approved" && t.status !== "rescheduled") return false;
    const sched = standardizeDate(t.scheduledDate || t.scheduled_date || t.preferredDate || t.preferred_date);
    if (!sched) return false;
    if (sched < today) return true;
    if (sched === today) return isSlotOver(t.scheduledTimeSlot || t.timeSlot || t.preferredTime || t.preferred_time);
    return false;
  });
  const missedTests = [
    ...myTests.filter((t) => t.status === "no_show"),
    ...overdueTests,
  ];

  const notCompletedAppointments = myAppointments.filter(
    (a) => a.status !== "completed" && a.status !== "rejected" && a.status !== "no_show"
  );

  // Completed tab — no-shows excluded (they live in Missing sub-tab under Sessions)
  const recentlyCompleted = [
    ...completedAppointments.map((a) => ({ ...a, _type: "counseling" })),
    ...completedTests.map((t) => ({ ...t, _type: "test" })),
  ].sort((x, y) => new Date(y.scheduledDate || y.preferredDate || 0) - new Date(x.scheduledDate || x.preferredDate || 0));

  const allNames = useMemo(() => {
    const names = new Set();
    myAppointments.forEach((a) => { if (a.studentName) names.add(a.studentName); });
    myTests.forEach((t) => { if (t.studentName) names.add(t.studentName); });
    return [...names].sort();
  }, [myAppointments, myTests]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allNames.filter((n) => {
      const lower = n.toLowerCase();
      return lower.startsWith(q) || lower.split(/\s+/).some((w) => w.startsWith(q));
    }).slice(0, 6);
  }, [allNames, search]);

  const pendingReferrals = (referrals || []).filter((r) => r.status === "pending");

  const matchesSearch = (name) => !search.trim() || (name || "").toLowerCase().includes(search.toLowerCase());

  const filteredPendingAppts = pendingAppointments.filter((a) => matchesSearch(a.studentName));
  const filteredPendingTests = pendingTests.filter((t) => matchesSearch(t.studentName));
  const filteredPendingReferrals = pendingReferrals.filter((r) => matchesSearch(r.studentName));
  const filteredSessions = upcomingAppointments.filter((a) => matchesSearch(a.studentName));
  const filteredTests = upcomingTests.filter((t) => matchesSearch(t.studentName));
  const filteredMissedTests = missedTests.filter((t) => matchesSearch(t.studentName));
  const filteredCompleted = recentlyCompleted.filter((item) => matchesSearch(item.studentName));
  const filteredMissed = missedAppointments.filter((a) => matchesSearch(a.studentName));

  const filteredPending = useMemo(() => [
    ...filteredPendingAppts.map((a) => ({ ...a, _kind: "appt" })),
    ...filteredPendingTests.map((t) => ({ ...t, _kind: "test" })),
    ...filteredPendingReferrals.map((r) => ({ ...r, _kind: "referral" })),
  ].sort((x, y) => new Date(x.preferredDate || x.preferred_date || x.created_at || 0) - new Date(y.preferredDate || y.preferred_date || y.created_at || 0)),
  [filteredPendingAppts, filteredPendingTests, filteredPendingReferrals]);

  const pagedPending = useMemo(
    () => filteredPending.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE),
    [filteredPending, pendingPage]
  );

  const sessionSubFiltered = useMemo(() => {
    const byDate = (a, b) => new Date(a.scheduledDate || a.preferredDate || 0) - new Date(b.scheduledDate || b.preferredDate || 0);
    switch (sessionSubTab) {
      case "approved":    return filteredSessions.filter((a) => a.status === "approved" && a.reason !== "Follow-up Session" && !a.is_urgent && !a.isUrgent).sort(byDate);
      case "rescheduled": return filteredSessions.filter((a) => a.status === "rescheduled" && !a.is_urgent && !a.isUrgent).sort(byDate);
      case "follow_up":   return filteredSessions.filter((a) => a.reason === "Follow-up Session" && !a.is_urgent && !a.isUrgent).sort(byDate);
      case "urgent":      return filteredSessions.filter((a) => a.is_urgent || a.isUrgent).sort(byDate);
      case "missing":     return filteredMissed.sort(byDate);
      default:            return filteredSessions.sort(byDate);
    }
  }, [filteredSessions, filteredMissed, sessionSubTab]);

  const pagedSessions = useMemo(
    () => sessionSubFiltered.slice((sessionsPage - 1) * PAGE_SIZE, sessionsPage * PAGE_SIZE),
    [sessionSubFiltered, sessionsPage]
  );
  const testSubFiltered = useMemo(() => {
    const byDate = (a, b) => new Date(a.scheduledDate || a.preferredDate || 0) - new Date(b.scheduledDate || b.preferredDate || 0);
    switch (testSubTab) {
      case "approved":    return filteredTests.filter((t) => t.status === "approved").sort(byDate);
      case "rescheduled": return filteredTests.filter((t) => t.status === "rescheduled").sort(byDate);
      case "missed":      return filteredMissedTests.sort(byDate);
      default:            return filteredTests.sort(byDate);
    }
  }, [filteredTests, filteredMissedTests, testSubTab]);

  const pagedTests = useMemo(
    () => testSubFiltered.slice((testsPage - 1) * PAGE_SIZE, testsPage * PAGE_SIZE),
    [testSubFiltered, testsPage]
  );
  const pagedCompleted = useMemo(
    () => filteredCompleted.slice((completedPage - 1) * PAGE_SIZE, completedPage * PAGE_SIZE),
    [filteredCompleted, completedPage]
  );

  const TABS = [
    { id: "pending",   label: "Pending",              count: pendingAppointments.length + pendingTests.length + pendingReferrals.length },
    { id: "sessions",  label: "Counseling Sessions",  count: upcomingAppointments.length },
    { id: "tests",     label: "Psychological Tests",   count: upcomingTests.length },
    { id: "completed", label: "Completed",             count: recentlyCompleted.length },
  ];

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Counselor"
        title="Upcoming appointments"
        subtitle="Scheduled counseling sessions and psychological tests"
      />

      {/* ── Tab bar + search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(""); setPendingPage(1); setSessionsPage(1); setTestsPage(1); setCompletedPage(1); setSessionSubTab("approved"); setTestSubTab("approved"); }}
              className={["flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap", activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"].join(" ")}
            >
              {tab.label}
              <span className={["inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[11px] font-bold px-1", activeTab === tab.id ? "bg-maroon-600 text-white" : "bg-gray-200 text-gray-600"].join(" ")}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            className="pl-9 pr-3 h-9 w-full sm:w-56 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon-400 bg-white"
            placeholder="Search student name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden text-sm">
              {suggestions.map((name) => (
                <li key={name} onMouseDown={() => { setSearch(name); setShowSuggestions(false); }} className="px-3 py-2 hover:bg-maroon-50 cursor-pointer text-gray-800">{name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ══════════════ PENDING TAB ══════════════ */}
      {activeTab === "pending" && (
        <SectionCard className="mb-6" title="Pending requests" subtitle={`${filteredPending.length} awaiting your response`} noBodyPadding>
          {filteredPending.length === 0 ? (
            <EmptyState icon={Clock3} title={search ? "No results" : "No pending requests"} hint={search ? `No pending requests match "${search}".` : "New counseling requests from students will appear here."} />
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {pagedPending.map((item) => {
                  if (item._kind === "appt") {
                  const a = item;
                  const studentId = a.student_id || a.studentUserId;
                  const isUrgent = !!(a.is_urgent || a.isUrgent);
                  const preferredSlot = Array.isArray(a.preferredSlots) ? a.preferredSlots[0] : a.timeSlot || "";
                  return (
                    <li key={a.id} className="px-4 py-3 hover:bg-gray-50/70 transition">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => openProfile(studentId, a.studentName)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition ${isUrgent ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                          title="View profile"
                        >
                          {initialsOf(a.studentName)}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Row 1: name · college · status · urgent badge · queue · control no */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => openProfile(studentId, a.studentName)} className="text-sm font-semibold text-gray-900 hover:underline">
                              {a.studentName}
                            </button>
                            <span className="text-xs text-gray-500">{a.college || "—"}</span>
                            <StatusPill status="pending" />
                            {isUrgent && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                <AlertTriangle size={11} /> Urgent
                              </span>
                            )}
                            {isUrgent && queueMap[a.id] != null && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-maroon-600 text-white">
                                Queue #{queueMap[a.id]}
                              </span>
                            )}
                            {a.controlNo && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
                                <Hash size={10} />{a.controlNo}
                              </span>
                            )}
                          </div>

                          {/* Rows: requested / preferred / reason */}
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-baseline gap-1.5 text-xs">
                              <span className="text-gray-400 w-16 flex-shrink-0">Requested</span>
                              <span className="text-gray-600">{a.created_at ? formatDate(a.created_at) : "—"}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 text-xs">
                              <span className="text-gray-400 w-16 flex-shrink-0">Preferred</span>
                              <span className="text-gray-700 tabular-nums">
                                {a.preferredDate ? `${formatDate(a.preferredDate)}${preferredSlot ? ` · ${timeLabel(preferredSlot)}` : ""}` : "—"}
                              </span>
                            </div>
                            {a.reason && (
                              <div className="flex items-baseline gap-1.5 text-xs">
                                <span className="text-gray-400 w-16 flex-shrink-0">Reason</span>
                                <span className="text-gray-600">{a.reason}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: message + 3-dot menu */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openChat(studentId, a.studentName)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition" title="Message">
                            <MessageCircle size={15} />
                          </button>
                          <div ref={(el) => { actionRefs.current[`appt-${a.id}`] = el; }} className="relative">
                            <button
                              onClick={() => setOpenPopoverId(openPopoverId === `appt-${a.id}` ? null : `appt-${a.id}`)}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                              title="Actions"
                            >
                              <MoreVertical size={15} />
                            </button>
                            {openPopoverId === `appt-${a.id}` && (
                              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg ring-1 ring-gray-950/10 z-30 py-1 overflow-hidden">
                                <button onClick={() => { handleAccept(a); setOpenPopoverId(null); }} disabled={busyId === a.id} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition text-left disabled:opacity-50">
                                  <Check size={14} /> {busyId === a.id ? "Approving…" : "Approve"}
                                </button>
                                {!isUrgent && (
                                  <button onClick={() => { setRescheduleModal({ open: true, apptId: a.id, date: "", timeSlot: "", note: "" }); setOpenPopoverId(null); }} disabled={busyId === a.id} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left disabled:opacity-50">
                                    <CalendarClock size={14} /> Reschedule
                                  </button>
                                )}
                                <button onClick={() => { setRejectModal({ open: true, id: a.id, note: "" }); setOpenPopoverId(null); }} disabled={busyId === a.id} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition text-left disabled:opacity-50">
                                  <X size={14} /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                  }
                  if (item._kind === "test") {
                  const t = item;
                  const studentId = t.student_id || t.studentUserId;
                  const preferredSlot = Array.isArray(t.preferredSlots) ? t.preferredSlots[0] : t.timeSlot || "";
                  return (
                    <li key={`test-${t.id}`} className="px-4 py-3 hover:bg-gray-50/70 transition">
                      <div className="flex items-start gap-3">
                        <button onClick={() => openProfile(studentId, t.studentName)} className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center justify-center text-xs font-semibold flex-shrink-0 transition" title="View profile">
                          {initialsOf(t.studentName)}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => openProfile(studentId, t.studentName)} className="text-sm font-semibold text-gray-900 hover:underline">{t.studentName}</button>
                            <span className="text-xs text-gray-500">{t.college || "—"}</span>
                            <StatusPill status={t.status} />
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                              <ClipboardList size={11} /> {t.testType || "Psychological Test"}
                            </span>
                            {t.controlNo && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
                                <Hash size={10} />{t.controlNo}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-baseline gap-1.5 text-xs">
                              <span className="text-gray-400 w-16 flex-shrink-0">Requested</span>
                              <span className="text-gray-600">{t.created_at ? formatDate(t.created_at) : "—"}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 text-xs">
                              <span className="text-gray-400 w-16 flex-shrink-0">Preferred</span>
                              <span className="text-gray-700 tabular-nums">
                                {t.preferredDate ? `${formatDate(t.preferredDate)}${preferredSlot ? ` · ${timeLabel(preferredSlot)}` : ""}` : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openChat(studentId, t.studentName)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition" title="Message">
                            <MessageCircle size={15} />
                          </button>
                          <div ref={(el) => { actionRefs.current[`test-${t.id}`] = el; }} className="relative">
                            <button onClick={() => setOpenPopoverId(openPopoverId === `test-${t.id}` ? null : `test-${t.id}`)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition" title="Actions">
                              <MoreVertical size={15} />
                            </button>
                            {openPopoverId === `test-${t.id}` && (
                              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg ring-1 ring-gray-950/10 z-30 py-1 overflow-hidden">
                                <button onClick={() => { handleAcceptTest(t); setOpenPopoverId(null); }} disabled={busyId === t.id} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition text-left disabled:opacity-50">
                                  <Check size={14} /> {busyId === t.id ? "Approving…" : "Approve"}
                                </button>
                                <button onClick={() => { setRescheduleModal({ open: true, apptId: t.id, date: "", timeSlot: "", note: "" }); setOpenPopoverId(null); }} disabled={busyId === t.id} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left disabled:opacity-50">
                                  <CalendarClock size={14} /> Reschedule
                                </button>
                                <button onClick={() => { setRejectModal({ open: true, id: t.id, note: "" }); setOpenPopoverId(null); }} disabled={busyId === t.id} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition text-left disabled:opacity-50">
                                  <X size={14} /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                  }
                  if (item._kind === "referral") {
                  const r = item;
                  return (
                    <li key={`ref-${r.id}`} className="px-4 py-3 hover:bg-gray-50/70 transition">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initialsOf(r.studentName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Row 1: name + badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{r.studentName}</span>
                            <StatusPill status="pending" />
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                              <FileText size={11} /> College Referral
                            </span>
                          </div>
                          {/* Department below name */}
                          {r.studentDepartment && (
                            <p className="text-xs text-gray-500 mt-0.5">{r.studentDepartment}</p>
                          )}
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-baseline gap-1.5 text-xs">
                              <span className="text-gray-400 w-20 flex-shrink-0">Counselor</span>
                              {r.receivingCounselorName ? (
                                <span className="text-gray-700">{r.receivingCounselorName}</span>
                              ) : (
                                <span className="text-gray-400 italic">To Be Approve</span>
                              )}
                            </div>
                            {r.reason && (
                              <div className="flex items-baseline gap-1.5 text-xs">
                                <span className="text-gray-400 w-20 flex-shrink-0">Reason</span>
                                <span className="text-gray-600 line-clamp-2">{r.reason}</span>
                              </div>
                            )}
                            <div className="flex items-baseline gap-1.5 text-xs">
                              <span className="text-gray-400 w-20 flex-shrink-0">Submitted</span>
                              <span className="text-gray-500 tabular-nums">{r.created_at ? formatDate(r.created_at) : "—"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Link
                            to="/counselor/referrals"
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-violet-300 bg-violet-50 text-xs text-violet-700 hover:bg-violet-100 transition"
                          >
                            <FileText size={12} /> View
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                  }
                })}
              </ul>
              <Pagination page={pendingPage} totalPages={Math.ceil(filteredPending.length / PAGE_SIZE)} onPageChange={setPendingPage} />
            </>
          )}
        </SectionCard>
      )}

      {/* ══════════════ SESSIONS TAB ══════════════ */}
      {activeTab === "sessions" && (
        <SectionCard className="mb-6" title="Counseling sessions" subtitle={`${filteredSessions.length} scheduled`} noBodyPadding>
          {/* Sub-tab bar */}
          <div className="flex items-center gap-1 border-b border-gray-100 px-4 pt-3 overflow-x-auto">
            {SESSION_SUB_TABS.map((st) => {
              let cnt;
              switch (st.id) {
                case "approved":    cnt = filteredSessions.filter((a) => a.status === "approved" && a.reason !== "Follow-up Session" && !a.is_urgent && !a.isUrgent).length; break;
                case "rescheduled": cnt = filteredSessions.filter((a) => a.status === "rescheduled" && !a.is_urgent && !a.isUrgent).length; break;
                case "follow_up":   cnt = filteredSessions.filter((a) => a.reason === "Follow-up Session" && !a.is_urgent && !a.isUrgent).length; break;
                case "urgent":      cnt = filteredSessions.filter((a) => a.is_urgent || a.isUrgent).length; break;
                case "missing":     cnt = filteredMissed.length; break;
                default:            cnt = filteredSessions.length;
              }
              return (
                <button
                  key={st.id}
                  onClick={() => { setSessionSubTab(st.id); setSessionsPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition whitespace-nowrap ${sessionSubTab === st.id ? "text-maroon-700 border-maroon-600" : "text-gray-500 border-transparent hover:text-gray-700"}`}
                >
                  {st.label}
                  <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold tabular-nums ${sessionSubTab === st.id ? "bg-maroon-100 text-maroon-700" : "bg-gray-100 text-gray-600"}`}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {sessionSubFiltered.length === 0 ? (
            <EmptyState icon={Calendar} title={search ? "No results" : "No sessions in this category"} hint={search ? `No sessions match "${search}".` : "Sessions matching this filter will appear here."} />
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {pagedSessions.map((a) => {
                  const studentId = a.student_id || a.studentUserId;
                  const isMissing = sessionSubTab === "missing";
                  const isUrgent = !!(a.is_urgent || a.isUrgent);
                  const isFollowup = sessionSubTab === "follow_up";
                  const isRescheduled = sessionSubTab === "rescheduled";
                  const missedType = a._missedType;

                  const avatarClass = isMissing
                    ? missedType === "follow_up"
                      ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      : missedType === "urgent"
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    : isUrgent
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : isFollowup
                    ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                    : isRescheduled
                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    : "bg-maroon-100 text-maroon-700 hover:bg-maroon-200";

                  const displayStatus = isFollowup ? "followup" : isUrgent ? "urgent" : a.status;

                  return (
                    <li key={a.id} className="px-4 py-3 hover:bg-gray-50/70 transition">
                      <div className="flex items-start gap-3">
                        <button onClick={() => openProfile(studentId, a.studentName)} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition ${avatarClass}`} title="View profile">
                          {initialsOf(a.studentName)}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Row 1: name · college (not urgent) · status · control no */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => openProfile(studentId, a.studentName)} className="text-sm font-semibold text-gray-900 hover:underline">
                              {a.studentName}
                            </button>
                            <span className="text-xs text-gray-500">{a.college || "—"}</span>
                            {isMissing ? (
                              missedType === "follow_up" ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">Missed Follow-up</span>
                              ) : missedType === "urgent" ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Missed Urgent</span>
                              ) : (
                                <StatusPill status="no_show" />
                              )
                            ) : (
                              <StatusPill status={displayStatus} />
                            )}
                            {a.controlNo && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
                                <Hash size={10} />{a.controlNo}
                              </span>
                            )}
                          </div>

                          {/* Sub-tab–specific rows */}
                          <div className="mt-1.5 space-y-0.5">

                            {/* APPROVED */}
                            {sessionSubTab === "approved" && (
                              <>
                                {sessionQueueMap[a.id] != null && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white text-[11px]">
                                      Queue #{sessionQueueMap[a.id]}
                                    </span>
                                    <span className="text-gray-400">{getTimeBlock(a.scheduledTimeSlot)} block</span>
                                  </div>
                                )}
                                <div className="flex items-baseline gap-1.5 text-xs">
                                  <span className="text-gray-400 w-16 flex-shrink-0">Schedule</span>
                                  <span className="text-gray-900 font-medium tabular-nums">
                                    {a.scheduledDate ? `${formatDate(a.scheduledDate)} · ${timeLabel(a.scheduledTimeSlot)}` : "—"}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* RESCHEDULED */}
                            {sessionSubTab === "rescheduled" && (
                              <>
                                {sessionQueueMap[a.id] != null && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white text-[11px]">
                                      Queue #{sessionQueueMap[a.id]}
                                    </span>
                                    <span className="text-gray-400">{getTimeBlock(a.scheduledTimeSlot)} block</span>
                                  </div>
                                )}
                                <div className="flex items-baseline gap-1.5 text-xs">
                                  <span className="text-gray-400 w-20 flex-shrink-0">Rescheduled</span>
                                  <span className="text-gray-600">{a.updated_at ? formatDate(a.updated_at) : "—"}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5 text-xs">
                                  <span className="text-gray-400 w-20 flex-shrink-0">Schedule</span>
                                  <span className="text-gray-900 font-medium tabular-nums">
                                    {a.scheduledDate ? `${formatDate(a.scheduledDate)} · ${timeLabel(a.scheduledTimeSlot)}` : "—"}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* FOLLOW-UP */}
                            {sessionSubTab === "follow_up" && (
                              <>
                                {sessionQueueMap[a.id] != null && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white text-[11px]">
                                      Queue #{sessionQueueMap[a.id]}
                                    </span>
                                    <span className="text-gray-400">{getTimeBlock(a.scheduledTimeSlot)} block</span>
                                  </div>
                                )}
                                <div className="flex items-baseline gap-1.5 text-xs">
                                  <span className="text-gray-400 w-16 flex-shrink-0">Created</span>
                                  <span className="text-gray-600">{a.created_at ? formatDate(a.created_at) : "—"}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5 text-xs">
                                  <span className="text-gray-400 w-16 flex-shrink-0">Schedule</span>
                                  <span className="text-gray-900 font-medium tabular-nums">
                                    {a.scheduledDate ? `${formatDate(a.scheduledDate)} · ${timeLabel(a.scheduledTimeSlot)}` : "—"}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* URGENT */}
                            {sessionSubTab === "urgent" && (
                              <>
                                <div className="flex items-baseline gap-1.5 text-xs">
                                  <span className="text-gray-400 w-16 flex-shrink-0">Appt #</span>
                                  <span className="text-gray-500">{a.controlNo}</span>
                                </div>
                                {urgentSessionQueueMap[a.id] != null && (
                                  <div className="flex items-center gap-2 text-xs mt-0.5">
                                    <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px]">
                                      Urgent Queue #{urgentSessionQueueMap[a.id]}
                                    </span>
                                    <span className="text-gray-400">{(a.queue_slot || getTimeBlock(a.scheduledTimeSlot || a.timeSlot || "")) + " slot"}</span>
                                  </div>
                                )}
                                <div className="flex items-baseline gap-1.5 text-xs">
                                  <span className="text-gray-400 w-16 flex-shrink-0">Schedule</span>
                                  <span className="text-gray-900 font-medium tabular-nums">
                                    {a.queueDate || a.queue_date ? formatDate(a.queueDate || a.queue_date) : a.created_at ? formatDate(a.created_at) : "—"}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* MISSING */}
                            {sessionSubTab === "missing" && (
                              <div className="flex items-baseline gap-1.5 text-xs">
                                <span className="text-gray-400 w-16 flex-shrink-0">Schedule</span>
                                <span className="text-gray-700 tabular-nums">
                                  {a.scheduledDate ? `${formatDate(a.scheduledDate)} · ${timeLabel(a.scheduledTimeSlot)}` : "—"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right actions: profile · message · open form · 3-dot popover (non-missing) */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openProfile(studentId, a.studentName)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition" title="View profile">
                            <User2 size={15} />
                          </button>
                          <button onClick={() => openChat(studentId, a.studentName)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition" title="Message">
                            <MessageCircle size={15} />
                          </button>
                          <a href={`/counselor/appointments/${a.id}/form`} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-maroon-600 hover:bg-maroon-700 text-white text-xs font-medium transition">
                            <FileText size={13} /> Open form
                          </a>
                          {!isMissing && (() => {
                            const sessPopoverId = `sess-${a.id}`;
                            const sess = sessions?.find((s) => s.appointmentId === a.id || s.appointment_id === a.id);
                            return (
                              <div ref={(el) => { actionRefs.current[sessPopoverId] = el; }} className="relative">
                                <button
                                  onClick={() => setOpenPopoverId(openPopoverId === sessPopoverId ? null : sessPopoverId)}
                                  className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                                  title="Actions"
                                >
                                  <MoreVertical size={15} />
                                </button>
                                {openPopoverId === sessPopoverId && (
                                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg ring-1 ring-gray-950/10 z-30 py-1 overflow-hidden">
                                    <button
                                      onClick={() => { setRescheduleModal({ open: true, apptId: a.id, date: "", timeSlot: "", note: "" }); setOpenPopoverId(null); }}
                                      disabled={busyId === a.id}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left disabled:opacity-50"
                                    >
                                      <CalendarClock size={14} /> Reschedule
                                    </button>
                                    {sess?.nextSession === "termination" && (
                                      <button
                                        onClick={() => { handleMarkDone(a.id); setOpenPopoverId(null); }}
                                        disabled={busyId === a.id}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition text-left disabled:opacity-50"
                                      >
                                        <CheckCircle2 size={14} /> {busyId === a.id ? "Saving…" : "Mark done"}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => { setRejectModal({ open: true, id: a.id, note: "" }); setOpenPopoverId(null); }}
                                      disabled={busyId === a.id}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition text-left disabled:opacity-50"
                                    >
                                      <X size={14} /> Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Pagination page={sessionsPage} totalPages={Math.ceil(sessionSubFiltered.length / PAGE_SIZE)} onPageChange={setSessionsPage} />
            </>
          )}
        </SectionCard>
      )}

      {/* ══════════════ TESTS TAB ══════════════ */}
      {activeTab === "tests" && (
        <SectionCard className="mb-6" title="Psychological tests" subtitle={`${upcomingTests.length} scheduled`} noBodyPadding>
          {/* Sub-tab bar */}
          <div className="flex items-center gap-1 border-b border-gray-100 px-4 pt-3 overflow-x-auto">
            {TEST_SUB_TABS.map((st) => {
              let cnt;
              switch (st.id) {
                case "approved":    cnt = filteredTests.filter((t) => t.status === "approved").length; break;
                case "rescheduled": cnt = filteredTests.filter((t) => t.status === "rescheduled").length; break;
                case "missed":      cnt = filteredMissedTests.length; break;
                default:            cnt = filteredTests.length;
              }
              return (
                <button
                  key={st.id}
                  onClick={() => { setTestSubTab(st.id); setTestsPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition whitespace-nowrap ${testSubTab === st.id ? "text-maroon-700 border-maroon-600" : "text-gray-500 border-transparent hover:text-gray-700"}`}
                >
                  {st.label}
                  <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold tabular-nums ${testSubTab === st.id ? "bg-maroon-100 text-maroon-700" : "bg-gray-100 text-gray-600"}`}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {testSubFiltered.length === 0 ? (
            <EmptyState icon={ClipboardList} title={search ? "No results" : "No tests in this category"} hint={search ? `No tests match "${search}".` : "Tests matching this filter will appear here."} />
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {pagedTests.map((t) => {
                  const studentId = t.student_id || t.studentUserId;
                  const original = t.preferredDate
                    ? `${formatDate(t.preferredDate)} · ${Array.isArray(t.preferredSlots) ? t.preferredSlots.map((s) => timeLabel(s)).join(", ") : "—"}`
                    : "—";
                  const isMissedTest = testSubTab === "missed";
                  return (
                    <li key={t.id} className="px-4 py-3 hover:bg-gray-50/70 transition">
                      <div className="flex items-start gap-3">
                        <button onClick={() => openProfile(studentId, t.studentName)} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition ${isMissedTest ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`} title="View profile">
                          {initialsOf(t.studentName)}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => openProfile(studentId, t.studentName)} className="text-sm font-semibold text-gray-900 hover:underline">{t.studentName}</button>
                            <span className="text-xs text-gray-500">{t.college || "—"}</span>
                            {isMissedTest ? (
                              <StatusPill status="no_show" />
                            ) : (
                              <StatusPill status={t.status} />
                            )}
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                              <ClipboardList size={11} /> {t.testType || "Psychological test"}
                            </span>
                            {t.controlNo && <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium"><Hash size={10} />{t.controlNo}</span>}
                            {!isMissedTest && t.queue_number != null && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                                {t.queue_slot || getTimeBlock(t.scheduledTimeSlot || "")} Queue #{t.queue_number}
                              </span>
                            )}
                          </div>
                          <dl className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
                            <div className="flex items-baseline gap-1.5"><dt className="text-gray-500">Requested</dt><dd className="text-gray-700 tabular-nums">{original}</dd></div>
                            {t.scheduledDate && (
                              <div className="flex items-baseline gap-1.5"><dt className="text-gray-500">Scheduled</dt><dd className="text-gray-900 font-medium tabular-nums">{formatDate(t.scheduledDate)} · {timeLabel(t.scheduledTimeSlot)}</dd></div>
                            )}
                          </dl>
                          {(t.note || t.reason) && (
                            <div className="mt-1.5 space-y-0.5">
                              {t.reason && <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Reason:</span> {t.reason}</p>}
                              {t.note && <p className="text-xs text-gray-500 italic">"{t.note}"</p>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openProfile(studentId, t.studentName)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition" title="View profile"><User2 size={15} /></button>
                          <button onClick={() => openChat(studentId, t.studentName)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition" title="Message"><MessageCircle size={15} /></button>
                          <a href={`/counselor/tests/${t.id}/form`} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-maroon-600 hover:bg-maroon-700 text-white text-xs font-medium transition"><FileText size={13} /> Open form</a>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Pagination page={testsPage} totalPages={Math.ceil(testSubFiltered.length / PAGE_SIZE)} onPageChange={setTestsPage} />
            </>
          )}
        </SectionCard>
      )}

      {/* ══════════════ COMPLETED TAB ══════════════ */}
      {activeTab === "completed" && (
        <SectionCard className="mb-6" title="Completed Appointments" subtitle={`${filteredCompleted.length} completed — counseling sessions and psychological tests`} noBodyPadding>
          {filteredCompleted.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={search ? "No results" : "No completed appointments yet"} hint={search ? `No completed records match "${search}".` : "Finished sessions and tests will appear here."} />
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {pagedCompleted.map((item) => (
                  <li key={`${item._type}-${item.id}`} className="px-4 py-3 hover:bg-gray-50/70 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {initialsOf(item.studentName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{item.studentName}</span>
                          <span className="text-xs text-gray-500">{item.college || "—"}</span>
                          <StatusPill status="completed" />
                          {item._type === "test" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                              <ClipboardList size={11} /> {item.testType || "Psychological test"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-maroon-50 text-maroon-700 border-maroon-200">
                              <FileText size={11} /> Counseling
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                          {formatDate(item.scheduledDate || item.preferredDate)}
                          {item.scheduledTimeSlot ? ` · ${timeLabel(item.scheduledTimeSlot)}` : ""}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={completedPage} totalPages={Math.ceil(filteredCompleted.length / PAGE_SIZE)} onPageChange={setCompletedPage} />
            </>
          )}
        </SectionCard>
      )}

      {/* ── Reschedule modal ── */}
      <Modal
        open={rescheduleModal.open}
        onClose={() => setRescheduleModal({ open: false, apptId: null, date: "", timeSlot: "", note: "" })}
        title="Reschedule appointment"
        subtitle="Propose a new date and time. The student will be notified."
        footer={
          <>
            <button type="button" className={BTN.secondary} onClick={() => setRescheduleModal({ open: false, apptId: null, date: "", timeSlot: "", note: "" })}>Cancel</button>
            <button type="button" className={BTN.primary} onClick={submitReschedule}>Confirm reschedule</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={LABEL}>New date</label>
            <input type="date" className={INPUT} value={rescheduleModal.date} onChange={(e) => setRescheduleModal((s) => ({ ...s, date: e.target.value }))} />
          </div>
          <div>
            <label className={LABEL}>New time slot</label>
            <select className={INPUT} value={rescheduleModal.timeSlot} onChange={(e) => setRescheduleModal((s) => ({ ...s, timeSlot: e.target.value }))}>
              <option value="">Select a slot</option>
              {Object.entries(TIME_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Note (optional)</label>
            <textarea rows={3} className={`${INPUT} resize-none`} value={rescheduleModal.note} onChange={(e) => setRescheduleModal((s) => ({ ...s, note: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* ── Reject modal ── */}
      <Modal
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, id: null, note: "" })}
        title="Reject appointment"
        subtitle="The student will be notified. Please add a short note explaining why."
        danger
        footer={
          <>
            <button type="button" className={BTN.secondary} onClick={() => setRejectModal({ open: false, id: null, note: "" })}>Cancel</button>
            <button type="button" className={BTN.danger} onClick={submitReject} disabled={!rejectModal.note.trim()}>Confirm reject</button>
          </>
        }
      >
        <textarea rows={4} className={`${INPUT} resize-none`} placeholder="e.g. Schedule conflict — please request another slot." value={rejectModal.note} onChange={(e) => setRejectModal((s) => ({ ...s, note: e.target.value }))} />
      </Modal>

      {/* ── Mark complete confirmation ── */}
      <Modal
        open={completeConfirmModal.open}
        onClose={() => setCompleteConfirmModal({ open: false, id: null, type: "counseling" })}
        title="Mark as completed"
        subtitle="Confirm session completion"
        footer={
          <>
            <button type="button" className={BTN.secondary} onClick={() => setCompleteConfirmModal({ open: false, id: null, type: "counseling" })}>Cancel</button>
            <button type="button" className={BTN.primary} onClick={submitComplete}>Confirm Complete</button>
          </>
        }
      >
        <p className="text-sm text-gray-700 leading-relaxed">
          {completeConfirmModal.type === "test"
            ? "Mark this psychological test request as completed? You will be able to fill up the test results and release them to the student afterwards."
            : "Mark this counseling session as completed? You will be able to open the form and submit the final Session Report afterwards."}
        </p>
      </Modal>

      {/* ── Action error modal ── */}
      <Modal
        open={actionErrorModal.open}
        onClose={() => setActionErrorModal({ open: false, message: "" })}
        title="Unable to complete this action"
        danger
        footer={<button type="button" className={BTN.primary} onClick={() => setActionErrorModal({ open: false, message: "" })}>OK</button>}
      >
        <p className="text-sm text-gray-700 leading-relaxed">{actionErrorModal.message}</p>
      </Modal>

      {selectedProfile && (
        <ProfileViewModal user={selectedProfile} onClose={() => setSelectedProfile(null)} onOpenChat={(user) => { setSelectedProfile(null); setChatRecipient(user); }} />
      )}
      {chatRecipient && <ChatModal recipientUser={chatRecipient} onClose={() => setChatRecipient(null)} />}
    </div>
  );
}
