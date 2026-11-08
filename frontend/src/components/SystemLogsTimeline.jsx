import React, { useEffect, useRef, useState } from "react";
import {
  CalendarCheck2,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Crosshair,
  FileText,
  Fingerprint,
  Globe,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";
import { BTN, EmptyState, useBodyScrollLock } from "./ui";
import {
  ROLE_LABELS,
  actionLabel,
  categoryOf,
  displayActorName,
  formatAbsoluteTime,
  formatRelativeTime,
  groupLogsByDate,
  targetLabel,
} from "../utils/logs";

const CATEGORY_STYLES = {
  appointments: {
    icon: CalendarCheck2,
    node: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  sessions: {
    icon: FileText,
    node: "bg-sky-50 text-sky-600 ring-sky-100",
    pill: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  users: {
    icon: ShieldCheck,
    node: "bg-violet-50 text-violet-600 ring-violet-100",
    pill: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  security: {
    icon: LockKeyhole,
    node: "bg-amber-50 text-amber-600 ring-amber-100",
    pill: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  system: {
    icon: Settings2,
    node: "bg-maroon-50 text-maroon-700 ring-maroon-100",
    pill: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

const AVATAR_THEME = {
  admin: "admin",
  counselor: "counselor",
  student: "student",
  college_rep: "rep",
};

const MotionDiv = motion.div;
const MotionAside = motion.aside;
const MotionLi = motion.li;

const TARGET_CLASS =
  "inline-flex max-w-full items-center break-all rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-inset ring-slate-200/70";

function TimelineItem({ log, index = 0, isLast, onOpen }) {
  const reduce = useReducedMotion();
  const style = CATEGORY_STYLES[categoryOf(log)] || CATEGORY_STYLES.system;
  const Icon = style.icon;
  const actor = displayActorName(log);
  const target = targetLabel(log);
  const role = ROLE_LABELS[log.actorRole] || log.actorRole;

  return (
    <MotionLi
      className="relative pb-7 last:pb-0"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.25,
        ease: [0.22, 1, 0.36, 1],
        delay: reduce ? 0 : Math.min(index * 0.03, 0.36),
      }}
    >
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-5 top-11 w-px bg-gray-200"
        />
      )}

      <button
        type="button"
        onClick={() => onOpen(log)}
        aria-label={`View details: ${actionLabel(log.action)}${target ? ` on ${target}` : ""}`}
        className="group flex w-full gap-3.5 rounded-xl py-1 text-left transition-colors hover:bg-gray-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500/40 focus-visible:ring-offset-2"
      >
        <span
          className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style.node}`}
        >
          <Icon size={17} strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <Avatar
              name={actor}
              size="xs"
              theme={AVATAR_THEME[log.actorRole] || "default"}
              className="ring-1 ring-gray-200"
            />
            <span className="break-words text-sm font-semibold text-gray-900">{actor}</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${style.pill}`}
            >
              {actionLabel(log.action)}
            </span>
            {target && <code className={TARGET_CLASS}>{target}</code>}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-gray-500">
            <time dateTime={log.createdAt} className="tabular-nums">
              {formatAbsoluteTime(log.createdAt)}
            </time>
            <span className="text-gray-300">·</span>
            <span className="tabular-nums">{formatRelativeTime(log.createdAt)}</span>
            {role && (
              <>
                <span className="text-gray-300">·</span>
                <span>{role}</span>
              </>
            )}
            {log.ipAddress && (
              <>
                <span className="text-gray-300">·</span>
                <span className="font-mono">IP {log.ipAddress}</span>
              </>
            )}
          </div>
        </div>
      </button>
    </MotionLi>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse gap-3.5">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-100" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-2/3 rounded bg-gray-100" />
            <div className="h-3 w-1/2 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

const prettyKey = (key) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

function SectionLabel({ children }) {
  return (
    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
      {children}
    </h4>
  );
}

function MetaTile({ icon: Icon, label, value, hint, mono = false }) {
  return (
    <div className="rounded-xl bg-gray-50/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">
        <Icon size={12} />
        {label}
      </div>
      <p className={`mt-1.5 break-words text-sm text-gray-800 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function DetailsDrawer({ log, onClose }) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);
  useBodyScrollLock(Boolean(log));

  useEffect(() => {
    if (!log) return;
    setCopied(false);
    setShowJson(false);
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [log, onClose]);

  const style = log ? CATEGORY_STYLES[categoryOf(log)] || CATEGORY_STYLES.system : null;
  const Icon = style?.icon;
  const actor = log ? displayActorName(log) : "";
  const action = log ? actionLabel(log.action) : "";
  const target = log ? targetLabel(log) : null;
  const role = log ? ROLE_LABELS[log.actorRole] || log.actorRole || "Unauthenticated" : "";
  const category = log ? categoryOf(log) : "system";
  const detailRows =
    log?.details && typeof log.details === "object" ? Object.entries(log.details) : [];
  const json = log ? JSON.stringify(log, null, 2) : "";

  const copyJson = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — nothing to do.
    }
  };

  return (
    <AnimatePresence>
      {log && (
        <MotionDiv
          className="fixed inset-0 z-[60] flex items-stretch justify-center sm:items-center sm:justify-end sm:p-6"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/25"
            onClick={onClose}
            aria-hidden="true"
          />
          <MotionAside
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Activity details"
            className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-xl outline-none sm:h-[calc(100dvh-3rem)] sm:max-w-2xl sm:rounded-3xl"
            initial={reduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: "100%" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 360, damping: 38 }
            }
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style.node}`}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                    Activity detail · #{log.id}
                  </p>
                  <h3 className="mt-0.5 truncate text-base font-semibold text-gray-900">
                    {action}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {formatRelativeTime(log.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <section>
                <SectionLabel>At a glance</SectionLabel>
                <div className="relative overflow-hidden rounded-xl border border-maroon-100/70 bg-maroon-50/40 p-4 pl-5">
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-0.5 bg-maroon-400"
                  />
                  <p className="text-sm leading-relaxed text-gray-800">
                    <span className="font-semibold text-gray-900">{actor}</span>{" "}
                    {action.toLowerCase()}
                    {target ? (
                      <>
                        {" "}on <code className={TARGET_CLASS}>{target}</code>
                      </>
                    ) : null}
                    .
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${style.pill}`}
                    >
                      {category}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                      {role}
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <SectionLabel>Performed by</SectionLabel>
                <div className="flex items-center gap-3 rounded-xl bg-gray-50/70 p-3">
                  <Avatar
                    name={actor}
                    size="md"
                    theme={AVATAR_THEME[log.actorRole] || "default"}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{actor}</p>
                    <p className="truncate text-xs text-gray-500">
                      {role}
                      {log.actorId != null ? ` · ID #${log.actorId}` : ""}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <SectionLabel>Context</SectionLabel>
                <div className="grid grid-cols-2 gap-2.5">
                  <MetaTile
                    icon={Clock}
                    label="Time"
                    value={formatAbsoluteTime(log.createdAt)}
                    hint={formatRelativeTime(log.createdAt)}
                  />
                  <MetaTile
                    icon={Globe}
                    label="IP address"
                    value={log.ipAddress || "Not recorded"}
                    mono
                  />
                  <MetaTile
                    icon={Crosshair}
                    label="Target"
                    value={target || "System-wide"}
                    mono={Boolean(target)}
                  />
                  <MetaTile icon={Fingerprint} label="Event ID" value={`#${log.id}`} mono />
                </div>
              </section>

              <section>
                <SectionLabel>Recorded details</SectionLabel>
                {detailRows.length ? (
                  <dl className="overflow-hidden rounded-xl border border-gray-100">
                    {detailRows.map(([key, value], index) => (
                      <div
                        key={key}
                        className={`grid grid-cols-[8.5rem_1fr] gap-3 px-3.5 py-2.5 ${
                          index % 2 ? "bg-white" : "bg-gray-50/40"
                        }`}
                      >
                        <dt className="truncate pt-0.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                          {prettyKey(key)}
                        </dt>
                        <dd className="min-w-0 break-words font-mono text-xs text-gray-700">
                          {formatDetailValue(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="rounded-xl border border-dashed border-gray-100 px-4 py-5 text-center text-sm text-gray-400">
                    No extra details were recorded for this event.
                  </p>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between gap-2">
                  <SectionLabel>Raw event</SectionLabel>
                  <button
                    type="button"
                    onClick={copyJson}
                    className="mb-2.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy JSON"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJson((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg bg-gray-50/70 px-3.5 py-2.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                >
                  <span>{showJson ? "Hide raw JSON" : "Show raw JSON"}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${showJson ? "rotate-180" : ""}`}
                  />
                </button>
                {showJson && (
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-slate-100">
                    {json}
                  </pre>
                )}
              </section>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end border-t border-gray-100 px-5 py-3 sm:px-6">
              <button type="button" onClick={onClose} className={BTN.secondary}>
                Close
              </button>
            </div>
          </MotionAside>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

export default function SystemLogsTimeline({ logs = [], loading = false, emptyHint }) {
  const [activeLog, setActiveLog] = useState(null);

  if (loading) return <TimelineSkeleton />;

  if (!logs.length) {
    return (
      <EmptyState
        icon={Settings2}
        title="No activity found"
        hint={emptyHint || "Try a different search term or filter."}
      />
    );
  }

  return (
    <>
      <div className="space-y-7">
        {groupLogsByDate(logs).map((group) => (
          <section key={group.key} aria-label={group.label}>
            <header className="mb-4 flex items-center gap-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                {group.label}
              </h3>
              <span className="h-px flex-1 bg-gray-100" />
              <span className="text-[11px] tabular-nums text-gray-400">
                {group.logs.length} {group.logs.length === 1 ? "event" : "events"}
              </span>
            </header>

            <ol>
              {group.logs.map((log, index) => (
                <TimelineItem
                  key={log.id}
                  log={log}
                  index={index}
                  isLast={index === group.logs.length - 1}
                  onOpen={setActiveLog}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>

      <DetailsDrawer log={activeLog} onClose={() => setActiveLog(null)} />
    </>
  );
}
