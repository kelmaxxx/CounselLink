// src/pages/dashboard/RepresentativeDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  FileText,
  ArrowRightLeft,
  BarChart3,
  Building2,
  BookOpen,
  ClipboardList,
  Stethoscope,
  Brain,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { PageHeader, BigStat, SectionCard, BTN } from "../../components/ui";
import WelcomeHero from "../../components/WelcomeHero";
import { getCollege } from "../../data/msuColleges";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// Custom Tooltip for Recharts
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const data = item.payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs">
        <p className="font-semibold text-gray-900 mb-1">{data.name || label}</p>
        <p className="text-gray-600 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.fill || item.color }} />
          Count: <span className="font-bold text-gray-900">{item.value}</span>
        </p>
        {data.students !== undefined && (
          <p className="text-gray-500 mt-1">Unique Students: <span className="font-semibold text-gray-700">{data.students}</span></p>
        )}
      </div>
    );
  }
  return null;
}

export default function RepresentativeDashboard() {
  const { currentUser, token } = useAuth();
  const myCollege = currentUser?.college;

  const [receivedReportsCount, setReceivedReportsCount] = useState(0);
  const [counselingApps, setCounselingApps] = useState([]);
  const [testingApps, setTestingApps] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const canonicalCollege = useMemo(() => getCollege(myCollege), [myCollege]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE}/api/appointments`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${API_BASE}/api/tests`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${API_BASE}/api/users?role=student`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${API_BASE}/api/reports/received`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([apps, tests, studs, reports]) => {
        setCounselingApps(Array.isArray(apps) ? apps : []);
        setTestingApps(Array.isArray(tests) ? tests : []);
        setStudentsList(Array.isArray(studs) ? studs : []);
        setReceivedReportsCount(Array.isArray(reports) ? reports.length : 0);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Filter students belonging to this college
  const collegeStudents = useMemo(() => {
    if (!myCollege) return [];
    const collegeCode = canonicalCollege?.code?.toLowerCase();
    const collegeName = canonicalCollege?.name?.toLowerCase() || myCollege.toLowerCase();

    return studentsList.filter((s) => {
      if (!s.college) return false;
      const c = s.college.toLowerCase();
      return c === collegeName || (collegeCode && c === collegeCode);
    });
  }, [studentsList, myCollege, canonicalCollege]);

  // 1. Data for Request Types Bar Chart (Counseling vs Psychological Testing)
  const requestTypesBarData = useMemo(() => {
    const uniqueCounselingStudents = new Set(counselingApps.map((a) => a.student_id)).size;
    const uniqueTestingStudents = new Set(testingApps.map((a) => a.student_id)).size;

    return [
      {
        name: "Counseling Requests",
        value: counselingApps.length,
        students: uniqueCounselingStudents,
        color: "#800000", // Maroon
      },
      {
        name: "Psychological Testing Requests",
        value: testingApps.length,
        students: uniqueTestingStudents,
        color: "#0284c7", // Sky blue
      },
    ];
  }, [counselingApps, testingApps]);

  // 2. Data for Department Breakdown Bar Chart (in rep's college only)
  const deptBarData = useMemo(() => {
    const depts = canonicalCollege?.departments || [];
    const counts = {};

    depts.forEach((d) => {
      counts[d.name] = 0;
    });

    collegeStudents.forEach((s) => {
      if (!s.department) return;
      const studentDept = s.department.trim();
      const matched = depts.find(
        (d) =>
          d.name.toLowerCase() === studentDept.toLowerCase() ||
          d.code.toLowerCase() === studentDept.toLowerCase()
      );
      const key = matched ? matched.name : studentDept;
      counts[key] = (counts[key] || 0) + 1;
    });

    const colors = ["#800000", "#059669", "#0284c7", "#d97706", "#9333ea", "#4f46e5", "#e11d48"];
    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  }, [canonicalCollege, collegeStudents]);

  // 3. Data for Course / Program Breakdown Bar Chart (in rep's college only)
  const courseBarData = useMemo(() => {
    const depts = canonicalCollege?.departments || [];
    const canonicalPrograms = depts.flatMap((d) => d.programs || []);
    const counts = {};

    canonicalPrograms.forEach((p) => {
      counts[p] = 0;
    });

    collegeStudents.forEach((s) => {
      if (!s.program) return;
      const studentProg = s.program.trim();
      const matched = canonicalPrograms.find(
        (p) => p.toLowerCase() === studentProg.toLowerCase()
      );
      const key = matched || studentProg;
      counts[key] = (counts[key] || 0) + 1;
    });

    const colors = ["#0284c7", "#800000", "#059669", "#d97706", "#4f46e5", "#9333ea", "#06b6d4"];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length],
      }));
  }, [canonicalCollege, collegeStudents]);

  const firstName = currentUser?.firstName || currentUser?.name?.split(" ")[0] || "Representative";

  return (
    <>
      <WelcomeHero userName={firstName} />
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-8">
        <PageHeader
          eyebrow="College Representative"
          title={`Welcome, ${firstName}`}
          subtitle={myCollege || "No college assigned"}
          actions={
            <div className="flex items-center gap-2">
              <Link to="/rep/referrals" className={BTN.primary}>
                <ArrowRightLeft size={15} /> New referral
              </Link>
              <Link to="/rep/request-report" className={BTN.secondary}>
                <ClipboardList size={15} /> Request report
              </Link>
            </div>
          }
        />

        {/* Big Statistics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <BigStat
            label="College Students"
            value={collegeStudents.length}
            hint="Enrolled in your college"
            icon={Users}
            tone="emerald"
          />
          <BigStat
            label="Counseling Requests"
            value={counselingApps.length}
            hint="Total student requests"
            icon={Stethoscope}
            tone="amber"
          />
          <BigStat
            label="Psych Testing Requests"
            value={testingApps.length}
            hint="Assessment requests"
            icon={Brain}
            tone="sky"
          />
          <Link to="/rep/counseling-data" className="block">
            <BigStat
              label="Received Reports"
              value={receivedReportsCount}
              hint="Submitted by counselors"
              icon={FileText}
              tone="blue"
            />
          </Link>
        </div>

        {/* Analytics & Demographics Bar Charts Section */}
        <SectionCard
          title={
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-maroon-600" />
              <span>College Demographics & Request Analytics</span>
            </div>
          }
          subtitle={`Visual distribution for ${myCollege || "your college"} only`}
          action={
            <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1 text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTab === "all"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                All Bar Charts
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTab === "requests"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                Requests
              </button>
              <button
                onClick={() => setActiveTab("department")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTab === "department"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                By Department
              </button>
              <button
                onClick={() => setActiveTab("course")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTab === "course"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                By Course
              </button>
            </div>
          }
        >
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">Loading college analytics…</div>
          ) : (
            <div className="space-y-8 py-2">
              {/* 1. Request Types Bar Chart */}
              {(activeTab === "all" || activeTab === "requests") && (
                <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Stethoscope size={16} className="text-maroon-600" />
                        Counseling vs. Psychological Testing Requests
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Total student requests submitted in {myCollege || "your college"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <span className="font-semibold text-gray-900">
                        {counselingApps.length + testingApps.length}
                      </span>{" "}
                      Total Requests
                    </div>
                  </div>
                  <div style={{ width: "100%", height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={requestTypesBarData}
                        layout="vertical"
                        margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                        barCategoryGap="25%"
                      >
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={210}
                          tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                          {requestTypesBarData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                          <LabelList
                            dataKey="value"
                            position="right"
                            style={{ fontSize: 13, fill: "#1e293b", fontWeight: 600 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 2. Department Breakdown Bar Chart */}
              {(activeTab === "all" || activeTab === "department") && (
                <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Building2 size={16} className="text-emerald-600" />
                        Student Distribution by Department
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Students registered in every department under {myCollege || "your college"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <span className="font-semibold text-gray-900">{collegeStudents.length}</span> Total Students
                    </div>
                  </div>
                  {deptBarData.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No department data recorded yet.</p>
                  ) : (
                    <div style={{ width: "100%", height: Math.max(deptBarData.length * 45, 160) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={deptBarData}
                          layout="vertical"
                          margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                          barCategoryGap="20%"
                        >
                          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={220}
                            tick={{ fontSize: 12, fill: "#334155" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                            {deptBarData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                            <LabelList
                              dataKey="value"
                              position="right"
                              style={{ fontSize: 12, fill: "#1e293b", fontWeight: 600 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Course / Program Breakdown Bar Chart */}
              {(activeTab === "all" || activeTab === "course") && (
                <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen size={16} className="text-sky-600" />
                        Student Distribution by Course / Program
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Students registered in every course offered under {myCollege || "your college"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <span className="font-semibold text-gray-900">{courseBarData.length}</span> Courses Listed
                    </div>
                  </div>
                  {courseBarData.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No course data recorded yet.</p>
                  ) : (
                    <div style={{ width: "100%", height: Math.max(courseBarData.length * 42, 180) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={courseBarData}
                          layout="vertical"
                          margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                          barCategoryGap="18%"
                        >
                          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={240}
                            tick={{ fontSize: 11, fill: "#334155" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                            {courseBarData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                            <LabelList
                              dataKey="value"
                              position="right"
                              style={{ fontSize: 12, fill: "#1e293b", fontWeight: 600 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
