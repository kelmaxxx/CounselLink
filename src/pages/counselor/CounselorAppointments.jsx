import React, { useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";

export default function CounselorAppointments() {
  const { currentUser } = useAuth();
  const { getAppointmentsForCurrentUser } = useAppointments();
  const { getTestsForCurrentUser } = useTests();
  
  const myAppointments = useMemo(() => getAppointmentsForCurrentUser(), [getAppointmentsForCurrentUser]);
  const myTests = useMemo(() => getTestsForCurrentUser(), [getTestsForCurrentUser]);

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

  // Filter only accepted/rescheduled appointments
  const upcomingAppointments = myAppointments.filter(a => a.status === 'accepted' || a.status === 'rescheduled');

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

          {upcomingAppointments.map((a) => (
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
                  <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </span>
                  <p className="text-xs text-gray-400">Control #: {a.controlNo}</p>
                </div>
                {a.note && <p className="text-xs text-gray-500 mt-1">Note: {a.note}</p>}
              </div>
              <div className="space-x-2">
                <a href={`/counselor/appointments/${a.id}/form`} className="px-4 py-2 bg-maroon-600 text-white rounded hover:bg-maroon-700 inline-block">Open Counseling Form</a>
              </div>
            </div>
          </div>
          ))}
        </div>
      </div>

      {/* Psychological Test Requests Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Scheduled Psychological Tests</h3>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow space-y-3">
          {myTests.filter(t => t.status === 'accepted' || t.status === 'rescheduled').length === 0 && (
            <p className="text-gray-600">No scheduled tests. Check your dashboard for pending requests.</p>
          )}

          {myTests.filter(t => t.status === 'accepted' || t.status === 'rescheduled').map((t) => (
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
                    <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                    <p className="text-xs text-gray-400">Control #: {t.controlNo}</p>
                  </div>
                  {t.note && <p className="text-xs text-gray-500 mt-1">Note: {t.note}</p>}
                  {t.reason && <p className="text-xs text-gray-500">Reason: {t.reason}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}