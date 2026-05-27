// src/components/ui.jsx
// Shared primitives for the dense / professional design system.
import React from "react";
import { Inbox, X } from "lucide-react";

export function PageHeader({ eyebrow, title, subtitle, actions, className = "" }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 mb-6 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-0.5">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, accent = "bg-gray-400" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${accent}`} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
            {label}
          </span>
        </div>
        {Icon && <Icon size={14} className="text-gray-400" />}
      </div>
      <div className="text-2xl font-semibold text-gray-900 tabular-nums leading-tight">
        {value}
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

export function SectionCard({ title, subtitle, action, children, className = "", bodyClassName = "", noBodyPadding = false }) {
  return (
    <section className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </header>
      )}
      <div className={noBodyPadding ? bodyClassName : `px-4 py-3 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action, className = "" }) {
  return (
    <div className={`px-4 py-10 text-center ${className}`}>
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-400 mb-2">
        <Icon size={16} />
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {hint && <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const STATUS_PALETTE = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rescheduled: "bg-sky-50 text-sky-700 border-sky-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  canceled: "bg-gray-100 text-gray-600 border-gray-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-gray-100 text-gray-600 border-gray-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// User-facing label overrides for stored enum values. The DB still stores
// 'rejected' so we keep that value end-to-end; only the rendered pill label
// is swapped to the friendlier "Declined" wording the spec uses.
const STATUS_LABEL_OVERRIDES = {
  rejected: "Declined",
};

export function StatusPill({ status, children, className = "" }) {
  const key = (status || "").toLowerCase();
  const palette = STATUS_PALETTE[key] || "bg-gray-100 text-gray-700 border-gray-200";
  const overridden = STATUS_LABEL_OVERRIDES[key];
  const label =
    children ??
    overridden ??
    (status ? status.charAt(0).toUpperCase() + status.slice(1) : "—");
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${palette} ${className}`}
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
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center p-4 z-50 overflow-y-auto ${alignClass}`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-lg border border-gray-200 shadow-xl w-full ${MODAL_SIZES[size] || MODAL_SIZES.md} my-8`}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`text-base font-semibold ${danger ? "text-red-700" : "text-gray-900"}`}>
              {title}
            </h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
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
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/60 rounded-b-lg">
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
    "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-maroon-600 hover:bg-maroon-700 text-white text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed",
  secondary:
    "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-100 transition disabled:opacity-60 disabled:cursor-not-allowed",
  danger:
    "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed",
  success:
    "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed",
  ghost:
    "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition",
};

export const INPUT =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 disabled:bg-gray-100 disabled:cursor-not-allowed";

export const LABEL = "block text-xs font-medium text-gray-700 mb-1";

export function initialsOf(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
