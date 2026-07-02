import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";

const ACTION_LABELS = {
  approve_registration: "Approved registration",
  reject_registration: "Rejected registration",
  create_user: "Created user",
  update_user: "Updated user",
  delete_user: "Deleted user",
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

const ROLE_LABELS = {
  admin: "Admin",
  counselor: "Counselor",
  student: "Student",
  college_rep: "College",
};

const PAGE_SIZE = 25;

export default function AuditLogs() {
  const { token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState([]);
  const [filterAction, setFilterAction] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

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

      const res = await fetch(`${apiBase}/api/audit-logs?${params}`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to load audit logs");
      setLogs(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, offset, filterAction, filterRole]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = filterAction || filterRole;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Administrator"
        title={
          <span className="inline-flex items-center gap-2">
            <Shield size={18} className="text-maroon-600" /> Audit logs
          </span>
        }
        subtitle="Admin and counselor actions tracked for accountability."
        actions={
          <button
            onClick={() => {
              setOffset(0);
              loadLogs();
            }}
            className={BTN.secondary}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <Filter size={13} /> Filters
          </span>
        }
        subtitle="Narrow down logs by action or actor role"
        className="mb-4"
        action={
          hasActiveFilters && (
            <button
              onClick={() => {
                setFilterAction("");
                setFilterRole("");
                setOffset(0);
              }}
              className="text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </button>
          )
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Action</label>
            <select
              className={INPUT}
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a] || a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Actor role</label>
            <select
              className={INPUT}
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="counselor">Counselor</option>
              <option value="student">Student</option>
              <option value="college_rep">College</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <SectionCard noBodyPadding>
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 text-xs text-gray-600 flex justify-between items-center">
          <span className="tabular-nums">
            Total: {total} entr{total === 1 ? "y" : "ies"}
          </span>
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Shield} title="No audit log entries found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/40 border-b border-gray-100">
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5">IP</th>
                  <th className="px-4 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs tabular-nums">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {log.actorId == null ? "Public (unauthenticated)" : log.actorName || "(deleted user)"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {ROLE_LABELS[log.actorRole] || log.actorRole || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs font-mono">
                        {log.targetType ? `${log.targetType}#${log.targetId ?? "—"}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                        {log.ipAddress || "—"}
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
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && log.details && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all font-mono">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 flex justify-between items-center">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={13} /> Previous
          </button>
          <span className="text-xs text-gray-600 tabular-nums">
            Showing {logs.length === 0 ? 0 : offset + 1}–{offset + logs.length} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
