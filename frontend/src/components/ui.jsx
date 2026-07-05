// src/components/ui.jsx
// Shared primitives for the minimalist / professional design system.
import React from "react";
import { Inbox, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";

export function PageHeader({ eyebrow, title, subtitle, actions, className = "" }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 mb-8 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, accent = "bg-gray-400" }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-950/5 transition hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${accent}`} />
          <span className="text-xs font-medium text-gray-500">{label}</span>
        </div>
        {Icon && <Icon size={16} className="text-gray-400" />}
      </div>
      <div className="text-3xl font-semibold text-gray-900 tabular-nums leading-tight">
        {value}
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1.5">{hint}</p>}
    </div>
  );
}

export function SectionCard({ title, subtitle, action, children, className = "", bodyClassName = "", noBodyPadding = false }) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm ring-1 ring-gray-950/5 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </header>
      )}
      <div className={noBodyPadding ? bodyClassName : `px-5 py-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action, className = "" }) {
  return (
    <div className={`px-4 py-14 text-center ${className}`}>
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-3">
        <Icon size={20} />
      </div>
      <p className="text-base font-medium text-gray-700">{title}</p>
      {hint && <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Big-number stat card (minimalist dashboard style) ────────────────────
// Airy card with an oversized number and a soft tinted icon chip. Use `tone`
// to pick the chip color; falls back to a neutral gray.
const STAT_TONES = {
  gray: "bg-gray-100 text-gray-500",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
  blue: "bg-blue-100 text-blue-600",
  sky: "bg-sky-100 text-sky-600",
  purple: "bg-purple-100 text-purple-600",
  maroon: "bg-maroon-100 text-maroon-700",
};

export function BigStat({ label, value, hint, icon: Icon, tone = "gray" }) {
  return (
    <div className="bg-white rounded-3xl p-6 ring-1 ring-gray-950/5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {Icon && (
          <span
            className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${STAT_TONES[tone] || STAT_TONES.gray}`}
          >
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="mt-5 text-5xl font-semibold text-gray-900 tabular-nums leading-none tracking-tight">
        {value}
      </div>
      {hint && <p className="mt-3 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ── Center-label donut with a clean custom legend ────────────────────────
// Thin ring with a big total in the middle. `data` items: { name, value, color }.
export function DonutStat({ data, total, centerLabel, emptyIcon, emptyTitle, tooltipFormatter, stack = false, compact = false }) {
  if (!data.length) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} />;
  }
  // `stack` keeps the donut on top and the legend below at full width — better
  // for narrow cards where a side-by-side legend would get cramped/truncated.
  // `compact` shrinks text and spacing to fit many legend items (e.g. all colleges).
  return (
    <div
      className={`flex items-center gap-6 py-2 ${stack ? "flex-col" : "flex-col sm:flex-row"}`}
    >
      {/* In stack mode the donut fills card width (capped); in row mode it stays a fixed square */}
      <div
        className={`relative overflow-hidden ${stack ? "w-full" : "flex-shrink-0"}`}
        style={stack ? { maxWidth: 180, height: 180, margin: "0 auto" } : { width: 170, height: 170 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={compact ? 58 : 66}
              outerRadius={compact ? 78 : 84}
              paddingAngle={3}
              cornerRadius={6}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`font-semibold text-gray-900 tabular-nums leading-none ${compact ? "text-3xl" : "text-4xl"}`}>
            {total}
          </span>
          <span className="text-xs text-gray-400 mt-1">{centerLabel}</span>
        </div>
      </div>
      <ul className={`flex-1 w-full ${compact ? "grid grid-cols-2 gap-x-3 gap-y-0.5" : "space-y-2.5"}`}>
        {data.map((d) => (
          <li
            key={d.name}
            className={`grid items-center gap-x-1.5 ${compact ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto_auto] gap-x-4 text-sm"}`}
          >
            <span className="flex items-center gap-1 min-w-0">
              <span
                className={`rounded-full flex-shrink-0 ${compact ? "w-1.5 h-1.5" : "w-2 h-2"}`}
                style={{ background: d.color }}
              />
              <span className={`text-gray-600 truncate ${compact ? "text-[10px]" : ""}`}>{d.name}</span>
            </span>
            <span className={`text-right font-medium text-gray-900 tabular-nums ${compact ? "text-[10px] w-4" : "w-8"}`}>
              {d.value}
            </span>
            <span className={`text-right font-normal text-gray-400 tabular-nums ${compact ? "text-[10px] w-6" : "w-9"}`}>
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Horizontal ranked bar chart (recharts) ───────────────────────────────
// Built for "X by category" data with many categories (e.g. 12+ colleges):
// sorts high→low, labels sit on the left in a fixed-width column so the bars
// start at the same x across charts and never overlap. The chart height grows
// to fit every row natively (no scrolling). `data` items: { name, value, color }.
export function RankedBarChart({
  data,
  emptyIcon,
  emptyTitle,
  rowHeight = 40,
  labelWidth = 60,
  tooltipFormatter,
  maxRows,
  othersColor = "#94a3b8",
}) {
  if (!data.length) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} />;
  }
  const ranked = [...data].sort((a, b) => b.value - a.value);
  // Keep overview tiles compact and grid-balanced: show the top (maxRows-1)
  // categories and roll the long tail into a single "Others" bar rather than
  // letting the panel grow to dozens of rows.
  let sorted = ranked;
  if (maxRows && ranked.length > maxRows) {
    const head = ranked.slice(0, maxRows - 1);
    const tail = ranked.slice(maxRows - 1);
    const othersValue = tail.reduce((sum, d) => sum + d.value, 0);
    sorted = [
      ...head,
      { name: `Others (${tail.length})`, value: othersValue, color: othersColor },
    ];
  }
  const chartHeight = Math.max(sorted.length * rowHeight, rowHeight);
  return (
    <div style={{ width: "100%", height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 34, left: 4, bottom: 4 }}
          barCategoryGap="22%"
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={labelWidth}
            tick={{ fontSize: 12, fill: "#4b5563" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={tooltipFormatter}
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} maxBarSize={22}>
            {sorted.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              style={{ fontSize: 12, fill: "#374151", fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const STATUS_PALETTE = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rescheduled: "bg-sky-50 text-sky-700",
  followup: "bg-indigo-50 text-indigo-700",
  urgent: "bg-red-50 text-red-700",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  canceled: "bg-gray-100 text-gray-600",
  fulfilled: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-700",
  completed: "bg-emerald-50 text-emerald-700",
  no_show: "bg-orange-50 text-orange-600",
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
  confirmed: "bg-emerald-50 text-emerald-700",
};

// User-facing label overrides for stored enum values. The DB still stores
// 'rejected' so we keep that value end-to-end; only the rendered pill label
// is swapped to the friendlier "Declined" wording the spec uses. 'followup'
// isn't a real appointment status (the DB only has approved/rescheduled/etc.)
// — callers pass it in as a computed display-only status for appointments
// created as a follow-up from a finalized session.
const STATUS_LABEL_OVERRIDES = {
  rejected: "Declined",
  followup: "Follow-up",
  no_show: "Missed",
  urgent: "Urgent",
};

export function StatusPill({ status, children, className = "" }) {
  const key = (status || "").toLowerCase();
  const palette = STATUS_PALETTE[key] || "bg-gray-100 text-gray-700";
  const overridden = STATUS_LABEL_OVERRIDES[key];
  const label =
    children ??
    overridden ??
    (status ? status.charAt(0).toUpperCase() + status.slice(1) : "—");
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${palette} ${className}`}
    >
      {label}
    </span>
  );
}

const MODAL_SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "5xl": "max-w-5xl",
  "7xl": "max-w-7xl",
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  danger = false,
  align = "center",
}) {
  if (!open) return null;
  const alignClass = align === "top" ? "items-start" : "items-center";
  return (
    <div
      className={`fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center p-4 z-[60] overflow-y-auto ${alignClass}`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-xl w-full ${MODAL_SIZES[size] || MODAL_SIZES.md} my-8`}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`text-lg font-semibold ${danger ? "text-red-700" : "text-gray-900"}`}>
              {title}
            </h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 transition flex-shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Common button class strings for consistency
export const BTN = {
  primary:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-maroon-600 hover:bg-maroon-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  secondary:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  danger:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  success:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  ghost:
    "inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors",
};

export const INPUT =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon-500/25 focus:border-maroon-500 disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400";

export const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

export function initialsOf(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ── Date formatting ──────────────────────────────────────────────────
// Backend DATE columns come back as full ISO strings (e.g.
// "2026-06-30T00:00:00.000Z"). Rendering those raw looks awful, so these
// helpers turn them into clean, human labels: "Jun 30, 2026".
//
// For plain date-only values we build the Date from the y/m/d parts so the
// label never shifts a day due to UTC↔local timezone conversion.
export function formatDate(value, fallback = "—") {
  if (!value) return fallback;
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(s);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value, fallback = "—") {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Pagination ───────────────────────────────────────────────────────
// Client-side pager for tables/lists: numbered pages plus prev/next. When
// there are many pages it shows a window around the current page with "…"
// gaps so the control never overflows. Renders nothing for a single page.
export function Pagination({ page, totalPages, onPageChange, className = "" }) {
  if (!totalPages || totalPages <= 1) return null;

  const go = (p) => onPageChange(Math.min(totalPages, Math.max(1, p)));

  // Build a compact list of page numbers with ellipsis gaps.
  const pages = [];
  const window = 1; // pages shown on each side of the current page
  for (let p = 1; p <= totalPages; p += 1) {
    const inWindow = p === 1 || p === totalPages || Math.abs(p - page) <= window;
    if (inWindow) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  const navBtn =
    "inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div
      className={`px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-center gap-1 ${className}`}
    >
      <button onClick={() => go(page - 1)} disabled={page === 1} className={navBtn}>
        <ChevronLeft size={13} /> Prev
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1.5 text-xs text-gray-400 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            aria-current={p === page ? "page" : undefined}
            className={`h-7 min-w-[28px] px-2 rounded-md border text-xs font-medium tabular-nums transition ${
              p === page
                ? "border-maroon-600 bg-maroon-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => go(page + 1)}
        disabled={page === totalPages}
        className={navBtn}
      >
        Next <ChevronRight size={13} />
      </button>
    </div>
  );
}
