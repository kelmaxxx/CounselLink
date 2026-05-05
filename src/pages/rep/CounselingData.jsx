import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "approved", label: "Approved" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

const normalizeDateValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
};

export default function CounselingData() {
  const { currentUser, token } = useAuth();
  const { appointments, fetchAppointments } = useAppointments();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const [saveMessage, setSaveMessage] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "all", dateFrom: "", dateTo: "", search: "" });

  const fetchReport = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/reports/college`, {
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
    setFilters({ status: "all", dateFrom: "", dateTo: "", search: "" });
  };

  const myCollege = reportData?.college || currentUser?.college;
  const studentsInCollege = reportData?.students || [];

  const collegeAppointments = useMemo(() => {
    if (!myCollege) return [];
    return (appointments || []).filter((apt) => {
      if (!apt.college || apt.college !== myCollege) {
        return false;
      }
      return true;
    });
  }, [appointments, myCollege]);

  const filteredAppointments = useMemo(() => {
    return collegeAppointments.filter((apt) => {
      if (filters.status !== "all" && apt.status !== filters.status) {
        return false;
      }
      if (filters.search) {
        const searchValue = filters.search.toLowerCase();
        const name = `${apt.studentName || ""} ${apt.studentId || ""}`.toLowerCase();
        if (!name.includes(searchValue)) {
          return false;
        }
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
  }, [collegeAppointments, filters]);

  const totalSessions = filteredAppointments.length;
  const activeCases = filteredAppointments.filter((apt) =>
    ["pending", "accepted", "approved"].includes(apt.status)
  ).length;
  const completed = filteredAppointments.filter((apt) => apt.status === "completed").length;

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    if (!reportData) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      filters,
      college: myCollege,
      totals: { totalSessions, activeCases, completed },
      students: studentsInCollege,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `college-report-${myCollege || "college"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveMessage("Report saved successfully!");
    setTimeout(() => setSaveMessage(""), 3000);
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
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Open Counseling Data</h2>

      {saveMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">✓ {saveMessage}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.status}
              onChange={updateFilter("status")}
            >
              {STATUS_OPTIONS.map((option) => (
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Search</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="Name or ID"
              value={filters.search}
              onChange={updateFilter("search")}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-maroon-500 text-white p-6 rounded-xl shadow">
          <h3 className="text-sm font-medium text-maroon-100">Total Sessions</h3>
          <p className="text-3xl font-bold">{totalSessions}</p>
        </div>
        <div className="bg-maroon-600 text-white p-6 rounded-xl shadow">
          <h3 className="text-sm font-medium text-maroon-100">Active Cases</h3>
          <p className="text-3xl font-bold">{activeCases}</p>
        </div>
        <div className="bg-maroon-700 text-white p-6 rounded-xl shadow">
          <h3 className="text-sm font-medium text-maroon-100">Completed</h3>
          <p className="text-3xl font-bold">{completed}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics - {myCollege}</h3>
        <p className="text-gray-600 mb-6">
          This is aggregated data available for your college. For detailed individual student records, submit a request below.
        </p>

        <div className="flex gap-4 mb-6">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-maroon-500 text-white rounded-lg hover:bg-maroon-600 transition"
          >
            Print Report
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Save Report
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Students in {myCollege}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Year Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {studentsInCollege.length > 0 ? (
                studentsInCollege.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.studentId || student.student_id || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.program || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.yearLevel || student.year_level || "N/A"}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No students found in {myCollege}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
