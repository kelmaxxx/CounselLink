// src/pages/Reports.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { BarChart2, Users, Calendar, FileText, TrendingUp, Download } from "lucide-react";

function StatCard({ icon: Icon, label, count, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow p-6 flex items-center gap-4">
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

export default function Reports() {
  const { currentUser, token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/reports/overview`, {
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
    } catch (err) {
      setError(err.message || "Unable to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [token]);

  const handleExport = () => {
    if (!reportData) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      role: currentUser?.role,
      ...reportData,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reports-${currentUser?.role || "user"}.json`;
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <button
          onClick={handleExport}
          disabled={!reportData}
          className="bg-maroon-500 text-white px-4 py-2 rounded-lg hover:bg-maroon-600 transition font-medium flex items-center gap-2 disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={Calendar}
          label="Total Appointments"
          count={reportData?.totals?.appointments || 0}
          color="bg-maroon-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Completed Appointments"
          count={reportData?.totals?.completedAppointments || 0}
          color="bg-green-500"
        />
        <StatCard
          icon={Calendar}
          label="Pending Appointments"
          count={reportData?.totals?.pendingAppointments || 0}
          color="bg-yellow-500"
        />
        <StatCard
          icon={FileText}
          label="Total Test Requests"
          count={reportData?.totals?.tests || 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={BarChart2}
          label="Completed Tests"
          count={reportData?.totals?.completedTests || 0}
          color="bg-purple-500"
        />
        <StatCard
          icon={FileText}
          label="Test Results"
          count={reportData?.totals?.results || 0}
          color="bg-indigo-500"
        />
      </div>

      {/* College Distribution (for non-students) */}
      {currentUser?.role !== "student" && reportData?.collegeDistribution && Object.keys(reportData.collegeDistribution).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-maroon-500" />
            <h2 className="text-2xl font-semibold text-gray-900">Student Distribution by College</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(reportData.collegeDistribution).map(([college, count]) => (
              <div key={college} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="font-medium text-gray-700">{college}</span>
                <span className="bg-maroon-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {(reportData?.recentActivity || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-maroon-500" />
            <h2 className="text-2xl font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            {(reportData?.recentActivity || []).map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-maroon-300 transition"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{apt.studentName}</p>
                  <p className="text-sm text-gray-600">{apt.preferredDate}</p>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(reportData?.recentActivity || []).length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow p-12 text-center">
          <BarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">No data available</p>
          <p className="text-gray-500 text-sm">Reports and analytics will appear here once you have appointments and tests.</p>
        </div>
      )}
    </div>
  );
}
