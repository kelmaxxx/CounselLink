import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useReactToPrint } from "react-to-print";
import {
  Download,
  Printer,
  Users,
  Calendar,
  ClipboardList,
  Clock3,
  CheckCircle2,
  XCircle,
  Filter as FilterIcon,
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
} from "../../components/ui";

const STATUS_LABELS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "approved", label: "Approved" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "counseling", label: "Counseling" },
  { value: "psychological_test", label: "Psychological test" },
];

const normalizeDateValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && value.includes("T")) return value.split("T")[0];
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
      if (!response.ok) throw new Error(data.message || "Unable to load report");
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
      if (filters.type !== "all" && apt.appointment_type !== filters.type) return false;
      if (filters.status !== "all" && apt.status !== filters.status) return false;
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

  const appointmentStatuses = counselingAppointments.reduce((acc, apt) => {
    acc[apt.status] = (acc[apt.status] || 0) + 1;
    return acc;
  }, {});

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

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "admin-report",
  });

  const [detailsOpen, setDetailsOpen] = useState(false);

  const detailsPayload = useMemo(
    () => ({
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
    }),
    [
      filters,
      reportData,
      totalAppointments,
      totalTests,
      pendingRequests,
      appointmentStatuses,
      recentActivity,
    ]
  );

  const exportCsv = () => {
    const rows = [];
    rows.push(["CounselLink MSU-Marawi — Admin Report"]);
    rows.push(["Generated", detailsPayload.generatedAt]);
    rows.push([]);
    rows.push(["Filters"]);
    rows.push(["Type", filters.type]);
    rows.push(["Status", filters.status]);
    rows.push(["Date From", filters.dateFrom || "(any)"]);
    rows.push(["Date To", filters.dateTo || "(any)"]);
    rows.push([]);
    rows.push(["Users by Role"]);
    rows.push(["Role", "Count"]);
    rows.push(["Students", students]);
    rows.push(["Counselors", counselors]);
    rows.push(["College Representatives", reps]);
    rows.push(["Admins", admins]);
    rows.push([]);
    rows.push(["Totals"]);
    rows.push(["Counseling Appointments", totalAppointments]);
    rows.push(["Test Requests", totalTests]);
    rows.push(["Pending", pendingRequests]);
    rows.push([]);
    rows.push(["Appointment Statuses"]);
    Object.entries(appointmentStatuses).forEach(([k, v]) => rows.push([k, v]));
    rows.push([]);
    rows.push(["Recent Activity"]);
    rows.push(["Student", "Date", "Status"]);
    recentActivity.forEach((apt) =>
      rows.push([
        apt.studentName || "Student",
        apt.preferredDate || apt.scheduledDate || "",
        apt.status,
      ])
    );

    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters =
    filters.type !== "all" || filters.status !== "all" || filters.dateFrom || filters.dateTo;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Administrator"
        title="System reports"
        subtitle="Aggregated counseling and user activity"
        actions={
          <>
            <button onClick={exportCsv} className={BTN.secondary}>
              <Download size={14} /> Export CSV
            </button>
            <button onClick={handlePrint} className={BTN.primary}>
              <Printer size={14} /> Print
            </button>
          </>
        }
      />

      <div ref={printRef}>
        {/* Filters */}
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <FilterIcon size={13} /> Filters
            </span>
          }
          subtitle="Refine all sections below"
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
              <label className={LABEL}>Type</label>
              <select className={INPUT} value={filters.type} onChange={updateFilter("type")}>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select className={INPUT} value={filters.status} onChange={updateFilter("status")}>
                {STATUS_LABELS.map((o) => (
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
          </div>
        </SectionCard>

        {loading ? (
          <SectionCard noBodyPadding>
            <div className="px-4 py-8 text-center text-sm text-gray-500">Loading report…</div>
          </SectionCard>
        ) : error ? (
          <div className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Total users"
                value={totalUsers}
                hint={`${students} students · ${counselors} counselors`}
                icon={Users}
                accent="bg-gray-400"
              />
              <StatCard
                label="Counseling sessions"
                value={totalAppointments}
                hint="Filtered records"
                icon={Calendar}
                accent="bg-emerald-500"
              />
              <StatCard
                label="Test requests"
                value={totalTests}
                hint="Filtered records"
                icon={ClipboardList}
                accent="bg-blue-500"
              />
              <StatCard
                label="Pending"
                value={pendingRequests}
                hint="Across all queues"
                icon={Clock3}
                accent="bg-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <SectionCard title="User statistics" subtitle="By role">
                <dl className="space-y-2 text-sm">
                  <Row label="Students" value={students} />
                  <Row label="Counselors" value={counselors} />
                  <Row label="College deans" value={reps} />
                  <Row label="Admins" value={admins} />
                  <div className="pt-2 mt-1 border-t border-gray-100">
                    <Row label="Total" value={totalUsers} strong />
                  </div>
                </dl>
              </SectionCard>

              <SectionCard
                title="System activity"
                subtitle="Counseling and tests"
                action={
                  <button
                    onClick={() => setDetailsOpen(true)}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Details
                  </button>
                }
              >
                <dl className="space-y-2 text-sm">
                  <Row label="Counseling sessions" value={totalAppointments} />
                  <Row label="Test requests" value={totalTests} />
                  <Row label="Pending requests" value={pendingRequests} />
                  <div className="pt-2 mt-1 border-t border-gray-100">
                    <Row label="Filtered records" value={filteredAppointments.length} strong />
                  </div>
                </dl>
              </SectionCard>

              <SectionCard title="Counseling status" subtitle="Breakdown">
                <dl className="space-y-2 text-sm">
                  <Row
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={12} className="text-amber-500" /> Pending
                      </span>
                    }
                    value={appointmentStatuses.pending || 0}
                  />
                  <Row
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Accepted
                      </span>
                    }
                    value={acceptedCount}
                  />
                  <Row
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <XCircle size={12} className="text-red-500" /> Rejected
                      </span>
                    }
                    value={appointmentStatuses.rejected || 0}
                  />
                  <div className="pt-2 mt-1 border-t border-gray-100">
                    <Row label="Total" value={totalAppointments} strong />
                  </div>
                </dl>
              </SectionCard>
            </div>

            <SectionCard title="Recent activity" subtitle="Latest 5 records" noBodyPadding>
              {recentActivity.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No recent activity"
                  hint="Try adjusting the filters above."
                />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recentActivity.map((apt) => (
                    <li
                      key={apt.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {apt.studentName || "Student"}
                        </p>
                        <p className="text-xs text-gray-500 tabular-nums">
                          {apt.preferredDate || apt.scheduledDate || "No date"}
                        </p>
                      </div>
                      <StatusPill status={apt.status} />
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </>
        )}
      </div>

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Report details"
        subtitle={`Generated ${new Date(detailsPayload.generatedAt).toLocaleString()}`}
        size="2xl"
        align="top"
        footer={
          <>
            <button onClick={exportCsv} className={BTN.secondary}>
              <Download size={14} /> Export CSV
            </button>
            <button onClick={() => setDetailsOpen(false)} className={BTN.primary}>
              Close
            </button>
          </>
        }
      >
        <section className="mb-4">
          <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
            Users by role
          </h4>
          <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
            <tbody className="divide-y divide-gray-100">
              <DetailRow label="Students" value={students} />
              <DetailRow label="Counselors" value={counselors} />
              <DetailRow label="College deans" value={reps} />
              <DetailRow label="Admins" value={admins} />
            </tbody>
          </table>
        </section>

        <section className="mb-4">
          <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
            Totals
          </h4>
          <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
            <tbody className="divide-y divide-gray-100">
              <DetailRow label="Counseling appointments" value={totalAppointments} />
              <DetailRow label="Test requests" value={totalTests} />
              <DetailRow label="Pending" value={pendingRequests} />
            </tbody>
          </table>
        </section>

        {Object.keys(appointmentStatuses).length > 0 && (
          <section className="mb-4">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
              Appointment statuses
            </h4>
            <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
              <tbody className="divide-y divide-gray-100">
                {Object.entries(appointmentStatuses).map(([k, v]) => (
                  <DetailRow key={k} label={k} value={v} capitalize />
                ))}
              </tbody>
            </table>
          </section>
        )}

        {recentActivity.length > 0 && (
          <section>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
              Recent activity
            </h4>
            <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Student
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentActivity.map((apt) => (
                  <tr key={apt.id}>
                    <td className="px-3 py-2">{apt.studentName || "Student"}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {apt.preferredDate || apt.scheduledDate || "—"}
                    </td>
                    <td className="px-3 py-2 capitalize">{apt.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-600">{label}</dt>
      <dd
        className={`tabular-nums ${
          strong ? "font-semibold text-gray-900" : "text-gray-900 font-medium"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function DetailRow({ label, value, capitalize = false }) {
  return (
    <tr>
      <td className={`px-3 py-2 text-gray-700 ${capitalize ? "capitalize" : ""}`}>{label}</td>
      <td className="px-3 py-2 text-right font-medium text-gray-900 tabular-nums">{value}</td>
    </tr>
  );
}
