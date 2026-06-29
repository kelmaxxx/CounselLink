// src/components/NotificationsView.jsx
// Shared notifications page UI used by every role.
import React, { useMemo, useState } from "react";
import { useNotifications } from "../context/NotificationsContext";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  CheckCheck,
} from "lucide-react";
import { PageHeader, SectionCard, EmptyState, Modal, BTN } from "./ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const resolveImageUrl = (url) => {
  if (!url) return null;
  return url.startsWith("/") ? `${API_BASE}${url}` : url;
};

const TYPE_META = {
  success: { icon: CheckCircle2, iconClass: "text-emerald-600 bg-emerald-50" },
  warning: { icon: AlertTriangle, iconClass: "text-amber-600 bg-amber-50" },
  error: { icon: AlertCircle, iconClass: "text-red-600 bg-red-50" },
  info: { icon: Info, iconClass: "text-blue-600 bg-blue-50" },
  urgent_counseling: { icon: AlertTriangle, iconClass: "text-red-600 bg-red-50" },
};

// Announcement-originated notifications all link to "/notifications" itself
// (every other notification type links somewhere specific), so that's the
// signal we use to know which ones should open the full-announcement modal.
const isAnnouncement = (notif) => notif.link === "/notifications";

function formatRelative(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

export default function NotificationsView({ eyebrow = "Account" }) {
  const { getNotificationsForCurrentUser, markAsRead, markAllAsRead, getUnreadCount } =
    useNotifications();
  const notifications = getNotificationsForCurrentUser();
  const unreadCount = getUnreadCount();

  const [filter, setFilter] = useState("all");
  const [viewNotif, setViewNotif] = useState(null);

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    if (filter === "read") return notifications.filter((n) => n.read);
    return notifications;
  }, [notifications, filter]);

  const FilterTab = ({ value, label, count }) => (
    <button
      onClick={() => setFilter(value)}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
        filter === value
          ? "text-maroon-700 border-maroon-600"
          : "text-gray-500 border-transparent hover:text-gray-900"
      }`}
    >
      {label}
      {typeof count === "number" && (
        <span
          className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold tabular-nums ${
            filter === value ? "bg-maroon-100 text-maroon-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <PageHeader
        eyebrow={eyebrow}
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread of ${notifications.length} total`
            : `${notifications.length} total · all caught up`
        }
        actions={
          unreadCount > 0 && (
            <button onClick={markAllAsRead} className={BTN.secondary}>
              <CheckCheck size={15} />
              Mark all as read
            </button>
          )
        }
      />

      <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
        <FilterTab value="all" label="All" count={notifications.length} />
        <FilterTab value="unread" label="Unread" count={unreadCount} />
        <FilterTab value="read" label="Read" count={notifications.length - unreadCount} />
      </div>

      <SectionCard noBodyPadding>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={
              filter === "unread"
                ? "No unread notifications"
                : filter === "read"
                ? "No read notifications"
                : "No notifications yet"
            }
            hint={
              filter === "unread"
                ? "You're all caught up."
                : "When something needs your attention, it'll show up here."
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((notif) => {
              const meta = TYPE_META[notif.type] || TYPE_META.info;
              const Icon = meta.icon;
              return (
                <li
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                    if (isAnnouncement(notif)) setViewNotif(notif);
                  }}
                  className={`relative px-4 py-3 transition cursor-pointer ${
                    !notif.read ? "bg-maroon-50/30 hover:bg-maroon-50/60" : "hover:bg-gray-50/60"
                  }`}
                >
                  {!notif.read && (
                    <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r bg-maroon-600" />
                  )}
                  {notif.imageUrl && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-gray-100">
                      <img
                        src={resolveImageUrl(notif.imageUrl)}
                        alt={notif.title}
                        className="w-full max-h-72 object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.iconClass}`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className={`text-sm truncate ${
                                !notif.read
                                  ? "font-semibold text-gray-900"
                                  : "font-medium text-gray-700"
                              }`}
                            >
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full bg-maroon-600 text-white tracking-wide">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-gray-500 tabular-nums">
                              {formatRelative(notif.createdAt)}
                            </span>
                            {notif.link && isAnnouncement(notif) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!notif.read) markAsRead(notif.id);
                                  setViewNotif(notif);
                                }}
                                className="text-xs font-medium text-maroon-600 hover:underline"
                              >
                                View details →
                              </button>
                            ) : (
                              notif.link && (
                                <Link
                                  to={notif.link}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-medium text-maroon-600 hover:underline"
                                >
                                  View details →
                                </Link>
                              )
                            )}
                          </div>
                        </div>
                        {notif.read && (
                          <CheckCircle2 size={14} className="text-gray-300 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <Modal
        open={!!viewNotif}
        onClose={() => setViewNotif(null)}
        title={viewNotif?.title || "(untitled)"}
        subtitle={viewNotif ? formatRelative(viewNotif.createdAt) : ""}
        size="lg"
      >
        {viewNotif?.imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden border border-gray-100">
            <img
              src={resolveImageUrl(viewNotif.imageUrl)}
              alt={viewNotif.title}
              className="w-full max-h-80 object-cover"
            />
          </div>
        )}
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {viewNotif?.message}
        </p>
      </Modal>
    </div>
  );
}
