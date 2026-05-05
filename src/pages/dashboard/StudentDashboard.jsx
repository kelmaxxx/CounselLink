// src/pages/dashboard/StudentDashboard.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { useTestResults } from "../../context/TestResultsContext";
import { CalendarDays, CheckCircle2, Clock3, FileText, ArrowRight, Calendar, User2, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import ProfileViewModal from "../../components/ProfileViewModal";
import ChatModal from "../../components/ChatModal";

export default function StudentDashboard() {
  const { currentUser, users } = useAuth();
  const myRecord = users?.find((u) => u.email === currentUser?.email) || currentUser;

  const { fetchAppointments } = useAppointments?.() || {};
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
    if (fetchAppointments) {
      loadAppointments();
    }
    return () => {
      mounted = false;
    };
  }, [fetchAppointments]);
  
  const { getTestsForCurrentUser } = useTests?.() || {};
  const myTests = getTestsForCurrentUser ? getTestsForCurrentUser() : [];

  const { getTestResultsForCurrentUser } = useTestResults?.() || {};
  const myTestResults = getTestResultsForCurrentUser ? getTestResultsForCurrentUser() : [];

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [expandedTestResult, setExpandedTestResult] = useState(null);

  // Compute upcoming, pending, etc.
  const upcoming = myAppointments.filter(a => a.status === 'approved' || a.status === 'rescheduled');
  const pending = myAppointments.filter(a => a.status === 'pending');
  
  const upcomingTests = myTests.filter(t => t.status === 'accepted' || t.status === 'rescheduled');
  const pendingTests = myTests.filter(t => t.status === 'pending');

  const upcomingCount = upcoming.length + upcomingTests.length;
  const completedCount = myAppointments.filter(a => a.status === 'completed' || a.status === 'approved').length;
  const pendingCount = pending.length + pendingTests.length;
  const testResultsCount = myTestResults.length;

  // Determine next item (appointment or test, earliest accepted/rescheduled by scheduledDate)
  const sortByDateTime = (a, b) => {
    const da = new Date(a.scheduledDate || a.scheduled_date || a.preferredDate || a.preferred_date || 0).getTime();
    const db = new Date(b.scheduledDate || b.scheduled_date || b.preferredDate || b.preferred_date || 0).getTime();
    return da - db;
  };

  const allUpcoming = [
    ...upcoming.map(a => ({ ...a, type: 'appointment' })),
    ...upcomingTests.map(t => ({ ...t, type: 'test' }))
  ];
  const allPending = [
    ...pending.map(a => ({ ...a, type: 'appointment' })),
    ...pendingTests.map(t => ({ ...t, type: 'test' }))
  ];

  const next = [...allUpcoming].sort(sortByDateTime)[0] || allPending[0] || null;

  const counselorName = (next && next.type === 'appointment')
    ? (next.counselorName || users?.find(u => u.id === next.counselor_id)?.name || "")
    : "";
  const nextAppt = next ? {
    title: next.type === 'test' ? `${next.testType} Request` : 'General Counseling Session',
    counselor: next.type === 'test' ? 'Counseling Office' : (counselorName || 'Assigned Counselor'),
    counselorId: next.counselor_id,
    date: next.scheduledDate || next.scheduled_date || next.preferredDate || next.preferred_date || 'TBD',
    time: next.scheduledTimeSlot || next.scheduled_time || (next.preferredSlots?.[0] || (next.preferred_slots ? next.preferred_slots.split(",")[0] : 'TBD')),
    status: next.status === 'approved' ? 'Confirmed' : (next.status === 'rescheduled' ? 'Rescheduled' : 'Pending'),
    type: next.type
  } : null;

  // Get all counselors for the "Available Counselors" section
  const counselors = users?.filter((u) => u.role === "counselor") || [];

  return (
    <div className="">
      {/* Welcome Banner */}
      <div className="bg-maroon-600 text-white px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold mb-1">Welcome back, {currentUser?.name?.split(' ')[0] || 'Student'}!</h2>
          <p className="text-maroon-100 text-sm mb-3">Your counseling journey matters. We're here to support you.</p>
          <Link to="/student/request-appointment" className="inline-flex items-center gap-2 bg-maroon-500 hover:bg-maroon-400 transition px-3 py-2 rounded-lg font-medium text-sm">
            Request Appointment <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4 relative z-0">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1 */}
          <div className="bg-white rounded-xl shadow border-l-4 border-maroon-500 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming Appointments</p>
                <div className="text-2xl font-bold text-gray-900">{upcomingCount}</div>
                <p className="text-xs text-gray-500">Next: {nextAppt ? nextAppt.date : 'None scheduled'}</p>
              </div>
              <div className="bg-maroon-100 text-maroon-600 p-2 rounded-full">
                <CalendarDays size={18} />
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl shadow border-l-4 border-maroon-500 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Sessions</p>
                <div className="text-2xl font-bold text-gray-900">{completedCount}</div>
                <p className="text-xs text-gray-500">This semester</p>
              </div>
              <div className="bg-maroon-100 text-maroon-600 p-2 rounded-full">
                <CheckCircle2 size={18} />
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl shadow border-l-4 border-maroon-500 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
                <p className="text-xs text-gray-500">All caught up!</p>
              </div>
              <div className="bg-maroon-100 text-maroon-600 p-2 rounded-full">
                <Clock3 size={18} />
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-xl shadow border-l-4 border-maroon-500 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Test Results</p>
                <div className="text-2xl font-bold text-gray-900">{testResultsCount}</div>
                <p className="text-xs text-gray-500">Available to view</p>
              </div>
              <div className="bg-maroon-100 text-maroon-600 p-2 rounded-full">
                <FileText size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Appointments</h3>
            <Link to="/student/appointments" className="text-maroon-600 hover:underline text-sm inline-flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {myAppointments.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              <p>No appointments yet.</p>
              <Link to="/student/request-appointment" className="mt-2 inline-block text-maroon-600 hover:underline">
                Request an appointment
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Time</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Counselor</th>
                  </tr>
                </thead>
                <tbody>
                  {myAppointments.slice(0, 5).map((appt) => {
                    const counselor = users?.find((u) => u.id === appt.counselor_id);
                    const statusLabel = appt.status === "approved" ? "Confirmed" : appt.status;
                    return (
                      <tr key={appt.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-700">{appt.scheduledDate || appt.preferredDate || "—"}</td>
                        <td className="py-2 px-3 text-gray-700">{appt.scheduledTimeSlot || appt.preferredSlots?.[0] || "—"}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${appt.status === "approved" ? "bg-green-100 text-green-800" : appt.status === "rescheduled" ? "bg-yellow-100 text-yellow-800" : appt.status === "rejected" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-700">{counselor?.name || "TBD"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Main two-column content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upcoming Appointment */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Appointment</h3>
                <p className="text-sm text-gray-600">Your next scheduled session</p>
              </div>
            </div>

            {nextAppt ? (
              <div className="mt-4 bg-gradient-to-br from-maroon-50 to-maroon-100 rounded-xl p-4 border border-maroon-200">
                <div className="flex items-start gap-3 mb-3">
                  {/* Clickable Counselor Avatar */}
                  {nextAppt.counselorId && (
                    <button
                      onClick={() => {
                        const counselor = users?.find(u => u.id === nextAppt.counselorId);
                        if (counselor) setSelectedProfile(counselor);
                      }}
                      className="w-12 h-12 bg-maroon-700 text-white rounded-full flex items-center justify-center font-bold hover:bg-maroon-800 transition flex-shrink-0 cursor-pointer"
                      title="View counselor profile"
                    >
                      {nextAppt.counselor?.charAt(0).toUpperCase()}
                    </button>
                  )}
                  {!nextAppt.counselorId && (
                    <div className="w-12 h-12 bg-maroon-700 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {nextAppt.counselor?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h4 className="font-bold text-maroon-900 text-lg">{nextAppt.title}</h4>
                    <p className="text-sm text-maroon-700">with {nextAppt.counselor}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-maroon-800">
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>{nextAppt.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock3 size={16} />
                    <span>{nextAppt.time}</span>
                  </div>
                </div>
                <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  nextAppt.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                  nextAppt.status === 'Rescheduled' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {nextAppt.status}
                </div>
                
                {/* Show counselor actions if appointment is accepted and counselor assigned */}
                {nextAppt.counselorId && (nextAppt.status === 'Confirmed' || nextAppt.status === 'Rescheduled') && (
                  <div className="mt-4 pt-4 border-t border-maroon-200">
                    <p className="text-xs text-maroon-700 mb-2 font-medium">Contact your counselor:</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const counselor = users?.find(u => u.id === nextAppt.counselorId);
                          if (counselor) setSelectedProfile(counselor);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-maroon-700 border border-maroon-300 rounded-lg hover:bg-maroon-50 transition text-sm font-medium"
                      >
                        <User2 size={16} />
                        View Profile
                      </button>
                      <button
                        onClick={() => {
                          const counselor = users?.find(u => u.id === nextAppt.counselorId);
                          if (counselor) setChatRecipient(counselor);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition text-sm font-medium"
                      >
                        <MessageCircle size={16} />
                        Message
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 text-center py-8 text-gray-500">
                <p>No upcoming appointments</p>
                <Link to="/student/request-appointment" className="mt-2 inline-block text-maroon-600 hover:underline">
                  Request an appointment
                </Link>
              </div>
            )}

            <div className="mt-4">
              <Link to="/student/appointments" className="text-maroon-600 hover:underline text-sm inline-flex items-center gap-1">
                View all appointments <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Right: Upcoming Test Results */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Tests</h3>
                <p className="text-sm text-gray-600">Your scheduled psychological tests</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {myTests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No upcoming tests</p>
                  <Link to="/student/request-psych-test" className="mt-2 inline-block text-maroon-600 hover:underline">
                    Request a test
                  </Link>
                </div>
              ) : (
                myTests.slice(0, 4).map((test) => {
                  const counselor = users?.find(u => u.id === test.counselorId);
                  const isAccepted = test.status === 'accepted' || test.status === 'rescheduled';
                  return (
                    <div key={test.id} className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 hover:bg-gray-100 transition">
                      <div className="flex items-start gap-3 mb-2">
                        {/* Clickable Counselor Avatar */}
                        {counselor && (
                          <button
                            onClick={() => setSelectedProfile(counselor)}
                            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold hover:bg-blue-700 transition flex-shrink-0 cursor-pointer"
                            title="View counselor profile"
                          >
                            {counselor.name?.charAt(0).toUpperCase()}
                          </button>
                        )}
                        {!counselor && (
                          <div className="w-10 h-10 bg-gray-400 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                            ?
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{test.testType}</p>
                          <p className="text-xs text-gray-600 mt-1">Date: {test.scheduledDate || test.preferredDate || 'TBD'}</p>
                          <p className="text-xs text-gray-600">
                            Status: <span className={`font-medium ${isAccepted ? 'text-green-600' : 'text-yellow-600'}`}>
                              {test.status}
                            </span>
                          </p>
                          {counselor && (
                            <p className="text-xs text-gray-500 mt-1">Counselor: {counselor.name}</p>
                          )}
                        </div>
                      </div>
                      {counselor && isAccepted && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => setSelectedProfile(counselor)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-white text-maroon-600 border border-maroon-300 rounded-lg hover:bg-maroon-50 transition font-medium"
                          >
                            <User2 size={14} />
                            Profile
                          </button>
                          <button
                            onClick={() => setChatRecipient(counselor)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition font-medium"
                          >
                            <MessageCircle size={14} />
                            Message
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Psychological Test Results - Full Width */}
        <div className="mt-6 bg-white rounded-xl shadow p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Psychological Test Results</h3>
              <p className="text-sm text-gray-600">Your latest assessment results</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myTestResults.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-8">
                <p>No test results available yet.</p>
              </div>
            ) : (
              myTestResults.slice(0, 6).map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 hover:bg-gray-100 transition">
                  <p className="font-medium text-gray-900">{r.testName}</p>
                  <p className="text-xs text-gray-600 mt-1">Completed {r.completedDate}</p>
                  <p className="text-xs text-gray-500">By {r.counselorName}</p>
                  <button 
                    onClick={() => setExpandedTestResult(expandedTestResult === r.id ? null : r.id)}
                    className="mt-2 text-maroon-600 font-medium hover:underline text-sm"
                  >
                    {expandedTestResult === r.id ? 'Hide Details' : 'View Details'}
                  </button>
                  {expandedTestResult === r.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Summary:</p>
                        <p className="text-xs text-gray-600 mt-1">{r.summary}</p>
                      </div>
                      {r.recommendations && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700">Recommendations:</p>
                          <p className="text-xs text-gray-600 mt-1">{r.recommendations}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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