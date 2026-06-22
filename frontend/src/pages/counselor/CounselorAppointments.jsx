import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
import {
  User2,
  MessageCircle,
  Calendar,
  ClipboardList,
  ArrowRight,
  FileText,
  Hash,
  CalendarClock,
  CheckCircle2,
  Check,
  X,
  Clock3,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import ProfileViewModal from "../../components/ProfileViewModal";
import ChatModal from "../../components/ChatModal";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
  StatusPill,
  Modal,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
  formatDate,
} from "../../components/ui";

const TIME_LABEL = {
  "9:00-10:00": "9:00 – 10:00 AM",
  "10:00-11:00": "10:00 – 11:00 AM",
  "11:00-12:00": "11:00 – 12:00 PM",
  "1:00-2:00": "1:00 – 2:00 PM",
  "2:00-3:00": "2:00 – 3:00 PM",
  "3:00-4:00": "3:00 – 4:00 PM",
};
const timeLabel = (slot) => TIME_LABEL[slot] || slot || "—";

export default function CounselorAppointments() {
  const { users, lookupUser } = useAuth();
  const {
    getAppointmentsForCurrentUser,
    completeAppointment,
    acceptAppointment,
    rejectAppointment,
    rescheduleAppointment,
  } = useAppointments();
<<<<<<< HEAD
  const { getTestsForCurrentUser, fetchTests } = useTests();
  const { fetchSessionByAppointment, deleteSession, sessions } = useCounselingSessions();
=======
  const { getTestsForCurrentUser } = useTests();
  const { sessions } = useCounselingSessions();
>>>>>>> proper-and-printable-counseling-form
  const [busyId, setBusyId] = useState(null);

  // Pending-request action modals
  const [rescheduleModal, setRescheduleModal] = useState({
    open: false,
    apptId: null,
    date: "",
    timeSlot: "",
    note: "",
  });
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, note: "" });

  const [completeConfirmModal, setCompleteConfirmModal] = useState({
    open: false,
    id: null,
    type: "counseling", // "counseling" or "test"
  });

<<<<<<< HEAD
  const [discardConfirmModal, setDiscardConfirmModal] = useState({
    open: false,
    appt: null,
  });

  const [actionErrorModal, setActionErrorModal] = useState({ open: false, message: "" });

