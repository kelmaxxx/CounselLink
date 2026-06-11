// src/pages/Appointments.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import { useAppointments } from "../context/AppointmentsContext";
import { useTests } from "../context/TestsContext";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";

function StatusBadge({ status }) {
  const statusStyles = {
    pending: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    accepted: "bg-green-100 text-green-800 border border-green-300",
    confirmed: "bg-green-100 text-green-800 border border-green-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
    rescheduled: "bg-blue-100 text-blue-800 border border-blue-300",
    completed: "bg-gray-100 text-gray-800 border border-gray-300",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[status] || statusStyles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({ icon: Icon, label, count, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 shadow p-6 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-gray-600 text-sm">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{count}</p>
      </div>
    </div>
  );
}

export default function Appointments() {
  const { currentUser } = useAuth();
  const { fetchAppointments } = useAppointments();
  const { getTestsForCurrentUser } = useTests();

  const [appointments, setAppointments] = React.useState([]);
  const tests = getTestsForCurrentUser();

  React.useEffect(() => {
    let mounted = true;
    const loadAppointments = async () => {
      try {
        const data = await fetchAppointments();
        if (mounted) setAppointments(data);
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

  const totalAppointments = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;
  const confirmedCount = appointments.filter((a) => a.status === "accepted").length;
  const completedCount = appointments.filter((a) => a.status === "completed").length;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Appointments & Tests</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Calendar}
          label="Total Appointments"
          count={totalAppointments}
          color="bg-maroon-500"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending"
          count={pendingCount}
          color="bg-yellow-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Confirmed"
          count={confirmedCount}
          color="bg-green-500"
        />
        <StatCard
          icon={XCircle}
          label="Completed"
          count={completedCount}
          color="bg-gray-500"
        />
      </div>

      {/* Appointments Section */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Appointments</h2>
          {currentUser?.role === "student" && (
            <Link
              to="/student/request-appointment"
              className="bg-maroon-500 text-white px-4 py-2 rounded-lg hover:bg-maroon-600 transition text-sm font-medium"
            >
              Request Appointment
            </Link>
          )}
        </div>

        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg mb-2">No appointments yet</p>
            <p className="text-gray-500 text-sm">
              {currentUser?.role === "student"
                ? "Request an appointment to get started."
                : "No appointments to display."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Control No</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {currentUser?.role === "student" ? "Counselor Name" : "Student Name"}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Preferred Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Scheduled Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-900 font-medium">{apt.controlNo}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {currentUser?.role === "student" ? apt.counselorName || "TBD" : apt.studentName}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{apt.preferredDate || "—"}</td>
                    <td className="py-3 px-4 text-gray-700">{apt.scheduledDate || "—"}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={apt.status} />
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                      {apt.reason.substring(0, 50)}
                      {apt.reason.length > 50 ? "..." : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Psychology Tests Section */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Psychology Test Requests</h2>
          {currentUser?.role === "student" && (
            <Link
              to="/student/request-psych-test"
              className="bg-maroon-500 text-white px-4 py-2 rounded-lg hover:bg-maroon-600 transition text-sm font-medium"
            >
              Request Test
            </Link>
          )}
        </div>

        {tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg mb-2">No test requests yet</p>
            <p className="text-gray-500 text-sm">
              {currentUser?.role === "student"
                ? "Request a psychology test to get started."
                : "No test requests to display."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Control No</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Test Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Preferred Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Scheduled Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr key={test.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-900 font-medium">{test.controlNo}</td>
                    <td className="py-3 px-4 text-gray-700">{test.testType}</td>
                    <td className="py-3 px-4 text-gray-700">{test.preferredDate}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {test.scheduledDate || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={test.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
