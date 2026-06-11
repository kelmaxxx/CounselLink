import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
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
  const { getTestsForCurrentUser } = useTests();
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

  const handleMarkDone = async (id) => {
    if (!window.confirm("Mark this counseling session as completed? You will be able to open the form and submit the final Session Report afterwards.")) return;
    setBusyId(id);
    const res = await completeAppointment({ id });
    setBusyId(null);
    if (!res.success) alert(res.message || "Failed to mark as done");
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
  const completedAppointments = myAppointments.filter((a) => a.status === "completed");
  const upcomingTests = myTests.filter(
    (t) => t.status === "approved" || t.status === "rescheduled"
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
          label="Psych tests"
          value={upcomingTests.length}
          hint="Confirmed tests"
          icon={ClipboardList}
          accent="bg-blue-500"
        />
        <StatCard
          label="Rescheduled"
          value={
            upcomingAppointments.filter((a) => a.status === "rescheduled").length +
            upcomingTests.filter((t) => t.status === "rescheduled").length
          }
          hint="Across both queues"
          icon={CalendarClock}
          accent="bg-sky-500"
        />
        <StatCard
          label="Total upcoming"
          value={upcomingAppointments.length + upcomingTests.length}
          hint="All schedules"
          icon={FileText}
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
                ? `${a.preferredDate} · ${timeLabel(
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
                      <button
                        onClick={() => handleAccept(a)}
                        disabled={busyId === a.id}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
                        title="Accept"
                      >
                        <Check size={13} /> Accept
                      </button>
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
              const original = a.preferredDate
                ? `${a.preferredDate} · ${timeLabel(
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
                        <StatusPill status={a.status} />
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
                              {a.scheduledDate} · {timeLabel(a.scheduledTimeSlot)}
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
                      <button
                        onClick={() => handleMarkDone(a.id)}
                        disabled={busyId === a.id}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
                        title="Mark this session as completed"
                      >
                        <CheckCircle2 size={13} />
                        {busyId === a.id ? "Saving…" : "Mark done"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {completedAppointments.length > 0 && (
        <SectionCard
          className="mb-6"
          title="Recently completed"
          subtitle={`${completedAppointments.length} session${
            completedAppointments.length === 1 ? "" : "s"
          } — finalize the Session Report to deliver it to the referring College Representative.`}
          noBodyPadding
        >
          <ul className="divide-y divide-gray-100">
            {completedAppointments.slice(0, 10).map((a) => (
              <li key={a.id} className="px-4 py-3 hover:bg-gray-50/70 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {initialsOf(a.studentName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {a.studentName}
                      </span>
                      <span className="text-xs text-gray-500">{a.college || "—"}</span>
                      <StatusPill status="completed" />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                      {a.scheduledDate || a.preferredDate || "—"}
                      {a.scheduledTimeSlot ? ` · ${timeLabel(a.scheduledTimeSlot)}` : ""}
                    </p>
                  </div>
                  <a
                    href={`/counselor/appointments/${a.id}/form`}
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-maroon-600 hover:bg-maroon-700 text-white text-xs font-medium transition"
                  >
                    <FileText size={13} /> Submit Report
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Psychological tests */}
      <SectionCard
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
                ? `${t.preferredDate} · ${
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
                              {t.scheduledDate} · {timeLabel(t.scheduledTimeSlot)}
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
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

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
