// src/components/Sidebar.jsx
import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Calendar, Users, FileText, Bell, LogOut, User,
  ClipboardList, BarChart3, Settings, BookOpen, AlertCircle, UserCheck, Shield, MessageCircle, FileSignature, ArrowRightLeft, X
} from "lucide-react";
import { useMessages } from "../context/MessagesContext";
import Avatar from "./Avatar";

function Sidebar({ currentUser: propUser, activeView, setActiveView, handleLogout, open = false, onClose }) {
  const { currentUser: ctxUser, users } = useAuth();
  const messagesCtx = useMessages?.();
  const unreadMessages = messagesCtx?.getTotalUnreadCount?.() || 0;
  const currentUser = propUser || ctxUser;
  const navigate = useNavigate();
  const location = useLocation();

  const pendingCount = users?.filter(u => u.role === "student" && u.status === "pending_approval").length || 0;

  const profileBaseByRole = {
    student: "/student",
    counselor: "/counselor",
    college_rep: "/rep",
    admin: "/admin",
  };
  const roleBase = profileBaseByRole[currentUser?.role] || "/student";

  const idToPath = {
    // Student
    dashboard: "/",
    "request-appointment": "/student/request-appointment",
    "my-appointments": "/student/appointments",
    "counselor-directory": "/student/counselors",
    consent: "/student/consent",

    // Role-aware shared items
    profile: `${roleBase}/profile`,
    notifications: `${roleBase}/notifications`,

    // Counselor
    "manage-students": "/students",
    appointments: "/counselor/appointments",
    referrals: "/counselor/referrals",
    "generate-reports": "/counselor/reports",

    // College Rep
    "counseling-data": "/rep/counseling-data",
    "rep-referrals": "/rep/referrals",
    "request-report": "/rep/request-report",

    // Admin
    "pending-registrations": "/admin/pending-registrations",
    "manage-users": "/admin/manage-users",
    announcements: "/admin/announcements",
    reports: "/admin/reports",
    "audit-logs": "/admin/audit-logs",

    // Shared
    messages: "/messages",
  };

  const getNavGroups = () => {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case "student":
        return [
          {
            label: "Workspace",
            items: [
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "request-appointment", label: "Request Appointment", icon: Calendar },
              { id: "my-appointments", label: "My Appointments", icon: Calendar },
              { id: "consent", label: "Test Results", icon: FileSignature },
            ],
          },
          {
            label: "Account",
            items: [
              { id: "counselor-directory", label: "Counselors", icon: Users },
              { id: "profile", label: "My Profile", icon: User },
              { id: "messages", label: "Messages", icon: MessageCircle },
              { id: "notifications", label: "Notifications", icon: Bell },
            ],
          },
        ];
      case "counselor":
        return [
          {
            label: "Workspace",
            items: [
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "manage-students", label: "Student Records", icon: Users },
              { id: "appointments", label: "Appointments", icon: Calendar },
              { id: "referrals", label: "Referrals", icon: ArrowRightLeft },
              { id: "generate-reports", label: "Reports", icon: FileText },
            ],
          },
          {
            label: "Account",
            items: [
              { id: "messages", label: "Messages", icon: MessageCircle },
              { id: "profile", label: "My Profile", icon: User },
              { id: "notifications", label: "Notifications", icon: Bell },
            ],
          },
        ];
      case "college_rep":
        return [
          {
            label: "Workspace",
            items: [
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "counseling-data", label: "Counseling Data", icon: BookOpen },
              { id: "rep-referrals", label: "Referrals", icon: ArrowRightLeft },
              { id: "request-report", label: "Request Report", icon: ClipboardList },
            ],
          },
          {
            label: "Account",
            items: [
              { id: "messages", label: "Messages", icon: MessageCircle },
              { id: "profile", label: "My Profile", icon: User },
              { id: "notifications", label: "Notifications", icon: Bell },
            ],
          },
        ];
      case "admin":
        return [
          {
            label: "Administration",
            items: [
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "pending-registrations", label: "Pending Registrations", icon: UserCheck },
              { id: "manage-users", label: "Manage Users", icon: Settings },
              { id: "announcements", label: "Announcements", icon: AlertCircle },
              { id: "reports", label: "System Reports", icon: FileText },
              { id: "audit-logs", label: "Audit Logs", icon: Shield },
            ],
          },
          {
            label: "Account",
            items: [
              { id: "profile", label: "My Profile", icon: User },
              { id: "notifications", label: "Notifications", icon: Bell },
            ],
          },
        ];
      default:
        return [];
    }
  };

  if (!currentUser) {
    return (
      <aside className="w-64 bg-maroon-700 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-maroon-800/60">
          <h1 className="text-base font-semibold tracking-tight">CounseLink</h1>
        </div>
      </aside>
    );
  }

  const navGroups = getNavGroups();

  // On phones the sidebar is an off-canvas drawer (fixed + translate); from
  // the `lg` breakpoint up it becomes a normal static column that's always
  // visible. `open` only drives the mobile drawer state.
  const drawerClasses = `fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:static lg:translate-x-0 lg:z-auto ${
    open ? "translate-x-0" : "-translate-x-full"
  }`;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />
    <aside className={`${drawerClasses} bg-maroon-700 text-maroon-50 flex flex-col border-r border-maroon-800/60`}>
      {/* Brand */}
      <div className="px-5 py-4 border-b border-maroon-800/60">
        <div className="flex items-center gap-2">
          <img
            src="/counselink-round.png"
            alt="CounseLink Logo"
            className="w-12 h-12 object-contain flex-shrink-0"
          />
          <h1 className="text-sm font-semibold tracking-tight text-white">CounseLink</h1>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden ml-auto -mr-1 flex items-center justify-center w-8 h-8 rounded-lg text-maroon-100 hover:bg-maroon-600/60 hover:text-white transition"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* User block */}
      <Link to={`${roleBase}/profile`} className="px-5 py-3 border-b border-maroon-800/60 block hover:bg-maroon-800/40 transition cursor-pointer">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            name={currentUser.name}
            url={currentUser.avatarUrl}
            size="sm"
            theme="light"
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{currentUser.name}</div>
            <div className="text-xs text-maroon-200 capitalize truncate">
              {currentUser.role?.replace("_", " ")}
              {currentUser.college ? ` · ${currentUser.college}` : ""}
            </div>
          </div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-maroon-300">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const showPendingBadge = item.id === "pending-registrations" && pendingCount > 0;
                const showMessagesBadge = item.id === "messages" && unreadMessages > 0;
                const itemPath = idToPath[item.id] || "/";
                const isActive =
                  location.pathname === itemPath ||
                  (itemPath !== "/" && location.pathname.startsWith(itemPath + "/"));
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (setActiveView) setActiveView(item.id);
                      navigate(itemPath);
                      onClose?.();
                    }}
                    className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition relative ${
                      isActive
                        ? "bg-maroon-800/80 text-white"
                        : "text-maroon-100 hover:bg-maroon-600/60 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-white" />
                    )}
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {(showPendingBadge || showMessagesBadge) && (
                      <span className="bg-amber-400 text-maroon-900 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                        {showPendingBadge ? pendingCount : unreadMessages}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-maroon-800/60">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full text-maroon-100 hover:text-white hover:bg-maroon-600/60 px-3 py-2 rounded-lg text-sm transition"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
    </>
  );
}

export default Sidebar;
