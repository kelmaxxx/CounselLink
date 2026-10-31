import React, { useState } from "react";
import {
  ArrowUpRight,
  CalendarCheck2,
  FileText,
  LockKeyhole,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import Avatar from "./Avatar";
import { BTN, EmptyState, Modal } from "./ui";
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

const TARGET_CLASS =
  "inline-flex max-w-full items-center break-all rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-inset ring-slate-200/70";

function TimelineItem({ log, isLast, onOpen }) {
  const style = CATEGORY_STYLES[categoryOf(log)] || CATEGORY_STYLES.system;
  const Icon = style.icon;
  const actor = displayActorName(log);
  const target = targetLabel(log);
  const role = ROLE_LABELS[log.actorRole] || log.actorRole;

  return (
    <li className="relative flex gap-3.5 pb-7 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-5 top-11 w-px bg-gray-200"
        />
      )}

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
          {log.details && (
            <>
              <span className="text-gray-300">·</span>
              <button
                type="button"
                onClick={() => onOpen(log)}
                className="inline-flex items-center gap-0.5 font-medium text-maroon-700 transition-colors hover:text-maroon-800"
              >
                View details
                <ArrowUpRight size={11} />
              </button>
            </>
          )}
        </div>
      </div>
    </li>
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

function DetailsModal({ log, onClose }) {
  if (!log) return null;
  const style = CATEGORY_STYLES[categoryOf(log)] || CATEGORY_STYLES.system;

  return (
    <Modal
      open
      onClose={onClose}
      title="Activity details"
      subtitle={`${actionLabel(log.action)} · ${targetLabel(log) || "system"}`}
      size="lg"
      footer={
        <button type="button" className={BTN.secondary} onClick={onClose}>
          Close
        </button>
      }
    >
      <dl className="grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-3 text-sm">
        <dt className="text-gray-500">Actor</dt>
        <dd className="font-medium text-gray-900">
          {displayActorName(log)}{" "}
          <span className="font-normal text-gray-500">
            ({ROLE_LABELS[log.actorRole] || log.actorRole || "—"})
          </span>
        </dd>

        <dt className="text-gray-500">Action</dt>
        <dd>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${style.pill}`}
          >
            {actionLabel(log.action)}
          </span>
        </dd>

        <dt className="text-gray-500">Target</dt>
        <dd>
          {targetLabel(log) ? (
            <code className={TARGET_CLASS}>{targetLabel(log)}</code>
          ) : (
            "—"
          )}
        </dd>

        <dt className="text-gray-500">When</dt>
        <dd className="text-gray-700">
          {formatAbsoluteTime(log.createdAt)}{" "}
          <span className="text-gray-400">· {formatRelativeTime(log.createdAt)}</span>
        </dd>

        <dt className="text-gray-500">IP address</dt>
        <dd className="font-mono text-gray-700">{log.ipAddress || "—"}</dd>
      </dl>

      {log.details && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Payload
          </p>
          <pre className="max-h-72 overflow-auto rounded-xl bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-200">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </div>
      )}
    </Modal>
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
                  isLast={index === group.logs.length - 1}
                  onOpen={setActiveLog}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>

      <DetailsModal log={activeLog} onClose={() => setActiveLog(null)} />
    </>
  );
}
