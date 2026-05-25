import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Shield, Filter, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

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
};

const ROLE_LABELS = {
  admin: "Admin",
  counselor: "Counselor",
  student: "Student",
  college_rep: "College Rep",
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
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="text-maroon-600" size={28} />
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Audit Logs</h2>
            <p className="text-sm text-gray-600">All admin and counselor actions tracked for accountability.</p>
          </div>
        </div>
        <button
          onClick={() => { setOffset(0); loadLogs(); }}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 p-4 rounded-xl mb-4 shadow">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
          <Filter size={16} />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Action</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
            <label className="block text-xs text-gray-600 mb-1">Actor Role</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value); setOffset(0); }}
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="counselor">Counselor</option>
              <option value="student">Student</option>
              <option value="college_rep">College Rep</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setFilterAction(""); setFilterRole(""); setOffset(0); }}
              className="text-sm text-maroon-600 hover:text-maroon-800"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm text-gray-600 flex justify-between">
          <span>Total: {total} entr{total === 1 ? "y" : "ies"}</span>
          <span>Page {page} of {totalPages}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-700 border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 font-medium">When</th>
                <th className="py-3 px-4 font-medium">Actor</th>
                <th className="py-3 px-4 font-medium">Action</th>
                <th className="py-3 px-4 font-medium">Target</th>
                <th className="py-3 px-4 font-medium">IP</th>
                <th className="py-3 px-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">Loading...</td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">No audit log entries found.</td>
                </tr>
              )}
              {!loading && logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="border-b border-gray-200 hover:bg-gray-50 transition text-sm">
                    <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{log.actorName || "(deleted user)"}</div>
                      <div className="text-xs text-gray-500">{ROLE_LABELS[log.actorRole] || log.actorRole || "—"}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-800 text-xs font-medium rounded-full">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {log.targetType ? `${log.targetType}#${log.targetId ?? "—"}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs font-mono">{log.ipAddress || "—"}</td>
                    <td className="py-3 px-4">
                      {log.details ? (
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="text-xs text-maroon-600 hover:text-maroon-800 font-medium"
                        >
                          {expandedId === log.id ? "Hide" : "View"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && log.details && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="py-3 px-4">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all">
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
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Showing {logs.length === 0 ? 0 : offset + 1}–{offset + logs.length} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
