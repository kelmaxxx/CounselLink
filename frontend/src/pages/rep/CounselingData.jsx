import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import {
  Printer,
  Download,
  Search,
  Users,
  CheckCircle2,
  Activity,
  Filter as FilterIcon,
  GraduationCap,
  ArrowRightLeft,
  ClipboardList,
  FileText,
  Eye,
  Inbox,
  FileDown,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
  StatusPill,
  Modal,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
} from "../../components/ui";
import {
  downloadReportAsDocx,
  downloadReportAsPdf,
  normalizeSessionReport,
} from "../../utils/sessionReport";

const parsePayload = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "approved", label: "Approved" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

const normalizeDateValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && value.includes("T")) return value.split("T")[0];
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
  const [receivedReports, setReceivedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

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
      if (!response.ok) throw new Error(data.message || "Unable to load report");
      setReportData(data);
      await fetchAppointments();
    } catch (err) {
      setError(err.message || "Unable to load report");
    } finally {
      setLoading(false);
    }
  };

  const fetchReceivedReports = async () => {
    if (!token) return;
    setLoadingReports(true);
    try {
      const response = await fetch(`${apiBase}/api/reports/received`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setReceivedReports(Array.isArray(data) ? data : []);
    } catch {
      // Surfaced via the page-level error banner from fetchReport; ignore here.
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReport();
    fetchReceivedReports();
  }, [token]);

  const activePayload = useMemo(
    () => (activeReport ? parsePayload(activeReport.report_payload) : null),
    [activeReport]
  );

  const updateFilter = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const clearFilters = () =>
    setFilters({ status: "all", dateFrom: "", dateTo: "", search: "" });

  const myCollege = reportData?.college || currentUser?.college;
  const studentsInCollege = reportData?.students || [];

  const collegeAppointments = useMemo(() => {
    if (!myCollege) return [];
    return (appointments || []).filter((apt) => apt.college === myCollege);
  }, [appointments, myCollege]);

  const filteredAppointments = useMemo(() => {
    return collegeAppointments.filter((apt) => {
      if (filters.status !== "all" && apt.status !== filters.status) return false;
      if (filters.search) {
        const searchValue = filters.search.toLowerCase();
        const name = `${apt.studentName || ""} ${apt.studentId || ""}`.toLowerCase();
        if (!name.includes(searchValue)) return false;
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

  const handlePrint = () => window.print();

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
    setSaveMessage("Report saved successfully");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const hasActiveFilters =
    filters.status !== "all" || filters.dateFrom || filters.dateTo || filters.search;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="College Representative"
        title="Open counseling data"
        subtitle={`Aggregated counseling activity${myCollege ? ` for ${myCollege}` : ""}`}
        actions={
          <>
            <button onClick={handleSave} className={BTN.secondary}>
              <Download size={14} /> Save JSON
            </button>
            <button onClick={handlePrint} className={BTN.primary}>
              <Printer size={14} /> Print
            </button>
          </>
        }
      />

      {saveMessage && (
        <div className="mb-4 px-3 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
          {saveMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Total sessions"
          value={totalSessions}
          hint="Across filters"
          icon={Activity}
          accent="bg-gray-400"
        />
        <StatCard
          label="Active cases"
          value={activeCases}
          hint="Pending / accepted / approved"
          icon={Users}
          accent="bg-amber-500"
        />
        <StatCard
          label="Completed"
          value={completed}
          hint="Finalized sessions"
          icon={CheckCircle2}
          accent="bg-emerald-500"
        />
      </div>

      {/* Filters */}
      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <FilterIcon size={13} /> Filters
          </span>
        }
        subtitle="Refine the list below"
        className="mb-4"
        action={
          hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </button>
          )
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className={LABEL}>Status</label>
            <select className={INPUT} value={filters.status} onChange={updateFilter("status")}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Date from</label>
            <input
              type="date"
              className={INPUT}
              value={filters.dateFrom}
              onChange={updateFilter("dateFrom")}
            />
          </div>
          <div>
            <label className={LABEL}>Date to</label>
            <input
              type="date"
              className={INPUT}
              value={filters.dateTo}
              onChange={updateFilter("dateTo")}
            />
          </div>
          <div>
            <label className={LABEL}>Student search</label>
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                className={`${INPUT} pl-8`}
                placeholder="Name or ID"
                value={filters.search}
                onChange={updateFilter("search")}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <p className="text-xs text-gray-600 mb-4 leading-relaxed">
        This is aggregated data available for your college. For detailed individual student records,
        submit a Request for Student Counseling Data.
      </p>

      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap size={14} className="text-maroon-600" />
            Students in {myCollege || "your college"}
          </span>
        }
        subtitle={`${studentsInCollege.length} total`}
        noBodyPadding
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : studentsInCollege.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            hint={`No students are registered in ${myCollege || "your college"} yet.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Student ID</th>
                  <th className="px-4 py-2.5">Program</th>
                  <th className="px-4 py-2.5">Year level</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {studentsInCollege.map((student) => {
                  const sid = student.studentId || student.student_id || "";
                  const referHref = `/rep/referrals?studentId=${student.id}`;
                  const requestHref = `/rep/request-report?studentName=${encodeURIComponent(
                    student.name || ""
                  )}${sid ? `&studentIdentifier=${encodeURIComponent(sid)}` : ""}`;
                  return (
                    <tr key={student.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">
                        {sid || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{student.program || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {student.yearLevel || student.year_level || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status="active" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Link
                            to={referHref}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-maroon-600 text-white text-xs font-medium hover:bg-maroon-700 transition"
                            title="Refer this student to a counselor"
                          >
                            <ArrowRightLeft size={12} /> Refer
                          </Link>
                          <Link
                            to={requestHref}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                            title="Request a report from a counselor"
                          >
                            <ClipboardList size={12} /> Request report
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        className="mt-6"
        title={
          <span className="inline-flex items-center gap-1.5">
            <FileText size={14} className="text-maroon-600" /> Reports received from counselors
          </span>
        }
        subtitle={`${receivedReports.length} total — session reports submitted to you`}
        noBodyPadding
      >
        {loadingReports ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : receivedReports.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No reports yet"
            hint="Counselors who finalize a session from one of your referrals or requests will deliver the report here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">From</th>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Summary</th>
                  <th className="px-4 py-2.5">Received</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receivedReports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initialsOf(r.senderName)}
                        </div>
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {r.senderName}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{r.title}</td>
                    <td className="px-4 py-3 max-w-md text-gray-700 line-clamp-2">
                      {r.summary || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                      {new Date(r.sent_at).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setActiveReport(r)}
                          className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                          title="View report"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() =>
                            downloadReportAsDocx(parsePayload(r.report_payload), {
                              title: r.title,
                            })
                          }
                          className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                          title="Download as Word document"
                        >
                          <Download size={13} /> DOCX
                        </button>
                        <button
                          onClick={() =>
                            downloadReportAsPdf(parsePayload(r.report_payload), {
                              title: r.title,
                            })
                          }
                          className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                          title="Download / print as PDF"
                        >
                          <FileDown size={13} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Modal
        open={!!activeReport}
        onClose={() => setActiveReport(null)}
        title={activeReport?.title || "Session Report"}
        subtitle={
          activeReport
            ? `From ${activeReport.senderName} · ${new Date(activeReport.sent_at).toLocaleString()}`
            : ""
        }
        size="lg"
        footer={
          activeReport && (
            <div className="flex items-center gap-2">
              <button
                className={BTN.secondary}
                onClick={() =>
                  downloadReportAsDocx(parsePayload(activeReport.report_payload), {
                    title: activeReport.title,
                  })
                }
              >
                <Download size={14} /> DOCX
              </button>
              <button
                className={BTN.secondary}
                onClick={() =>
                  downloadReportAsPdf(parsePayload(activeReport.report_payload), {
                    title: activeReport.title,
                  })
                }
              >
                <FileDown size={14} /> PDF
              </button>
              <button className={BTN.primary} onClick={() => setActiveReport(null)}>
                Close
              </button>
            </div>
          )
        }
      >
        {activePayload ? (
          (() => {
            const r = normalizeSessionReport(activePayload);
            return (
              <dl className="divide-y divide-gray-100 text-sm">
                <ReportRow label="Student" value={r.studentName} />
                <ReportRow label="College" value={r.studentCollege} />
                <ReportRow label="Session date" value={(r.sessionDate || "").split?.("T")?.[0] || r.sessionDate} />
                <ReportRow label="Counselor" value={r.counselorName} />
                <ReportRow label="Presenting concern" value={r.presentingConcern} />
                <ReportRow label="Goals" value={r.goals} />
                <ReportRow label="Summary" value={r.summary} />
                <ReportRow label="Plan" value={r.plan} />
                <ReportRow label="Comments" value={r.comments} />
                <ReportRow label="Next session" value={r.nextSession} />
                <ReportRow label="Signed by" value={r.counselorSignature} />
              </dl>
            );
          })()
        ) : (
          <p className="text-sm text-gray-500">No payload available.</p>
        )}
      </Modal>
    </div>
  );
}

function ReportRow({ label, value }) {
  return (
    <div className="py-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-gray-900 whitespace-pre-wrap">
        {value || <span className="text-gray-400">—</span>}
      </dd>
    </div>
  );
}
