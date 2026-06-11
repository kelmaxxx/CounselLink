// src/components/Header.jsx
import React from "react";
import { Bell } from "lucide-react";
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
  { pattern: "/student/request-psych-test", title: "Request Psychological Test" },
  { pattern: "/student/counselors", title: "Counselor Directory" },
  { pattern: "/student/feedback", title: "Leave Feedback" },
  { pattern: "/student/consent", title: "Test Results" },
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

export default function Header({ currentUser }) {
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
      <div className="flex items-center justify-between px-8 h-16">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-sm font-medium text-gray-500 truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-2">

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

          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-200">
            <Avatar
              name={currentUser?.name}
              url={currentUser?.avatarUrl}
              size="xs"
              theme={ROLE_THEME[currentUser?.role] || "default"}
            />
            <div className="hidden sm:block min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate max-w-[160px]">
                {currentUser?.name}
              </div>
              <div className="text-xs text-gray-500 capitalize truncate">
                {currentUser?.role?.replace("_", " ")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
