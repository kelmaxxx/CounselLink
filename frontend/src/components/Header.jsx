// src/components/Header.jsx
import React from "react";
import { Bell, Search } from "lucide-react";
import { useLocation, Link, matchPath } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";

const ROUTE_TITLES = [
  { pattern: "/", title: "Dashboard" },
  { pattern: "/students", title: "Student Records" },
  { pattern: "/students/:id", title: "Student Record" },
  { pattern: "/counselor/appointments", title: "Appointments" },
  { pattern: "/counselor/referrals", title: "Referrals" },
  { pattern: "/counselor/reports", title: "Reports" },
  { pattern: "/counselor/profile", title: "Profile" },
  { pattern: "/counselor/notifications", title: "Notifications" },
  { pattern: "/student/request-appointment", title: "Request Appointment" },
  { pattern: "/student/appointments", title: "My Appointments" },
  { pattern: "/student/request-psych-test", title: "Request Psychological Test" },
  { pattern: "/student/counselors", title: "Counselor Directory" },
  { pattern: "/student/feedback", title: "Leave Feedback" },
  { pattern: "/student/consent", title: "Test Results" },
  { pattern: "/student/profile", title: "Profile" },
  { pattern: "/student/notifications", title: "Notifications" },
  { pattern: "/rep/counseling-data", title: "Counseling Data" },
  { pattern: "/rep/request-data", title: "Request Student Data" },
  { pattern: "/admin/pending-registrations", title: "Pending Registrations" },
  { pattern: "/admin/manage-users", title: "Manage Users" },
  { pattern: "/admin/announcements", title: "Announcements" },
  { pattern: "/admin/reports", title: "System Reports" },
  { pattern: "/admin/audit-logs", title: "Audit Logs" },
  { pattern: "/messages", title: "Messages" },
];

function resolveTitle(pathname) {
  for (const r of ROUTE_TITLES) {
    if (matchPath({ path: r.pattern, end: true }, pathname)) return r.title;
  }
  return "CounseLink";
}

export default function Header({ currentUser }) {
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  const { getUnreadCount } = useNotifications();
  const unreadCount = getUnreadCount();

  const initials = (currentUser?.name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const notifPath = `/${
    currentUser?.role === "student"
      ? "student"
      : currentUser?.role === "counselor"
      ? "counselor"
      : currentUser?.role === "college_rep"
      ? "rep"
      : "admin"
  }/notifications`;

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 tracking-tight truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Search shell (visual only for now) */}
          <div className="hidden md:flex items-center gap-2 px-2.5 h-8 rounded-md border border-gray-200 bg-gray-50 text-gray-400 text-xs w-64">
            <Search className="w-3.5 h-3.5" />
            <span>Search…</span>
            <span className="ml-auto text-[10px] text-gray-400 border border-gray-200 rounded px-1 py-px bg-white">⌘K</span>
          </div>

          <Link
            to={notifPath}
            className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 text-gray-600 transition"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold">
              {initials || "U"}
            </div>
            <div className="hidden sm:block min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate max-w-[140px]">
                {currentUser?.name}
              </div>
              <div className="text-[10px] text-gray-500 capitalize truncate">
                {currentUser?.role?.replace("_", " ")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
