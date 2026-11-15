// src/components/Header.jsx
import React from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";

export default function Header({ currentUser }) {
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
        <Link to="/" className="flex items-center gap-2 min-w-0" aria-label="CounseLink home">
          <img
            src="/counselink-round.png"
            alt=""
            className="h-8 w-8 object-contain flex-shrink-0"
          />
          <span className="text-sm font-semibold tracking-tight text-gray-900 truncate">
            CounseLink
          </span>
        </Link>

        <div className="flex items-center gap-3">
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