=======
>>>>>>> proper-and-printable-counseling-form
  const handleMarkDone = (id, type = "counseling") => {
    setCompleteConfirmModal({ open: true, id, type });
  };

  const submitComplete = async () => {
    const { id, type } = completeConfirmModal;
    setCompleteConfirmModal({ open: false, id: null, type: "counseling" });
    setBusyId(id);
    const res = await completeAppointment({ id });
    setBusyId(null);
    if (!res.success) {
      setActionErrorModal({ open: true, message: res.message || "Failed to mark as done" });
      return;
    }
    // Psychological tests live in their own TestsContext cache, separate from
    // AppointmentsContext — completing one updates the appointments table but
    // doesn't refresh that cache, so the row stuck around until a manual
    // page reload. Refetch it explicitly here.
    if (type === "test") {
      fetchTests().catch(() => undefined);
    }
  };

  const handleAccept = async (a) => {
    const slot = Array.isArray(a.preferredSlots)
      ? a.preferredSlots[0]
      : a.timeSlot || (a.preferred_slots ? a.preferred_slots.split(",")[0] : null);
    setBusyId(a.id);
    const res = await acceptAppointment({
      id: a.id,
      date: a.preferredDate || a.preferred_date,
      timeSlot: slot,
      note: null,
    });
    setBusyId(null);
    if (!res.success) alert(res.message || "Failed to accept request");
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
    if (!rescheduleModal.date || !rescheduleModal.timeSlot) {
      alert("Select a date and time slot");
      return;
    }
    setBusyId(rescheduleModal.apptId);
    const res = await rescheduleAppointment({
      id: rescheduleModal.apptId,
      date: rescheduleModal.date,
      timeSlot: rescheduleModal.timeSlot,
      note: rescheduleModal.note || null,
    });
    setBusyId(null);
    if (res.success) setRescheduleModal({ open: false, apptId: null, date: "", timeSlot: "", note: "" });
    else alert(res.message || "Failed to reschedule request");
  };

  const myAppointments = useMemo(
    () => getAppointmentsForCurrentUser(),
    [getAppointmentsForCurrentUser]
  );
  const myTests = useMemo(() => getTestsForCurrentUser(), [getTestsForCurrentUser]);

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);

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

  const pendingAppointments = myAppointments.filter((a) => a.status === "pending");
  const upcomingAppointments = myAppointments.filter(
    (a) => a.status === "approved" || a.status === "rescheduled"
  );
  // Only show in "Recently completed" if session was finalized with termination (not follow-up)
  const completedAppointments = myAppointments.filter((a) => {
    if (a.status !== "completed") return false;
    const s = sessions?.find((s) => s.appointmentId === a.id || s.appointment_id === a.id);
    // If there's a session record, only show when it's a termination (not a follow-up that spawned a new appt)
    if (s) return s.nextSession === "termination";
    // No session record yet — still show so counselor can open the form and submit the report
    return true;
  });
  const upcomingTests = myTests.filter(
    (t) => t.status === "approved" || t.status === "rescheduled"
  );
  const completedTests = myTests.filter((t) => t.status === "completed");
  // Unified "Completed Appointments" list — counseling sessions and
  // psychological tests both shown together, newest first.
  const recentlyCompleted = [
    ...completedAppointments.map((a) => ({ ...a, _type: "counseling" })),
    ...completedTests.map((t) => ({ ...t, _type: "test" })),
  ].sort((x, y) => {
    const dx = new Date(x.scheduledDate || x.preferredDate || 0).getTime();
    const dy = new Date(y.scheduledDate || y.preferredDate || 0).getTime();
    return dy - dx;
  });
  // All counseling appointments that aren't finished yet — approved, rescheduled,
  // pending, follow-up, or urgent/emergency requests all carry one of these statuses.
  const notCompletedAppointments = myAppointments.filter(
    (a) => a.status !== "completed" && a.status !== "rejected"
  );

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Counselor"
        title="Upcoming appointments"
        subtitle="Scheduled counseling sessions and psychological tests"
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Pending requests"
          value={pendingAppointments.length}
          hint="Awaiting your response"
          icon={Clock3}
          accent="bg-amber-500"
        />
        <StatCard
          label="Counseling sessions"
          value={notCompletedAppointments.length}
          hint="Not yet completed"
          icon={CalendarClock}
          accent="bg-sky-500"
        />
        <StatCard
          label="Psych tests"
          value={upcomingTests.length}
          hint="Confirmed tests"
          icon={ClipboardList}
          accent="bg-blue-500"
        />
        <StatCard
          label="Completed appointments"
          value={completedAppointments.length + completedTests.length}
          hint="Sessions & tests"
          icon={CheckCircle2}
          accent="bg-gray-400"
        />
      </div>

      {/* Pending requests — student-submitted, awaiting accept/reschedule/reject */}
      <SectionCard
        className="mb-6"
        title="Pending requests"
        subtitle={`${pendingAppointments.length} awaiting your response`}
        noBodyPadding
      >
        {pendingAppointments.length === 0 ? (
          <EmptyState
            icon={Clock3}
            title="No pending requests"
            hint="New counseling requests from students will appear here for you to accept, reschedule, or decline."
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {pendingAppointments.map((a) => {
              const studentId = a.student_id || a.studentUserId;
              const requested = a.preferredDate
                ? `${formatDate(a.preferredDate)} · ${timeLabel(
                    a.timeSlot ||
                      (Array.isArray(a.preferredSlots) ? a.preferredSlots[0] : "")
                  )}`
                : "—";
              return (
                <li key={a.id} className="px-4 py-3 hover:bg-gray-50/70 transition">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => openProfile(studentId, a.studentName)}
                      className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center justify-center text-xs font-semibold flex-shrink-0 transition"
                      title="View profile"
                    >
                      {initialsOf(a.studentName)}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => openProfile(studentId, a.studentName)}
                          className="text-sm font-semibold text-gray-900 hover:underline"
                        >
                          {a.studentName}
                        </button>
                        <span className="text-xs text-gray-500">{a.college || "—"}</span>
                        <StatusPill status={a.status} />
                        {(a.is_urgent || a.isUrgent) && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle size={11} /> Urgent
                          </span>
                        )}
                        {a.controlNo && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Hash size={10} />
                            {a.controlNo}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex items-baseline gap-1.5 text-xs">
                        <span className="text-gray-500">Requested</span>
                        <span className="text-gray-700 tabular-nums">{requested}</span>
                      </div>
                      {a.reason && (
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium text-gray-600">Reason:</span> {a.reason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openChat(studentId, a.studentName)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                        title="Message"
                      >
                        <MessageCircle size={15} />
                      </button>
                      {(a.is_urgent || a.isUrgent) && (
                        <a
                          href={`/counselor/appointments/${a.id}/form`}
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-maroon-600 hover:bg-maroon-700 text-white text-xs font-medium transition"
                        >
                          <FileText size={13} />
                          Open form
                        </a>
                      )}
                      <button
                        onClick={() => handleAccept(a)}
                        disabled={busyId === a.id}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
                        title="Accept"
                      >
                        <Check size={13} /> Accept
                      </button>
                      {!(a.is_urgent || a.isUrgent) && (
                        <button
                          onClick={() =>
                            setRescheduleModal({ open: true, apptId: a.id, date: "", timeSlot: "", note: "" })
                          }
                          disabled={busyId === a.id}
                          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-100 transition disabled:opacity-50"
                          title="Reschedule"
                        >
                          <CalendarClock size={13} /> Reschedule
                        </button>
                      )}
                      <button
                        onClick={() => setRejectModal({ open: true, id: a.id, note: "" })}
                        disabled={busyId === a.id}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                        title="Reject"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* Counseling sessions */}
      <SectionCard
        className="mb-6"
        title="Counseling sessions"
        subtitle={`${upcomingAppointments.length} scheduled`}
        noBodyPadding
        action={
          <Link
            to="/"
            className="text-xs font-medium text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
          >
            Pending requests <ArrowRight size={12} />
          </Link>
        }
      >
        {upcomingAppointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming counseling sessions"
            hint="Pending appointment requests can be reviewed from the dashboard."
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcomingAppointments.map((a) => {
              const studentId = a.student_id || a.studentUserId;
              // Follow-up appointments are created with this fixed reason by
              // executeSubmitReport (StudentCounselingForm.jsx) — there's no
              // dedicated "follow-up" appointment status, so this is how we
              // tell a fresh approval apart from a scheduled follow-up.
              const isFollowup = a.status === "approved" && a.reason === "Follow-up Session";
              const displayStatus = isFollowup ? "followup" : a.status;
              const original = a.preferredDate
                ? `${formatDate(a.preferredDate)} · ${timeLabel(
                    a.timeSlot ||
                      (Array.isArray(a.preferredSlots) ? a.preferredSlots[0] : "")
                  )}`
                : "—";
              return (
                <li key={a.id} className="px-4 py-3 hover:bg-gray-50/70 transition">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => openProfile(studentId, a.studentName)}
                      className="w-9 h-9 rounded-full bg-maroon-100 text-maroon-700 hover:bg-maroon-200 flex items-center justify-center text-xs font-semibold flex-shrink-0 transition"
                      title="View profile"
                    >
                      {initialsOf(a.studentName)}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => openProfile(studentId, a.studentName)}
                          className="text-sm font-semibold text-gray-900 hover:underline"
                        >
                          {a.studentName}
                        </button>
                        <span className="text-xs text-gray-500">{a.college || "—"}</span>
<<<<<<< HEAD
                        <StatusPill
                          status={a.status === "approved" && a.reason === "Follow-up Session" ? "followup" : a.status}
                        />
=======
                        <StatusPill status={displayStatus} />
>>>>>>> proper-and-printable-counseling-form
                        {a.controlNo && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Hash size={10} />
                            {a.controlNo}
                          </span>
                        )}
                      </div>

                      <dl className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
                        <div className="flex items-baseline gap-1.5">
                          <dt className="text-gray-500">Requested</dt>
                          <dd className="text-gray-700 tabular-nums">{original}</dd>
                        </div>
                        {a.scheduledDate && (
                          <div className="flex items-baseline gap-1.5">
                            <dt className="text-gray-500">Scheduled</dt>
                            <dd className="text-gray-900 font-medium tabular-nums">
                              {formatDate(a.scheduledDate)} · {timeLabel(a.scheduledTimeSlot)}
                            </dd>
                          </div>
                        )}
                      </dl>
                      {a.note && (
                        <p className="text-xs text-gray-500 mt-1.5 italic">“{a.note}”</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openProfile(studentId, a.studentName)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                        title="View profile"
                      >
                        <User2 size={15} />
                      </button>
                      <button
                        onClick={() => openChat(studentId, a.studentName)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                        title="Message"
                      >
                        <MessageCircle size={15} />
                      </button>
                      <a
                        href={`/counselor/appointments/${a.id}/form`}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-maroon-600 hover:bg-maroon-700 text-white text-xs font-medium transition"
                      >
                        <FileText size={13} />
                        Open form
                      </a>
                      {/* Only show Mark done button when the saved session report is set to Termination */}
                      {(() => {
                        const sess = sessions?.find((s) => s.appointmentId === a.id || s.appointment_id === a.id);
                        const canMarkDone = sess && sess.nextSession === "termination";
                        return canMarkDone ? (
                          <button
                            onClick={() => handleMarkDone(a.id)}
                            disabled={busyId === a.id}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
                            title="Mark this session as completed (Termination)"
                          >
                            <CheckCircle2 size={13} />
                            {busyId === a.id ? "Saving…" : "Mark done"}
                          </button>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* Psychological tests */}
      <SectionCard
        className="mb-6"
        title="Psychological tests"
        subtitle={`${upcomingTests.length} scheduled`}
        noBodyPadding
      >
        {upcomingTests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No scheduled tests"
            hint="Pending test requests can be reviewed from the dashboard."
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcomingTests.map((t) => {
              const studentId = t.student_id || t.studentUserId;
              const original = t.preferredDate
                ? `${formatDate(t.preferredDate)} · ${
                    Array.isArray(t.preferredSlots)
                      ? t.preferredSlots.map((s) => timeLabel(s)).join(", ")
                      : "—"
                  }`
                : "—";
              return (
                <li key={t.id} className="px-4 py-3 hover:bg-gray-50/70 transition">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => openProfile(studentId, t.studentName)}
                      className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center justify-center text-xs font-semibold flex-shrink-0 transition"
                      title="View profile"
                    >
                      {initialsOf(t.studentName)}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => openProfile(studentId, t.studentName)}
                          className="text-sm font-semibold text-gray-900 hover:underline"
                        >
                          {t.studentName}
                        </button>
                        <span className="text-xs text-gray-500">{t.college || "—"}</span>
                        <StatusPill status={t.status} />
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                          <ClipboardList size={11} />
                          {t.testType || "Psychological test"}
                        </span>
                        {t.controlNo && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Hash size={10} />
                            {t.controlNo}
                          </span>
                        )}
                      </div>

                      <dl className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
                        <div className="flex items-baseline gap-1.5">
                          <dt className="text-gray-500">Requested</dt>
                          <dd className="text-gray-700 tabular-nums">{original}</dd>
                        </div>
                        {t.scheduledDate && (
                          <div className="flex items-baseline gap-1.5">
                            <dt className="text-gray-500">Scheduled</dt>
                            <dd className="text-gray-900 font-medium tabular-nums">
                              {formatDate(t.scheduledDate)} · {timeLabel(t.scheduledTimeSlot)}
                            </dd>
                          </div>
                        )}
                      </dl>
                      {(t.note || t.reason) && (
                        <div className="mt-1.5 space-y-0.5">
                          {t.reason && (
                            <p className="text-xs text-gray-500">
                              <span className="font-medium text-gray-600">Reason:</span> {t.reason}
                            </p>
                          )}
                          {t.note && (
                            <p className="text-xs text-gray-500 italic">“{t.note}”</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openProfile(studentId, t.studentName)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                        title="View profile"
                      >
                        <User2 size={15} />
                      </button>
                      <button
                        onClick={() => openChat(studentId, t.studentName)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                        title="Message"
                      >
                        <MessageCircle size={15} />
                      </button>
                      <a
                        href={`/counselor/tests/${t.id}/form`}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-maroon-600 hover:bg-maroon-700 text-white text-xs font-medium transition"
                      >
                        <FileText size={13} />
                        Open form
                      </a>
                      <button
                        onClick={() => handleMarkDone(t.id, "test")}
                        disabled={busyId === t.id}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
                        title="Mark this test as completed"
                      >
                        <CheckCircle2 size={13} />
                        {busyId === t.id ? "Saving…" : "Mark done"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {recentlyCompleted.length > 0 && (
        <SectionCard
          className="mb-6"
          title="Completed Appointments"
          subtitle={`${recentlyCompleted.length} completed appointment${
            recentlyCompleted.length === 1 ? "" : "s"
          } — counseling sessions and psychological tests.`}
          noBodyPadding
        >
          <ul className="divide-y divide-gray-100">
            {recentlyCompleted.slice(0, 10).map((item) => (
              <li key={`${item._type}-${item.id}`} className="px-4 py-3 hover:bg-gray-50/70 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {initialsOf(item.studentName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {item.studentName}
                      </span>
                      <span className="text-xs text-gray-500">{item.college || "—"}</span>
                      <StatusPill status="completed" />
                      {item._type === "test" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                          <ClipboardList size={11} />
                          {item.testType || "Psychological test"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-maroon-50 text-maroon-700 border-maroon-200">
                          <FileText size={11} />
                          Counseling
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
        </SectionCard>
      )}

      {/* Reschedule pending request */}
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

      {/* Reject pending request */}
      <Modal
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, id: null, note: "" })}
        title="Reject appointment"
        subtitle="The student will be notified. Please add a short note explaining why."
        danger
        footer={
          <>
            <button
              type="button"
              className={BTN.secondary}
              onClick={() => setRejectModal({ open: false, id: null, note: "" })}
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

      <Modal
        open={completeConfirmModal.open}
        onClose={() => setCompleteConfirmModal({ open: false, id: null, type: "counseling" })}
        title="Mark as completed"
        subtitle="Confirm session completion"
        footer={
          <>
            <button
              type="button"
              className={BTN.secondary}
              onClick={() => setCompleteConfirmModal({ open: false, id: null, type: "counseling" })}
            >
              Cancel
            </button>
            <button type="button" className={BTN.primary} onClick={submitComplete}>
              Confirm Complete
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-700 leading-relaxed">
          {completeConfirmModal.type === "test"
            ? "Mark this psychological test request as completed? You will be able to fill up the test results and release them to the student afterwards."
            : "Mark this counseling session as completed? You will be able to open the form and submit the final Session Report afterwards."}
        </p>
      </Modal>

<<<<<<< HEAD
      <Modal
        open={actionErrorModal.open}
        onClose={() => setActionErrorModal({ open: false, message: "" })}
        title="Unable to complete this action"
        danger
        footer={
          <button
            type="button"
            className={BTN.primary}
            onClick={() => setActionErrorModal({ open: false, message: "" })}
          >
            OK
          </button>
        }
      >
        <p className="text-sm text-gray-700 leading-relaxed">{actionErrorModal.message}</p>
      </Modal>

      <Modal
        open={discardConfirmModal.open}
        onClose={() => setDiscardConfirmModal({ open: false, appt: null })}
        title="Discard completed session"
        subtitle="This action cannot be undone"
        danger
        footer={
          <>
            <button
              type="button"
              className={BTN.secondary}
              onClick={() => setDiscardConfirmModal({ open: false, appt: null })}
            >
              Cancel
            </button>
            <button type="button" className={BTN.danger} onClick={submitDiscard}>
              Confirm Discard
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-700 leading-relaxed">
          Are you sure you want to discard this completed session and delete the draft report? The appointment will be reset back to approved status and returned to your active upcoming list.
        </p>
      </Modal>

=======
>>>>>>> proper-and-printable-counseling-form
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
  );
}
