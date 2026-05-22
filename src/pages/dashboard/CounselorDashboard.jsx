// src/pages/dashboard/CounselorDashboard.jsx
import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { COLLEGES } from "../../data/mockData";
import { Users, Calendar, Clock3, FileText, ArrowRight, CheckCircle2, X, User2, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import ProfileViewModal from "../../components/ProfileViewModal";
import ChatModal from "../../components/ChatModal";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLLEGE_COLORS = ["#7f1d1d", "#1d4ed8", "#15803d", "#c2410c", "#7e22ce", "#0e7490", "#9f1239"];
const STATUS_COLORS = {
  pending: "#f59e0b",
  approved: "#16a34a",
  rescheduled: "#0ea5e9",
  rejected: "#dc2626",
  completed: "#065f46",
};

export default function CounselorDashboard() {
  const { currentUser, users, lookupUser } = useAuth();
  const { getAppointmentsForCurrentUser, fetchAppointments, acceptAppointment, rescheduleAppointment, rejectAppointment } = useAppointments?.() || {};
  const { getTestsForCurrentUser, acceptTest, rescheduleTest, rejectTest } = useTests?.() || {};

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
  const myTests = getTestsForCurrentUser ? getTestsForCurrentUser() : [];
  
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, apptId: null, date: "", timeSlot: "", note: "" });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, kind: null, id: null, note: "" });
  
  const students = users?.filter((u) => u.role === "student") || [];

  const studentsByCollege = useMemo(() => {
    return COLLEGES.reduce((acc, col) => {
      acc[col] = students.filter((s) => s.college === col).length;
      return acc;
    }, {});
  }, [students]);

  // Calculate stats (DB stores status as 'approved')
  const totalStudents = students.length;
  const pendingAppointments = myAppointments.filter(a => a.status === 'pending');
  const pendingTests = myTests.filter(t => t.status === 'pending');
  const todayAppointments = myAppointments.filter(a => a.status === 'approved' || a.status === 'rescheduled').length;
  const completedCases = myTests.filter(t => t.status === 'approved' || t.status === 'completed').length + myAppointments.filter(a => a.status === 'approved' || a.status === 'completed').length;
  const reportsGenerated = 0;

  const [rescheduleTestModal, setRescheduleTestModal] = useState({ open: false, testId: null, date: "", timeSlot: "", note: "" });

  // Get top colleges with most students
  const topColleges = Object.entries(studentsByCollege)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const appointmentStatusBreakdown = useMemo(() => {
    const counts = myAppointments.reduce((acc, a) => {
      const key = a.status || "pending";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [myAppointments]);

  // Handlers for appointment actions
  const handleAccept = async (id) => {
    const appt = myAppointments.find(a => a.id === id);
    const slot = appt.preferredTime || appt.preferred_time || appt.preferredSlots?.[0] || (appt.preferred_slots ? appt.preferred_slots.split(",")[0] : null);
    const result = await acceptAppointment({ id, date: appt.preferredDate || appt.preferred_date, timeSlot: slot, note: null });
    if (result.success) {
      setMyAppointments((prev) => prev.map((a) => a.id === id
        ? { ...a, status: "approved", scheduledDate: appt.preferredDate || appt.preferred_date, scheduledTimeSlot: slot }
        : a));
    } else {
      alert(result.message || "Failed to accept appointment");
    }
  };

  const openRejectModal = (kind, id) => {
    setRejectModal({ open: true, kind, id, note: "" });
  };

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

  const openReschedule = (id) => {
    setRescheduleModal({ open: true, apptId: id, date: "", timeSlot: "", note: "" });
  };

  const submitReschedule = async () => {
    if (!rescheduleModal.date || !rescheduleModal.timeSlot) {
      alert("Select date and time");
      return;
    }
    const result = await rescheduleAppointment({ id: rescheduleModal.apptId, date: rescheduleModal.date, timeSlot: rescheduleModal.timeSlot, note: rescheduleModal.note });
    if (result.success) {
      setMyAppointments((prev) => prev.map((a) => a.id === rescheduleModal.apptId
        ? { ...a, status: "rescheduled", scheduledDate: rescheduleModal.date, scheduledTimeSlot: rescheduleModal.timeSlot, note: rescheduleModal.note }
        : a));
      setRescheduleModal({ open: false, apptId: null, date: "", timeSlot: "", note: "" });
    } else {
      alert(result.message || "Failed to reschedule appointment");
    }
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

  // Test handlers
  const handleAcceptTest = async (id) => {
    const test = myTests.find(t => t.id === id);
    const slot = Array.isArray(test.preferredSlots) ? test.preferredSlots[0] : null;
    const result = await acceptTest({ id, date: test.preferredDate, timeSlot: slot, note: null });
    if (!result?.success) {
      alert(result?.message || "Failed to accept test request");
    }
  };

  const handleRejectTest = (id) => openRejectModal("test", id);

  const recentlyRejected = useMemo(
    () => myAppointments.filter((a) => a.status === "rejected").slice(0, 5),
    [myAppointments]
  );

  const openRescheduleTest = (id) => {
    setRescheduleTestModal({ open: true, testId: id, date: "", timeSlot: "", note: "" });
  };

  const submitRescheduleTest = async () => {
    if (!rescheduleTestModal.date || !rescheduleTestModal.timeSlot) {
      alert("Select date and time");
      return;
    }
    const result = await rescheduleTest({ id: rescheduleTestModal.testId, date: rescheduleTestModal.date, timeSlot: rescheduleTestModal.timeSlot, note: rescheduleTestModal.note });
    if (!result?.success) {
      alert(result?.message || "Failed to reschedule test request");
      return;
    }
    setRescheduleTestModal({ open: false, testId: null, date: "", timeSlot: "", note: "" });
  };

  return (
    <div className="">
      {/* Welcome Banner */}
      <div className="bg-maroon-600 text-white px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold mb-1">Good morning, {currentUser?.name?.split(' ')[0] || 'Counselor'}!</h2>
          <p className="text-maroon-100 text-sm mb-3">Here's what's happening with your caseload today.</p>
          <Link to="/counselor/appointments" className="inline-flex items-center gap-2 bg-maroon-500 hover:bg-maroon-400 transition px-3 py-2 rounded-lg font-medium text-sm">
            View All Appointments <ArrowRight size={16} />
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
                <p className="text-sm text-gray-600">Total Students</p>
                <div className="text-2xl font-bold text-gray-900">{totalStudents}</div>
                <p className="text-xs text-gray-500">Active caseload</p>
              </div>
              <div className="bg-maroon-100 text-maroon-600 p-2 rounded-full">
                <Users size={18} />
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl shadow border-l-4 border-maroon-500 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Appointments</p>
                <div className="text-2xl font-bold text-gray-900">{todayAppointments}</div>
                <p className="text-xs text-gray-500">{pendingAppointments.length} pending</p>
              </div>
              <div className="bg-maroon-100 text-maroon-600 p-2 rounded-full">
                <Calendar size={18} />
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl shadow border-l-4 border-maroon-500 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <div className="text-2xl font-bold text-gray-900">{pendingAppointments.length + pendingTests.length}</div>
                <p className="text-xs text-gray-500">Awaiting response</p>
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
                <p className="text-sm text-gray-600">Reports Generated</p>
                <div className="text-2xl font-bold text-gray-900">{reportsGenerated}</div>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <div className="bg-maroon-100 text-maroon-600 p-2 rounded-full">
                <FileText size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Pending Requests Section - Full Width */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Pending Appointment Requests */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pending Appointment Requests</h3>
                <p className="text-sm text-gray-600">{pendingAppointments.length} pending</p>
              </div>
            </div>

            {pendingAppointments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No pending appointment requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAppointments.slice(0, 3).map((appt) => {
                  const studentId = appt.student_id || appt.studentUserId;
                  return (
                    <div key={appt.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex items-start gap-3 mb-3">
                        <button
                          onClick={() => openProfile(studentId, appt.studentName)}
                          className="w-10 h-10 bg-maroon-600 text-white rounded-full flex items-center justify-center font-semibold hover:bg-maroon-700 transition flex-shrink-0 cursor-pointer"
                          title="View student profile"
                        >
                          {appt.studentName?.charAt(0).toUpperCase()}
                        </button>

                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{appt.studentName}</p>
                          <p className="text-sm text-gray-600">{appt.college || 'N/A'} • General Counseling</p>
                          <p className="text-xs text-gray-500 mt-1">{appt.preferredDate} at {Array.isArray(appt.preferredSlots) ? appt.preferredSlots[0] : appt.timeSlot || "—"}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mb-3 pb-3 border-b border-gray-200">
                        <button
                          onClick={() => openProfile(studentId, appt.studentName)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-white text-maroon-600 border border-maroon-300 rounded-lg hover:bg-maroon-50 transition font-medium"
                        >
                          <User2 size={14} />
                          View Profile
                        </button>
                        <button
                          onClick={() => openChat(studentId, appt.studentName)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition font-medium"
                        >
                          <MessageCircle size={14} />
                          Message
                        </button>
                      </div>
                      
                      {/* Appointment Actions */}
                      <div className="flex gap-2">
                        <button onClick={() => handleAccept(appt.id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">Accept</button>
                        <button onClick={() => openReschedule(appt.id)} className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-100">Reschedule</button>
                        <button onClick={() => handleReject(appt.id)} className="px-3 py-1 text-red-600 text-xs hover:bg-red-50 rounded">Reject</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pendingAppointments.length > 3 && (
              <div className="mt-4 text-center">
                <Link to="/counselor/appointments" className="text-maroon-600 hover:underline text-sm inline-flex items-center gap-1">
                  View all requests <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>

          {/* Right: Pending Test Requests */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pending Test Requests</h3>
                <p className="text-sm text-gray-600">{pendingTests.length} pending</p>
              </div>
            </div>

            {pendingTests.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No pending test requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTests.slice(0, 3).map((test) => {
                  const studentId = test.student_id || test.studentUserId;
                  return (
                    <div key={test.id} className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                      <div className="flex items-start gap-3 mb-3">
                        <button
                          onClick={() => openProfile(studentId, test.studentName)}
                          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold hover:bg-blue-700 transition flex-shrink-0 cursor-pointer"
                          title="View student profile"
                        >
                          {test.studentName?.charAt(0).toUpperCase()}
                        </button>

                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{test.studentName}</p>
                          <p className="text-sm text-gray-600">{test.college || 'N/A'} • {test.testType || 'Psychological Test'}</p>
                          <p className="text-xs text-gray-500 mt-1">{test.preferredDate} at {Array.isArray(test.preferredSlots) ? test.preferredSlots[0] : 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mb-3 pb-3 border-b border-blue-200">
                        <button
                          onClick={() => openProfile(studentId, test.studentName)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-white text-maroon-600 border border-maroon-300 rounded-lg hover:bg-maroon-50 transition font-medium"
                        >
                          <User2 size={14} />
                          View Profile
                        </button>
                        <button
                          onClick={() => openChat(studentId, test.studentName)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition font-medium"
                        >
                          <MessageCircle size={14} />
                          Message
                        </button>
                      </div>
                      
                      {/* Test Actions */}
                      <div className="flex gap-2">
                        <button onClick={() => handleAcceptTest(test.id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 whitespace-nowrap">Accept</button>
                        <button onClick={() => openRescheduleTest(test.id)} className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-100 whitespace-nowrap">Reschedule</button>
                        <button onClick={() => handleRejectTest(test.id)} className="px-3 py-1 text-red-600 text-xs hover:bg-red-50 rounded whitespace-nowrap">Reject</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pendingTests.length > 3 && (
              <div className="mt-4 text-center">
                <Link to="/counselor/appointments" className="text-maroon-600 hover:underline text-sm inline-flex items-center gap-1">
                  View all test requests <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Charts - Two pies side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Students by College</h3>
            <p className="text-sm text-gray-600 mb-3">Distribution of your caseload</p>
            {topColleges.filter(([, c]) => c > 0).length === 0 ? (
              <p className="text-sm text-gray-500">No students yet.</p>
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={topColleges.filter(([, c]) => c > 0).map(([name, value]) => ({ name, value }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                    >
                      {topColleges.filter(([, c]) => c > 0).map((_, i) => (
                        <Cell key={i} fill={COLLEGE_COLORS[i % COLLEGE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-sm text-gray-700 mt-2">
              Total Students: <span className="font-bold text-gray-900">{totalStudents}</span>
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Appointment Status Breakdown</h3>
            <p className="text-sm text-gray-600 mb-3">Your appointments grouped by current status</p>
            {appointmentStatusBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No appointments yet.</p>
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={appointmentStatusBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {appointmentStatusBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase()] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {recentlyRejected.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recently Rejected</h3>
            <ul className="divide-y divide-gray-100">
              {recentlyRejected.map((a) => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.studentName}</p>
                    <p className="text-xs text-gray-500">{a.preferredDate || a.scheduledDate || "—"}</p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700"
                    title={a.counselor_action_note || "No note provided"}
                  >
                    Rejected
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reschedule Appointment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={rescheduleModal.date} onChange={(e) => setRescheduleModal(s => ({ ...s, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Time Slot</label>
                <select className="w-full border rounded px-3 py-2" value={rescheduleModal.timeSlot} onChange={(e) => setRescheduleModal(s => ({ ...s, timeSlot: e.target.value }))}>
                  <option value="">Select a slot</option>
                  <option value="9:00-10:00">9:00 - 10:00 AM</option>
                  <option value="10:00-11:00">10:00 - 11:00 AM</option>
                  <option value="11:00-12:00">11:00 - 12:00 PM</option>
                  <option value="1:00-2:00">1:00 - 2:00 PM</option>
                  <option value="2:00-3:00">2:00 - 3:00 PM</option>
                  <option value="3:00-4:00">3:00 - 4:00 PM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <textarea rows={3} className="w-full border rounded px-3 py-2" value={rescheduleModal.note} onChange={(e) => setRescheduleModal(s => ({ ...s, note: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => setRescheduleModal({ open: false, apptId: null, date: "", timeSlot: "", note: "" })}>Cancel</button>
              <button className="px-3 py-2 bg-maroon-600 text-white rounded hover:bg-maroon-700" onClick={submitReschedule}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Test Modal */}
      {rescheduleTestModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reschedule Test</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={rescheduleTestModal.date} onChange={(e) => setRescheduleTestModal(s => ({ ...s, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Time Slot</label>
                <select className="w-full border rounded px-3 py-2" value={rescheduleTestModal.timeSlot} onChange={(e) => setRescheduleTestModal(s => ({ ...s, timeSlot: e.target.value }))}>
                  <option value="">Select a slot</option>
                  <option value="9:00-10:00">9:00 - 10:00 AM</option>
                  <option value="10:00-11:00">10:00 - 11:00 AM</option>
                  <option value="11:00-12:00">11:00 - 12:00 PM</option>
                  <option value="1:00-2:00">1:00 - 2:00 PM</option>
                  <option value="2:00-3:00">2:00 - 3:00 PM</option>
                  <option value="3:00-4:00">3:00 - 4:00 PM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <textarea rows={3} className="w-full border rounded px-3 py-2" value={rescheduleTestModal.note} onChange={(e) => setRescheduleTestModal(s => ({ ...s, note: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => setRescheduleTestModal({ open: false, testId: null, date: "", timeSlot: "", note: "" })}>Cancel</button>
              <button className="px-3 py-2 bg-maroon-600 text-white rounded hover:bg-maroon-700" onClick={submitRescheduleTest}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-1 text-red-700">
              Reject {rejectModal.kind === "test" ? "Test Request" : "Appointment"}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              The student will be notified. Please leave a short note explaining why.
            </p>
            <textarea
              rows={4}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-maroon-500"
              placeholder="e.g. Schedule conflict — please request another slot."
              value={rejectModal.note}
              onChange={(e) => setRejectModal((s) => ({ ...s, note: e.target.value }))}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setRejectModal({ open: false, kind: null, id: null, note: "" })}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
                onClick={submitReject}
                disabled={!rejectModal.note.trim()}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

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