// src/pages/Students.jsx
import React, { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  FileText,
  Download,
  TrendingUp,
  Calendar,
  AlertCircle,
  Activity,
  PieChart
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAppointments } from "../context/AppointmentsContext";
import { useTests } from "../context/TestsContext";

const COLLEGES = ["CICS", "COE", "CAS", "COB", "COL"];

const mockStudents = [
  { id: "1", name: "Juan Dela Cruz", studentId: "2024-00001", college: "CICS", year: "3rd Year", lastSession: "Nov 28, 2024", sessions: 5, status: "active" },
  { id: "2", name: "Maria Santos", studentId: "2024-00002", college: "COE", year: "2nd Year", lastSession: "Nov 25, 2024", sessions: 3, status: "active" },
  { id: "3", name: "Pedro Reyes", studentId: "2024-00003", college: "CAS", year: "4th Year", lastSession: "Nov 20, 2024", sessions: 8, status: "inactive" },
  { id: "4", name: "Ana Garcia", studentId: "2024-00004", college: "COB", year: "1st Year", lastSession: "Nov 15, 2024", sessions: 2, status: "active" },
  { id: "5", name: "Luis Mendoza", studentId: "2024-00005", college: "CICS", year: "3rd Year", lastSession: "Nov 10, 2024", sessions: 4, status: "active" },
  { id: "6", name: "Rosa Cruz", studentId: "2024-00006", college: "COE", year: "2nd Year", lastSession: "Nov 5, 2024", sessions: 6, status: "active" },
];

