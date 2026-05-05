import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";

const STATUS_LABELS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "approved", label: "Approved" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "counseling", label: "Counseling" },
  { value: "psychological_test", label: "Psychological Test" },
];

const normalizeDateValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
};

export default function AdminReports() {
  const { token } = useAuth();
  const { appointments, fetchAppointments } = useAppointments();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });

  const fetchReport = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/reports/admin`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load report");
      }
      setReportData(data);
      await fetchAppointments();
    } catch (err) {
      setError(err.message || "Unable to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [token]);

  const updateFilter = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const clearFilters = () => {
    setFilters({ type: "all", status: "all", dateFrom: "", dateTo: "" });
  };

  const filteredAppointments = useMemo(() => {
    return (appointments || []).filter((apt) => {
      if (filters.type !== "all" && apt.appointment_type !== filters.type) {
        return false;
      }
      if (filters.status !== "all" && apt.status !== filters.status) {
        return false;
      }
      if (filters.dateFrom || filters.dateTo) {
        const dateValue =
          normalizeDateValue(apt.preferredDate) ||
          normalizeDateValue(apt.scheduledDate) ||
          normalizeDateValue(apt.created_at);
        if (!dateValue) return false;
        const date = new Date(dateValue);
        if (filters.dateFrom && date < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && date > new Date(filters.dateTo)) return false;
      }
      return true;
    });
  }, [appointments, filters]);

  const counselingAppointments = filteredAppointments.filter(
    (apt) => apt.appointment_type !== "psychological_test"
  );
  const testAppointments = filteredAppointments.filter(
    (apt) => apt.appointment_type === "psychological_test"
  );

  const appointmentStatuses = counselingAppointments.reduce(
    (acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    },
    {}
  );

  const totalAppointments = counselingAppointments.length;
  const totalTests = testAppointments.length;
  const pendingRequests = filteredAppointments.filter((apt) => apt.status === "pending").length;

  const acceptedCount =
    (appointmentStatuses.accepted || 0) +
    (appointmentStatuses.approved || 0) +
    (appointmentStatuses.confirmed || 0);

  const recentActivity = [...filteredAppointments]
    .sort((a, b) => {
      const dateA = new Date(
        normalizeDateValue(a.created_at) || normalizeDateValue(a.preferredDate) || 0
      );
      const dateB = new Date(
        normalizeDateValue(b.created_at) || normalizeDateValue(b.preferredDate) || 0
      );
      return dateB - dateA;
    })
    .slice(0, 5);

  const students = reportData?.users?.student || 0;
  const counselors = reportData?.users?.counselor || 0;
  const reps = reportData?.users?.college_rep || 0;
  const admins = reportData?.users?.admin || 0;
  const totalUsers = students + counselors + reps + admins;

  const handlePrint = () => {
    window.print();
  };

  const handleViewDetails = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      filters,
      users: reportData?.users || {},
      totals: {
        appointments: totalAppointments,
        tests: totalTests,
        pendingRequests,
      },
      appointmentStatuses,
      recentActivity,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-report.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">System Reports</h2>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.type}
              onChange={updateFilter("type")}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.status}
              onChange={updateFilter("status")}
            >
              {STATUS_LABELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={filters.dateFrom}
              onChange={updateFilter("dateFrom")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={filters.dateTo}
              onChange={updateFilter("dateTo")}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Statistics</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total Students:</span>
              <span className="font-medium text-gray-900">{students}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Counselors:</span>
              <span className="font-medium text-gray-900">{counselors}</span>
            </div>
            <div className="flex justify-between">
              <span>Total College Reps:</span>
              <span className="font-medium text-gray-900">{reps}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span>Total Users:</span>
              <span className="font-medium text-gray-900">{totalUsers}</span>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="mt-4 w-full bg-maroon-500 text-white py-2 rounded-lg hover:bg-maroon-600 transition"
          >
            Export Report
          </button>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Activity</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total Counseling Sessions:</span>
              <span className="font-medium text-gray-900">{totalAppointments}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Test Requests:</span>
              <span className="font-medium text-gray-900">{totalTests}</span>
            </div>
            <div className="flex justify-between">
              <span>Requests Pending:</span>
              <span className="font-medium text-gray-900">{pendingRequests}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span>Filtered Records:</span>
              <span className="font-medium text-gray-900">{filteredAppointments.length}</span>
            </div>
          </div>
          <button
            onClick={handleViewDetails}
            className="mt-4 w-full bg-maroon-500 text-white py-2 rounded-lg hover:bg-maroon-600 transition"
          >
            View Details
          </button>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Counseling Status Breakdown</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Pending:</span>
              <span className="font-medium text-yellow-600">{appointmentStatuses.pending || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Accepted:</span>
              <span className="font-medium text-green-600">{acceptedCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Rejected:</span>
              <span className="font-medium text-red-600">{appointmentStatuses.rejected || 0}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span>Total:</span>
              <span className="font-medium text-gray-900">{totalAppointments}</span>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="mt-4 w-full bg-maroon-500 text-white py-2 rounded-lg hover:bg-maroon-600 transition"
          >
            View Details
          </button>
        </div>
      </div>

      {recentActivity.length > 0 && (
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{apt.studentName || "Student"}</p>
                  <p className="text-xs text-gray-500">{apt.preferredDate || apt.scheduledDate || "No date"}</p>
                </div>
                <span className="text-xs font-semibold text-gray-600">{apt.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
