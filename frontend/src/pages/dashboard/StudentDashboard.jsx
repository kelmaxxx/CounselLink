// src/pages/dashboard/StudentDashboard.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { useTestResults } from "../../context/TestResultsContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  ArrowRight,
  Calendar,
  User2,
  MessageCircle,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import ProfileViewModal from "../../components/ProfileViewModal";
import WelcomeHero from "../../components/WelcomeHero";
import ChatModal from "../../components/ChatModal";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
  StatusPill,
  BTN,
  initialsOf,
  formatDate,
} from "../../components/ui";

export default function StudentDashboard() {
  const { currentUser, users, lookupUser } = useAuth();
  const { fetchAppointments } = useAppointments?.() || {};
  const { getTestsForCurrentUser } = useTests?.() || {};
  const { getTestResultsForCurrentUser } = useTestResults?.() || {};
  const { sessions } = useCounselingSessions?.() || {};

  const [myAppointments, setMyAppointments] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [expandedTestResult, setExpandedTestResult] = useState(null);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchAppointments();
        if (mounted) setMyAppointments(data);
      } catch (err) {
        console.error(err);
      }
    };
    if (fetchAppointments) load();
    return () => {
      mounted = false;
    };
  }, [fetchAppointments]);

  const myTests = getTestsForCurrentUser ? getTestsForCurrentUser() : [];
  const myTestResults = getTestResultsForCurrentUser ? getTestResultsForCurrentUser() : [];

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

  const upcoming = myAppointments.filter((a) => a.status === "approved" || a.status === "rescheduled");
  const pending = myAppointments.filter((a) => a.status === "pending");
  const recentAppointments = myAppointments.filter((a) => a.status === "completed");
  const upcomingTests = myTests.filter((t) => t.status === "approved" || t.status === "rescheduled");
  const pendingTests = myTests.filter((t) => t.status === "pending");

  const upcomingCount = upcoming.length + upcomingTests.length;
  
  const getSessionForAppt = (apptId) =>
    sessions?.find((s) => s.appointmentId === apptId || s.appointment_id === apptId);

  const completedSessions = myAppointments.filter((a) => {
    if (a.status !== "completed") return false;
    const s = getSessionForAppt(a.id);
    return s && s.nextSession === "termination";
  });
  const completedCount = completedSessions.length;

  const pendingCount = pending.length + pendingTests.length;
  const testResultsCount = myTestResults.length;

  const unfinishedTests = myTests.filter(
    (t) => t.status !== "completed" && t.status !== "rejected"
  );

  const sortByDateTime = (a, b) => {
    const da = new Date(
      a.scheduledDate || a.scheduled_date || a.preferredDate || a.preferred_date || 0
    ).getTime();
    const db = new Date(
      b.scheduledDate || b.scheduled_date || b.preferredDate || b.preferred_date || 0
    ).getTime();
    return da - db;
  };

  const allUpcoming = [
    ...upcoming.map((a) => ({ ...a, type: "appointment" })),
    ...upcomingTests.map((t) => ({ ...t, type: "test" })),
  ];
  const allPending = [
    ...pending.map((a) => ({ ...a, type: "appointment" })),
    ...pendingTests.map((t) => ({ ...t, type: "test" })),
  ];

  const next = [...allUpcoming].sort(sortByDateTime)[0] || allPending[0] || null;
  const counselorName =
    next && next.type === "appointment"
      ? next.counselorName || users?.find((u) => u.id === next.counselor_id)?.name || ""
      : "";
  const nextAppt = next
    ? {
        title:
          next.type === "test"
            ? `${next.testType} request`
            : "General counseling session",
        counselor:
          next.type === "test" ? "Counseling Office" : counselorName || "Assigned counselor",
        counselorId: next.counselor_id,
        date: formatDate(
          next.scheduledDate ||
            next.scheduled_date ||
            next.preferredDate ||
            next.preferred_date,
          "TBD"
        ),
        time:
          next.scheduledTimeSlot ||
          next.scheduled_time ||
          next.preferredSlots?.[0] ||
          (next.preferred_slots ? next.preferred_slots.split(",")[0] : "TBD"),
        status: next.status,
        type: next.type,
      }
    : null;

  const firstName = currentUser?.name?.split(" ")[0] || "Student";
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
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${firstName}`}
        subtitle={`${dateLabel} · ${upcomingCount} upcoming · ${pendingCount} pending`}
        actions={
          <Link to="/student/request-appointment" className={BTN.primary}>
            Request appointment
            <ArrowRight size={14} />
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Upcoming"
          value={upcomingCount}
          hint={nextAppt ? `Next: ${nextAppt.date}` : "None scheduled"}
          icon={CalendarDays}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Completed sessions"
          value={completedCount}
          hint="This semester"
          icon={CheckCircle2}
          accent="bg-blue-500"
        />
        <StatCard
          label="Pending requests"
          value={pendingCount}
          hint={pendingCount === 0 ? "All caught up" : "Awaiting decision"}
          icon={Clock3}
          accent="bg-amber-500"
        />
        <StatCard
          label="Test results"
          value={testResultsCount}
          hint="Available to view"
          icon={FileText}
          accent="bg-gray-400"
        />
      </div>

      {/* Next session hero */}
      <SectionCard
        className="mb-6"
        title="Next session"
        subtitle="Your closest scheduled item"
        action={
          <Link
            to="/student/appointments"
            className="text-xs font-medium text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
          >
            View all <ArrowRight size={12} />
          </Link>
        }
      >
        {nextAppt ? (
          <div className="flex items-start gap-4">
            {nextAppt.counselorId ? (
              <button
                onClick={() => openProfile(nextAppt.counselorId, nextAppt.counselor)}
                className="w-12 h-12 bg-maroon-100 text-maroon-700 hover:bg-maroon-200 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition"
                title="View counselor"
              >
                {initialsOf(nextAppt.counselor)}
              </button>
            ) : (
              <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {initialsOf(nextAppt.counselor) || "?"}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-semibold text-gray-900">{nextAppt.title}</h4>
                <StatusPill status={nextAppt.status} />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">with {nextAppt.counselor}</p>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-700">
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Calendar size={14} className="text-gray-400" />
                  {nextAppt.date}
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Clock3 size={14} className="text-gray-400" />
                  {nextAppt.time}
                </span>
              </div>
            </div>

            {nextAppt.counselorId &&
              (nextAppt.status === "approved" || nextAppt.status === "rescheduled") && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openProfile(nextAppt.counselorId, nextAppt.counselor)}
                    className={BTN.secondary}
                  >
                    <User2 size={14} />
                    Profile
                  </button>
                  <button
                    onClick={() => openChat(nextAppt.counselorId, nextAppt.counselor)}
                    className={BTN.primary}
                  >
                    <MessageCircle size={14} />
                    Message
                  </button>
                </div>
              )}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No upcoming session"
            hint="When you request and confirm an appointment, it'll appear here."
            action={
              <Link to="/student/request-appointment" className={BTN.primary}>
                Request appointment
              </Link>
            }
          />
        )}
      </SectionCard>

      {/* Two columns: recent appointments + upcoming tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard
          title="Recent appointments"
          subtitle="Your latest counseling activity"
          noBodyPadding
          action={
            <Link
              to="/student/appointments"
              className="text-xs font-medium text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          }
        >
          {recentAppointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointments yet"
              hint="Conducted and follow-up sessions will show up here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Counselor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentAppointments.slice(0, 5).map((appt) => {
                    const session = getSessionForAppt(appt.id);
                    const isDone = appt.status === "completed";
                    const counselor = users?.find((u) => u.id === appt.counselor_id);
                    const counselorDisplay = isDone ? counselor?.name || session?.counselorName || "TBD" : "TBD";

                    let statusDisplay = <StatusPill status={appt.status} />;
                    if (isDone && session) {
                      const isFollowUp = session.nextSession === "followup";
                      statusDisplay = (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
                            isFollowUp ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isFollowUp ? "Follow-up needed" : "Completed"}
                        </span>
                      );
                    }

                    return (
                      <tr key={appt.id} className="hover:bg-gray-50/70 transition">
                        <td className="px-4 py-2.5 text-gray-900 tabular-nums">
                          {formatDate(appt.scheduledDate || appt.preferredDate)}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 tabular-nums">
                          {appt.scheduledTimeSlot || appt.preferredSlots?.[0] || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {statusDisplay}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{counselorDisplay}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming tests"
          subtitle="Psychological tests you've requested"
          noBodyPadding
          action={
            <Link
              to="/student/request-appointment"
              className="text-xs font-medium text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
            >
              Request test <ArrowRight size={12} />
            </Link>
          }
        >
          {unfinishedTests.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No tests yet"
              hint="Request a psychological assessment when you're ready."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Counselor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unfinishedTests.slice(0, 5).map((test) => {
                    const counselorId = test.counselor_id || test.counselorId;
                    const cName =
                      test.counselorName ||
                      users?.find((u) => u.id === counselorId)?.name;
                    const dateVal = test.scheduledDate || test.scheduled_date || test.preferredDate || test.preferred_date;
                    const timeVal =
                      test.scheduledTimeSlot ||
                      test.scheduled_time ||
                      (Array.isArray(test.preferredSlots) ? test.preferredSlots[0] : null) ||
                      (test.preferred_slots ? test.preferred_slots.split(",")[0] : null);
                    return (
                      <tr key={test.id} className="hover:bg-gray-50/70 transition">
                        <td className="px-4 py-2.5 text-gray-900 tabular-nums">
                          {formatDate(dateVal, "TBD")}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 tabular-nums">
                          {timeVal || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusPill status={test.status} />
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">
                          {cName || "TBD"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Test results */}
      <SectionCard
        title="Psychological test results"
        subtitle="Your latest assessment results"
        noBodyPadding
      >
        {myTestResults.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No results available yet"
            hint="Once your counselor sends results, they'll appear here."
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {myTestResults.slice(0, 6).map((r) => {
              const open = expandedTestResult === r.id;
              return (
                <li key={r.id} className="px-4 py-3 hover:bg-gray-50/70 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.testName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                        Completed {r.completedDate}
                        {r.counselorName ? ` · by ${r.counselorName}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedTestResult(open ? null : r.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-maroon-600 hover:text-maroon-700 transition"
                    >
                      {open ? "Hide" : "View"}
                      {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                  {open && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                          Summary
                        </p>
                        <p className="text-gray-700 leading-relaxed">{r.summary}</p>
                      </div>
                      {r.recommendations && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                            Recommendations
                          </p>
                          <p className="text-gray-700 leading-relaxed">{r.recommendations}</p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

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