function downloadCSV(rows, filename = "students.csv") {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map(r => keys.map(k => `"${(r[k] ?? "").toString().replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Pie Chart Component
function PieChartSVG({ data, totalStudents }) {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  const size = 240;
  const center = size / 2;
  const radius = size / 2 - 10;
  
  const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);
  
  let currentAngle = -90; // Start from top
  const slices = sortedData.map(([college, count], index) => {
    const percentage = (count / totalStudents) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    // Calculate path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    currentAngle = endAngle;
    
    return {
      path: pathData,
      color: colors[index % colors.length],
      college,
      percentage: percentage.toFixed(1)
    };
  });
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-md">
      {slices.map((slice, index) => (
        <g key={index}>
          <path
            d={slice.path}
            fill={slice.color}
            stroke="white"
            strokeWidth="2"
            className="transition-all duration-300 hover:opacity-80"
          />
        </g>
      ))}
      {/* Center circle for donut effect */}
      <circle
        cx={center}
        cy={center}
        r={radius * 0.5}
        fill="white"
        className="drop-shadow-sm"
      />
      <text
        x={center}
        y={center - 10}
        textAnchor="middle"
        className="text-3xl font-bold"
        fill="#1F2937"
      >
        {totalStudents}
      </text>
      <text
        x={center}
        y={center + 15}
        textAnchor="middle"
        className="text-xs"
        fill="#6B7280"
      >
        Students
      </text>
    </svg>
  );
}

export default function ManageStudents() {
  const { users, createUser } = useAuth();
  const { appointments } = useAppointments?.() || { appointments: [] };
  const { tests } = useTests?.() || { tests: [] };
  
  const [searchQuery, setSearchQuery] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" or "students"

  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    studentId: "",
    college: COLLEGES[0],
    year: "1st Year",
    sessions: 0,
    status: "active"
  });

  const studentsSource = useMemo(() => {
    const ctxStudents = (users || []).filter(u => u.role === "student")
      .map(u => ({
        id: String(u.id || u.email),
        name: u.name || u.email,
        studentId: u.studentId || "",
        college: u.college || "N/A",
        year: u.year || "N/A",
        lastSession: u.lastSession || "N/A",
        sessions: u.sessions || 0,
        status: u.status || "active"
      }));
    const byId = {};
    [...mockStudents, ...ctxStudents].forEach(s => {
      byId[s.studentId || s.id] = s;
    });
    return Object.values(byId);
  }, [users]);

  const filteredStudents = useMemo(() => {
    return studentsSource.filter(student => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (student.name || "").toLowerCase().includes(q) ||
        (student.studentId || "").toLowerCase().includes(q);
      const matchesCollege = collegeFilter === "all" || student.college === collegeFilter;
      return matchesSearch && matchesCollege;
    });
  }, [studentsSource, searchQuery, collegeFilter]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalStudents = studentsSource.length;
    const activeStudents = studentsSource.filter(s => s.status === "active").length;
    const totalSessions = studentsSource.reduce((acc, s) => acc + (s.sessions || 0), 0);
    
    // Appointments stats
    const totalAppointments = appointments.length;
    const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
    const completedAppointments = appointments.filter(a => a.status === 'accepted' || a.status === 'rescheduled').length;
    
    // Test stats
    const totalTests = tests.length;
    const pendingTests = tests.filter(t => t.status === 'pending').length;
    
    // College distribution
    const collegeDistribution = {};
    studentsSource.forEach(s => {
      const college = s.college || "Unknown";
      collegeDistribution[college] = (collegeDistribution[college] || 0) + 1;
    });
    
    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentAppointments = appointments.filter(a => new Date(a.createdAt) > sevenDaysAgo).length;
    const recentTests = tests.filter(t => new Date(t.createdAt) > sevenDaysAgo).length;
    
    return {
      totalStudents,
      activeStudents,
      totalSessions,
      avgSessionsPerStudent: totalStudents > 0 ? (totalSessions / totalStudents).toFixed(1) : 0,
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      totalTests,
      pendingTests,
      collegeDistribution,
      recentActivity: recentAppointments + recentTests,
      mostActiveCollege: Object.entries(collegeDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"
    };
  }, [studentsSource, appointments, tests]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAdding(true);

    // Basic validation
    if (!newStudent.name || !newStudent.email || !newStudent.studentId) {
      alert("Please fill Name, Email and Student ID.");
      setAdding(false);
      return;
    }

    const res = createUser({
      name: newStudent.name,
      email: newStudent.email,
      password: "pass123",
      role: "student",
      college: newStudent.college,
      studentId: newStudent.studentId,
      extra: {
        year: newStudent.year,
        sessions: newStudent.sessions,
        status: newStudent.status,
        lastSession: newStudent.lastSession || "N/A"
      }
    });

    if (!res.success) {
      alert(res.message || "Failed to add user");
      setAdding(false);
      return;
    }

    // Clear form and close modal
    setNewStudent({ name: "", email: "", studentId: "", college: COLLEGES[0], year: "1st Year", sessions: 0, status: "active" });
    setShowAdd(false);
    setAdding(false);
  };

  return (
    <div className="p-6">
      <div className="max-w-full">
        {/* Page Title and Tabs */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Manage Students</h2>
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 font-medium transition ${
                activeTab === "overview"
                  ? "text-maroon-600 border-b-2 border-maroon-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <PieChart size={18} />
                Analytics Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-2 font-medium transition ${
                activeTab === "students"
                  ? "text-maroon-600 border-b-2 border-maroon-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={18} />
                Student Records
              </div>
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-white/80 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs text-green-600 font-medium bg-white/80 px-2 py-0.5 rounded-full">+12%</span>
                </div>
                <p className="text-3xl font-bold text-blue-900">{analytics.totalStudents}</p>
                <p className="text-sm text-blue-700">Total Students</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-white/80 rounded-lg">
                    <Activity className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-900">{analytics.activeStudents}</p>
                <p className="text-sm text-green-700">Active Cases</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-white/80 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-purple-900">{analytics.totalAppointments}</p>
                <p className="text-sm text-purple-700">Total Appointments</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-white/80 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-orange-900">{analytics.avgSessionsPerStudent}</p>
                <p className="text-sm text-orange-700">Avg Sessions/Student</p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: College Distribution - Pie Chart */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Student Distribution by College</h3>
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  {/* Pie Chart */}
                  <div className="relative flex-shrink-0">
                    <PieChartSVG data={analytics.collegeDistribution} totalStudents={analytics.totalStudents} />
                  </div>
                  
                  {/* Legend */}
                  <div className="flex-1 space-y-3">
                    {Object.entries(analytics.collegeDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([college, count], index) => {
                        const percentage = (count / analytics.totalStudents) * 100;
                        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                        const color = colors[index % colors.length];
                        return (
                          <div key={college} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full shadow-sm" 
                                style={{ backgroundColor: color }}
                              ></div>
                              <span className="text-sm font-medium text-gray-700">{college}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900">{count} students</span>
                              <span className="text-xs text-gray-500 ml-2">({percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Right: Quick Stats */}
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Pending Appointments</span>
                      <span className="font-semibold text-gray-900">{analytics.pendingAppointments}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Completed Sessions</span>
                      <span className="font-semibold text-gray-900">{analytics.completedAppointments}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Test Requests</span>
                      <span className="font-semibold text-gray-900">{analytics.totalTests}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Pending Tests</span>
                      <span className="font-semibold text-gray-900">{analytics.pendingTests}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Recent Activity (7d)</span>
                      <span className="font-semibold text-gray-900">{analytics.recentActivity}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <AlertCircle size={20} />
                    </div>
                    <h3 className="text-lg font-semibold">Key Insight</h3>
                  </div>
                  <p className="text-sm text-white/90 mb-2">Most Active College</p>
                  <p className="text-3xl font-bold mb-1">{analytics.mostActiveCollege}</p>
                  <p className="text-sm text-white/80">with {analytics.collegeDistribution[analytics.mostActiveCollege] || 0} students</p>
                </div>
              </div>
            </div>

            {/* Session Overview */}
            <div className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Session Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-4 border-l-4 border-cyan-500 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-sm text-gray-600 mb-2">Total Sessions Conducted</p>
                  <p className="text-3xl font-bold text-cyan-600">{analytics.totalSessions}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border-l-4 border-teal-500 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-sm text-gray-600 mb-2">Average per Student</p>
                  <p className="text-3xl font-bold text-teal-600">{analytics.avgSessionsPerStudent}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border-l-4 border-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-sm text-gray-600 mb-2">Active Caseload</p>
                  <p className="text-3xl font-bold text-emerald-600">{analytics.activeStudents}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <>
            {/* Header actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-6">
          <div className="flex gap-3 flex-1 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="pl-10 pr-3 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
                placeholder="Search by name or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center">
              <div className="mr-2 text-gray-600"><Filter /></div>
              <select
                className="px-3 py-2 rounded border bg-white"
                value={collegeFilter}
                onChange={(e) => setCollegeFilter(e.target.value)}
              >
                <option value="all">All Colleges</option>
                {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => downloadCSV(filteredStudents, "students-export.csv")}
              className="flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Export
            </button>

            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded bg-maroon-500 text-white hover:bg-maroon-600"
            >
              <Plus className="w-4 h-4" /> Add Record
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-maroon-50">
                <Users className="h-5 w-5 text-maroon-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{studentsSource.length}</p>
                <p className="text-sm text-gray-500">Total Students</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{studentsSource.filter(s => s.status === "active").length}</p>
                <p className="text-sm text-gray-500">Active Cases</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{studentsSource.reduce((acc, s) => acc + (s.sessions || 0), 0)}</p>
                <p className="text-sm text-gray-500">Total Sessions</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50">
                <Users className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredStudents.length}</p>
                <p className="text-sm text-gray-500">Filtered Results</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">College</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Year</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Last Session</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Sessions</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{student.name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{student.studentId}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded border text-sm text-gray-700">{student.college}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{student.year}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{student.lastSession}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{student.sessions}</td>
                  <td className="px-4 py-3 text-sm">
                    {student.status === "active" ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">active</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="inline-flex items-center gap-2">
                      <button
                        title="View profile"
                        onClick={() => alert(`View ${student.name}`)}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        title="Edit"
                        onClick={() => alert(`Edit ${student.name}`)}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <Edit className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete record for ${student.name}?`)) {
                            alert("Deleted (demo)");
                          }
                        }}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    No records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          </>
        )}
      </div>

      {/* Add Record Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Add Student Record</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Full name" value={newStudent.name} onChange={(e)=>setNewStudent({...newStudent,name:e.target.value})} className="px-3 py-2 border rounded" />
                <input required placeholder="Email" value={newStudent.email} onChange={(e)=>setNewStudent({...newStudent,email:e.target.value})} className="px-3 py-2 border rounded" />
                <input required placeholder="Student ID" value={newStudent.studentId} onChange={(e)=>setNewStudent({...newStudent,studentId:e.target.value})} className="px-3 py-2 border rounded" />
                <select value={newStudent.college} onChange={(e)=>setNewStudent({...newStudent,college:e.target.value})} className="px-3 py-2 border rounded">
                  {COLLEGES.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={newStudent.year} onChange={(e)=>setNewStudent({...newStudent,year:e.target.value})} className="px-3 py-2 border rounded">
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
                <select value={newStudent.status} onChange={(e)=>setNewStudent({...newStudent,status:e.target.value})} className="px-3 py-2 border rounded">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setShowAdd(false)} className="px-4 py-2 rounded border">Cancel</button>
                <button type="submit" disabled={adding} className="px-4 py-2 rounded bg-maroon-500 text-white">
                  {adding ? "Adding..." : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}