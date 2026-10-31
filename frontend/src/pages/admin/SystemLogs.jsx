import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Activity,
  Download,
  RefreshCw,
  Search,
  Shield,
  X,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  Pagination,
} from "../../components/ui";
import SystemLogsTimeline from "../../components/SystemLogsTimeline";
import {
  ROLE_LABELS,
  actionLabel,
  displayActorName,
  formatAbsoluteTime,
  targetLabel,
} from "../../utils/logs";

const PAGE_SIZE = 25;

const CATEGORIES = [
  { id: "everything", label: "Everything" },
  { id: "appointments", label: "Appointments" },
  { id: "sessions", label: "Sessions" },
  { id: "users", label: "Users" },
  { id: "security", label: "Security" },
];

const DATE_INPUT =
  "h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/20";

export default function SystemLogs() {
  const { token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("everything");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Debounce the search so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadLogs = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", PAGE_SIZE);
        params.set("offset", offset);
        if (search) params.set("q", search);
        if (category !== "everything") params.set("category", category);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`${apiBase}/api/audit-logs?${params}`, {
          headers: authHeaders,
          signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load logs");
        setLogs(data.items);
        setTotal(data.total);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [apiBase, authHeaders, offset, search, category, dateFrom, dateTo]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadLogs(controller.signal);
    return () => controller.abort();
  }, [loadLogs]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = query || category !== "everything" || dateFrom || dateTo;

  const clearFilters = () => {
    setQuery("");
    setSearch("");
    setCategory("everything");
    setDateFrom("");
    setDateTo("");
    setOffset(0);
  };

  const exportCsv = () => {
    const rows = [
      ["When", "Actor", "Role", "Action", "Target", "IP Address"],
      ...logs.map((log) => [
        formatAbsoluteTime(log.createdAt),
        displayActorName(log),
        ROLE_LABELS[log.actorRole] || log.actorRole || "—",
        actionLabel(log.action),
        targetLabel(log) || "—",
        log.ipAddress || "—",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((c) => {
            const s = String(c ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "system-logs.csv";
    link.click();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        eyebrow="Administrator"
        title={
          <span className="inline-flex items-center gap-2">
            <Activity size={18} className="text-maroon-600" /> Activity log
          </span>
        }
        subtitle="A chronological audit trail of every action across CounselLink."
        actions={
          <>
            <button onClick={exportCsv} disabled={!logs.length} className={BTN.secondary}>
              <Download size={14} /> Export CSV
            </button>
            <button onClick={() => loadLogs()} disabled={loading} className={BTN.primary}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </>
        }
      />

      {/* Quick filters */}
      <div className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-950/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actors, actions, targets, or IP…"
              aria-label="Search activity logs"
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-10 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus:border-maroon-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon-500/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter by category"
            className="flex items-center gap-1 overflow-x-auto pb-0.5 lg:pb-0"
          >
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategory(c.id);
                    setOffset(0);
                  }}
                  aria-pressed={active}
                  className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-medium transition-colors duration-200 ${
                    active
                      ? "border-maroon-600 bg-maroon-600 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Date range
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setOffset(0);
            }}
            aria-label="From date"
            className={DATE_INPUT}
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setOffset(0);
            }}
            aria-label="To date"
            className={DATE_INPUT}
          />
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <SectionCard
        noBodyPadding
        title={
          <span className="inline-flex items-center gap-2">
            <Shield size={14} className="text-maroon-600" /> Activity stream
          </span>
        }
        subtitle={
          loading
            ? "Loading activity…"
            : `${total} entr${total === 1 ? "y" : "ies"} · Page ${page} of ${totalPages}`
        }
      >
        <div className="px-4 py-5 sm:px-5">
          <SystemLogsTimeline
            logs={logs}
            loading={loading}
            emptyHint={
              hasFilters
                ? "Try a different search term, category, or date range."
                : "Actions will appear here as they happen."
            }
          />
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => setOffset((p - 1) * PAGE_SIZE)}
        />
      </SectionCard>
    </div>
  );
}
