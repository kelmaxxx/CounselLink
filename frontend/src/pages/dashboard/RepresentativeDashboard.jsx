// src/pages/dashboard/RepresentativeDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  FileText,
  ArrowRightLeft,
  ClipboardList,
  Stethoscope,
  Brain,
  Building2,
  BookOpen,
  Calendar,
} from "lucide-react";
import { PageHeader, BigStat, SectionCard, BTN, DonutStat, RankedBarChart, VerticalBarChart, TrendAreaChart, EmptyState } from "../../components/ui";
import WelcomeHero from "../../components/WelcomeHero";
import { getCollege } from "../../data/msuColleges";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// Short label for column charts: major in parens wins ("BS Information
// Technology (Database Systems)" -> "Database"), otherwise degree +
// initials ("BS Computer Science" -> "BSCS"). Full name stays in tooltip.
function shortOf(name = "") {
  const paren = name.match(/\(([^)]+)\)/);
  if (paren) {
    const first = paren[1].split(/\s+/).filter(Boolean)[0];
    if (first) return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  const stop = new Set(["of", "in", "and", "the", "for", "major", "program"]);
  const words = name.split(/[\s/-]+/).filter(Boolean);
  if (!words.length) return "";
  const head = words[0].toUpperCase();
  const tail = words
    .slice(1)
    .filter((w) => !stop.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join("");
  return (head + tail).slice(0, 6) || name.slice(0, 6);
}

// Collapse free-text variants onto canonical programs so a typo can't
// spawn a phantom "course" bar ("BS Computer Sciences" -> "BS Computer
// Science"). Case-insensitive; genuinely new values pass through as-is.
const PROGRAM_ALIASES = {
  "bs computer sciences": "BS Computer Science",
};

function normalizeProgram(value, canonicalPrograms) {
  const clean = String(value || "").trim().replace(/\s+/g, " ");
  if (!clean) return null;
  const lower = clean.toLowerCase();
  const exact = canonicalPrograms.find((p) => p.toLowerCase() === lower);
  if (exact) return exact;
  const alias = PROGRAM_ALIASES[lower];
  if (alias && canonicalPrograms.includes(alias)) return alias;
  return clean;
}

// YYYY-MM-DD without UTC shift (matches CounselorDashboard helper).
function toDateStr(value) {
  if (!value) return "";
  const s = String(value);
  if (s.includes("T")) return s.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function RepresentativeDashboard() {
  const { currentUser, token } = useAuth();
  const myCollege = currentUser?.college;

  const [receivedReportsCount, setReceivedReportsCount] = useState(0);
  const [counselingApps, setCounselingApps] = useState([]);
  const [testingApps, setTestingApps] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const key = normalizeProgram(s.program, canonicalPrograms);
      if (!key) return;
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

  // ── Chart-ready derivatives: one visual language per card ─────────────
  // Requests (2 slices) -> donut · Departments (long names) -> ranked
  // horizontal bars · Courses (many programs) -> vertical columns with
  // short codes · Volume over time -> gradient area trend.
  const uniqueCounselingStudents = useMemo(
    () => new Set(counselingApps.map((a) => a.student_id)).size,
    [counselingApps]
  );
  const uniqueTestingStudents = useMemo(
    () => new Set(testingApps.map((a) => a.student_id)).size,
    [testingApps]
  );
  const requestDonutData = useMemo(
    () => [
      { name: "Counseling", value: counselingApps.length, color: "#800000" },
      { name: "Psych testing", value: testingApps.length, color: "#0284c7" },
    ],
    [counselingApps.length, testingApps.length]
  );
  const requestTotal = counselingApps.length + testingApps.length;

  const courseVerticalData = useMemo(
    () =>
      courseBarData.map((d) => ({
        ...d,
        short: shortOf(d.name),
      })),
    [courseBarData]
  );

  const requestTrend = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const pad = (n) => String(n).padStart(2, "0");
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      days.push({
        key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        appointments: 0,
        tests: 0,
      });
    }
    const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
    counselingApps.forEach((a) => {
      const k = toDateStr(a.createdAt || a.created_at || a.preferredDate || a.preferred_date);
      if (k && byKey[k]) byKey[k].appointments += 1;
    });
    testingApps.forEach((t) => {
      const k = toDateStr(t.createdAt || t.created_at || t.preferredDate);
      if (k && byKey[k]) byKey[k].tests += 1;
    });
    return days;
  }, [counselingApps, testingApps]);

  const firstName = currentUser?.firstName || currentUser?.name?.split(" ")[0] || "Representative";

  return (
    <>
      <WelcomeHero userName={firstName} />
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-8">
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

        {/* Analytics — one visual per card: donut + ranked bars + columns + trend */}
        {loading ? (
          <SectionCard title="College analytics" subtitle={`Visual distribution for ${myCollege || "your college"} only`}>
            <div className="py-12 text-center text-sm text-gray-500">Loading college analytics…</div>
          </SectionCard>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <SectionCard
                className="lg:col-span-2"
                title="Request mix"
                subtitle={`Counseling vs. testing in ${myCollege || "your college"}`}
              >
                <DonutStat
                  data={requestDonutData}
                  total={requestTotal}
                  centerLabel="requests"
                  emptyIcon={Stethoscope}
                  emptyTitle="No requests yet"
                  stack
                />
                <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-lg font-semibold text-gray-900 tabular-nums">{uniqueCounselingStudents}</p>
                    <p className="text-[11px] text-gray-500">Unique students · counseling</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-lg font-semibold text-gray-900 tabular-nums">{uniqueTestingStudents}</p>
                    <p className="text-[11px] text-gray-500">Unique students · testing</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                className="lg:col-span-3"
                title="Students by department"
                subtitle={`${collegeStudents.length} students across ${deptBarData.length} departments`}
              >
                {deptBarData.length === 0 ? (
                  <EmptyState icon={Building2} title="No department data yet" hint="Students registered under your college will appear here." />
                ) : (
                  <RankedBarChart
                    data={deptBarData}
                    labelWidth={130}
                    maxRows={6}
                    emptyIcon={Building2}
                    emptyTitle="No department data yet"
                    title="Students by Department"
                  />
                )}
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
              <SectionCard
                className="lg:col-span-2"
                title="Students by course"
                subtitle={`${courseBarData.length} courses · hover a column for the full name`}
              >
                <VerticalBarChart
                  data={courseVerticalData}
                  emptyIcon={BookOpen}
                  emptyTitle="No course data yet"
                />
              </SectionCard>

              <SectionCard
                className="lg:col-span-3"
                title="Request volume"
                subtitle="Counseling vs. testing · last 14 days"
              >
                <TrendAreaChart
                  data={requestTrend}
                  emptyIcon={Calendar}
                  emptyTitle="No activity yet"
                />
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </>
  );
}

