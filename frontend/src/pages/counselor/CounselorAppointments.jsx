import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { User2, MessageCircle } from "lucide-react";
import ProfileViewModal from "../../components/ProfileViewModal";
import ChatModal from "../../components/ChatModal";

export default function CounselorAppointments() {
  const { currentUser, users, lookupUser } = useAuth();
  const { getAppointmentsForCurrentUser } = useAppointments();
  const { getTestsForCurrentUser } = useTests();

  const myAppointments = useMemo(() => getAppointmentsForCurrentUser(), [getAppointmentsForCurrentUser]);
  const myTests = useMemo(() => getTestsForCurrentUser(), [getTestsForCurrentUser]);

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);

  const openProfile = async (id, fallbackName) => {
    if (!id) return;
    const cached = users?.find(u => u.id === id);
    if (cached) { setSelectedProfile(cached); return; }
    const fetched = await lookupUser?.(id);
    if (fetched) setSelectedProfile(fetched);
    else if (fallbackName) setSelectedProfile({ id, name: fallbackName });
  };

  const openChat = async (id, fallbackName) => {
    if (!id) return;
    const cached = users?.find(u => u.id === id);
    if (cached) { setChatRecipient(cached); return; }
    const fetched = await lookupUser?.(id);
    if (fetched) setChatRecipient(fetched);
    else if (fallbackName) setChatRecipient({ id, name: fallbackName });
  };

  const timeLabel = (slot) => {
    const map = {
      "9:00-10:00": "9:00 - 10:00 AM",
      "10:00-11:00": "10:00 - 11:00 AM",
      "11:00-12:00": "11:00 - 12:00 PM",
      "1:00-2:00": "1:00 - 2:00 PM",
      "2:00-3:00": "2:00 - 3:00 PM",
      "3:00-4:00": "3:00 - 4:00 PM",
    };
    return map[slot] || slot;
  };

  // Filter only approved/rescheduled appointments (DB uses 'approved')
  const upcomingAppointments = myAppointments.filter(a => a.status === 'approved' || a.status === 'rescheduled');
  const upcomingTests = myTests.filter(t => t.status === 'approved' || t.status === 'rescheduled');

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">My Upcoming Appointments</h2>

      {/* Appointments Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Scheduled Counseling Sessions</h3>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow space-y-3">
          {upcomingAppointments.length === 0 && (
            <p className="text-gray-600">No upcoming appointments. Check your dashboard for pending requests.</p>
          )}

          {upcomingAppointments.map((a) => {
            const studentId = a.student_id || a.studentUserId;
            return (
              <div key={a.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{a.studentName} ({a.college || "N/A"})</p>
                    <p className="text-sm text-gray-600">
                      Originally Requested: {a.preferredDate} at {timeLabel(a.timeSlot || (Array.isArray(a.preferredSlots) ? a.preferredSlots[0] : ''))}
                    </p>
                    {a.scheduledDate && (
                      <p className="text-sm font-medium text-gray-700 mt-1">
                        📅 Scheduled: {a.scheduledDate} at {timeLabel(a.scheduledTimeSlot)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {a.status === 'approved' ? 'Confirmed' : a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                      <p className="text-xs text-gray-400">Control #: {a.controlNo}</p>
                    </div>
                    {a.note && <p className="text-xs text-gray-500 mt-1">Note: {a.note}</p>}
                  </div>
                  <a href={`/counselor/appointments/${a.id}/form`} className="px-4 py-2 bg-maroon-600 text-white rounded hover:bg-maroon-700 inline-block whitespace-nowrap">Open Counseling Form</a>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => openProfile(studentId, a.studentName)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white text-maroon-600 border border-maroon-300 rounded-lg hover:bg-maroon-50 transition font-medium"
                  >
                    <User2 size={14} />
                    View Profile
                  </button>
                  <button
                    onClick={() => openChat(studentId, a.studentName)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition font-medium"
                  >
                    <MessageCircle size={14} />
                    Message Student
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Psychological Test Requests Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Scheduled Psychological Tests</h3>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow space-y-3">
          {upcomingTests.length === 0 && (
            <p className="text-gray-600">No scheduled tests. Check your dashboard for pending requests.</p>
          )}

          {upcomingTests.map((t) => {
            const studentId = t.student_id || t.studentUserId;
            return (
              <div key={t.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{t.studentName} ({t.college || "N/A"})</p>
                    <p className="text-sm text-gray-600">Test Type: {t.testType}</p>
                    <p className="text-sm text-gray-600">
                      Originally Requested: {t.preferredDate} at {Array.isArray(t.preferredSlots) ? t.preferredSlots.map(s => timeLabel(s)).join(', ') : 'N/A'}
                    </p>
                    {t.scheduledDate && (
                      <p className="text-sm font-medium text-gray-700 mt-1">
                        📅 Scheduled: {t.scheduledDate} at {timeLabel(t.scheduledTimeSlot)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {t.status === 'approved' ? 'Confirmed' : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                      <p className="text-xs text-gray-400">Control #: {t.controlNo}</p>
                    </div>
                    {t.note && <p className="text-xs text-gray-500 mt-1">Note: {t.note}</p>}
                    {t.reason && <p className="text-xs text-gray-500">Reason: {t.reason}</p>}
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-blue-200">
                  <button
                    onClick={() => openProfile(studentId, t.studentName)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white text-maroon-600 border border-maroon-300 rounded-lg hover:bg-maroon-50 transition font-medium"
                  >
                    <User2 size={14} />
                    View Profile
                  </button>
                  <button
                    onClick={() => openChat(studentId, t.studentName)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition font-medium"
                  >
                    <MessageCircle size={14} />
                    Message Student
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
        <ChatModal
          recipientUser={chatRecipient}
          onClose={() => setChatRecipient(null)}
        />
      )}
    </div>
  );
}
