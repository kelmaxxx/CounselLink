import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";

const censorName = (name) => {
  if (!name) return name;
  return name
    .split(" ")
    .map((w) => (w.length <= 2 ? w : w[0] + "*".repeat(w.length - 2) + w[w.length - 1]))
    .join(" ");
};

const ACTION_LABELS = {
  approve_registration: "Approved registration",
  reject_registration: "Rejected registration",
  create_user: "Created user",
  update_user: "Updated user",
  delete_user: "Deleted user",
  ban_user: "Banned user",
  unban_user: "Restored user",
  create_announcement: "Created announcement",
  upload_test_result: "Uploaded test result",
  accept_appointment: "Accepted appointment",
  reject_appointment: "Rejected appointment",
  reschedule_appointment: "Rescheduled appointment",
  accept_test: "Accepted test request",
  reject_test: "Rejected test request",
  reschedule_test: "Rescheduled test request",
  urgent_counseling_request: "Urgent counseling request",
};

const ROLE_LABELS = { admin: "Admin", counselor: "Counselor", student: "Student", college_rep: "College" };

const PAGE_SIZE = 25;

export default function SystemLogs() {
  const { token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [filterAction, setFilterAction] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasFilters = filterAction || filterRole || dateFrom || dateTo;

  const clearFilters = () => {
    setFilterAction("");
    setFilterRole("");
    setDateFrom("");
    setDateTo("");
    setOffset(0);
  };

  const loadActions = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/audit-logs/actions`, { headers: authHeaders });
      if (res.ok) setActions(await res.json());
    } catch (err) {
      console.error(err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", PAGE_SIZE);
      params.set("offset", offset);
      if (filterAction) params.set("action", filterAction);
      if (filterRole) params.set("actorRole", filterRole);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`${apiBase}/api/audit-logs?${params}`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to load logs");
      setLogs(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, offset, filterAction, filterRole, dateFrom, dateTo]);

  useEffect(() => { loadActions(); }, [loadActions]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const formatTs = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

  const exportCsv = () => {
    const rows = [
      ["When", "Actor", "Role", "Action", "Target", "IP Address"],
      ...logs.map((log) => {
        const isStudent = log.actorRole === "student";
        const name = log.actorId == null ? "Public" : isStudent ? censorName(log.actorName || "") : (log.actorName || "(deleted)");
        return [
          formatTs(log.createdAt),
          name,
          ROLE_LABELS[log.actorRole] || log.actorRole || "—",
          ACTION_LABELS[log.action] || log.action,
          log.targetType ? `${log.targetType}#${log.targetId ?? ""}` : "—",
          log.ipAddress || "—",
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => { const s = String(c ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "system-logs.csv";
    link.click();
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Administrator"
        title={
          <span className="inline-flex items-center gap-2">
            <Shield size={18} className="text-maroon-600" /> System logs
          </span>
        }
        subtitle="Full audit trail of all admin and counselor actions."
        actions={
          <>
            <button onClick={exportCsv} className={BTN.secondary}>
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => { setOffset(0); loadLogs(); }}
              className={BTN.primary}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </>
        }
      />

      {/* Filters */}
      <SectionCard
        title={<span className="inline-flex items-center gap-1.5"><Filter size={13} /> Filters</span>}
        subtitle="Narrow down log entries"
        className="mb-4"
        action={
          hasFilters && (
            <button onClick={clearFilters} className="text-xs font-medium text-gray-600 hover:text-gray-900">
              Clear filters
            </button>
          )
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={LABEL}>Action</label>
            <select
              className={INPUT}
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setOffset(0); }}
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Actor role</label>
            <select
              className={INPUT}
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value); setOffset(0); }}
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="counselor">Counselor</option>
              <option value="student">Student</option>
              <option value="college_rep">College</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Date from</label>
            <input
              type="date"
              className={INPUT}
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setOffset(0); }}
            />
          </div>
          <div>
            <label className={LABEL}>Date to</label>
            <input
              type="date"
              className={INPUT}
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setOffset(0); }}
            />
          </div>
        </div>
      </SectionCard>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* Log table */}
      <SectionCard noBodyPadding>
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 text-xs flex justify-between items-center">
          <span className="font-semibold text-gray-700">System log entries</span>
          <span className="text-gray-500 tabular-nums">
            {total} entr{total === 1 ? "y" : "ies"} · Page {page} of {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Shield} title="No log entries found" hint="Try adjusting the filters above." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/40 border-b border-gray-100">
                <th className="px-4 py-2.5 w-36">When</th>
                <th className="px-4 py-2.5 w-44">Actor</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5 w-32">Target</th>
                <th className="px-4 py-2.5 w-32">IP</th>
                <th className="px-4 py-2.5 w-16">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const isStudent = log.actorRole === "student";
                const actorName = log.actorId == null
                  ? "Public (unauthenticated)"
                  : isStudent
                    ? censorName(log.actorName || "(deleted user)")
                    : (log.actorName || "(deleted user)");
                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3 text-gray-600 text-xs tabular-nums whitespace-nowrap">
                        {formatTs(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-sm font-medium text-gray-900 break-words ${isStudent ? "font-mono" : ""}`}>
                          {actorName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ROLE_LABELS[log.actorRole] || log.actorRole || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-mono break-all">
                        {log.targetType ? `${log.targetType}#${log.targetId ?? "—"}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                        {log.ipAddress || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {log.details ? (
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="text-xs font-medium text-maroon-600 hover:text-maroon-700 transition"
                          >
                            {expandedId === log.id ? "Hide" : "View"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && log.details && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all font-mono bg-gray-100 rounded-md p-3">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 flex justify-between items-center">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={13} /> Previous
          </button>
          <span className="text-xs text-gray-500 tabular-nums">
            {logs.length === 0 ? "0" : `${offset + 1}–${offset + logs.length}`} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
