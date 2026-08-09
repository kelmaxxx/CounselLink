// src/components/Header.jsx
import React from "react";
import { Bell, Menu } from "lucide-react";
import { useLocation, Link, matchPath } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";
import Avatar from "./Avatar";

const ROLE_THEME = {
  student: "student",
  counselor: "counselor",
  college_rep: "rep",
  admin: "admin",
};

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
  { pattern: "/student/counselors", title: "Counselor Directory" },
  { pattern: "/student/feedback", title: "Leave Feedback" },
  { pattern: "/student/consent", title: "My Records" },
  { pattern: "/student/profile", title: "Profile" },
  { pattern: "/student/notifications", title: "Notifications" },
  { pattern: "/rep/counseling-data", title: "Counseling Data" },
  { pattern: "/rep/referrals", title: "Referrals" },
  { pattern: "/rep/request-report", title: "Request Report" },
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

export default function Header({ currentUser, onMenuClick }) {
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  const { getUnreadCount } = useNotifications();
  const unreadCount = getUnreadCount();

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
      <div className="flex items-center justify-between px-4 lg:px-8 h-16">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center w-9 h-9 -ml-1 rounded-lg hover:bg-gray-100 text-gray-600 transition"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-medium text-gray-500 truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/system-evaluation"
            target="_blank"
            className="flex items-center gap-1.5 bg-maroon-50 hover:bg-maroon-100 text-maroon-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-maroon-200 transition shadow-xs"
            title="Open Usability Survey Form"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-maroon-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-maroon-600"></span>
            </span>
            <span>Evaluate CounselLink</span>
          </Link>

          <Link
            to={notifPath}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600 transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
