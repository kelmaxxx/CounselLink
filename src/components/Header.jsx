// src/components/Header.jsx
import React, { useState } from "react";
import { Bell, User, Search, X } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";

export default function Header({ currentUser }) {
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const title = isDashboard ? "Dashboard" : "CounseLink";
  
  const { getUnreadCount } = useNotifications();
  const unreadCount = getUnreadCount();

  return (
    <header className="bg-maroon-500 border-b border-maroon-700 shadow">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-white">{title}</h1>

        <div className="flex items-center gap-4">
          {/* Search */}
          

          {/* Notifications with badge - Link to notifications page */}
          <Link to={`/${currentUser?.role === 'student' ? 'student' : currentUser?.role === 'counselor' ? 'counselor' : currentUser?.role === 'college_rep' ? 'rep' : 'admin'}/notifications`} className="relative p-2 hover:bg-maroon-600 rounded-lg transition">
            <Bell className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">{unreadCount}</span>
            )}
          </Link>

          {/* User */}
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-maroon-100" />
            <span className="text-white font-medium">
              {currentUser?.name}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}