// src/components/Sidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Calendar, Users, FileText, Bell, LogOut, User,
  ClipboardList, BarChart3, Settings, BookOpen, AlertCircle, UserCheck
} from "lucide-react";

function Sidebar({ currentUser: propUser, activeView, setActiveView, handleLogout }) {
  const { currentUser: ctxUser, users } = useAuth();
  const currentUser = propUser || ctxUser;
  const navigate = useNavigate();
  const location = useLocation();

  // Count pending registrations for admin
  const pendingCount = users?.filter(u => u.role === "student" && u.status === "pending_approval").length || 0;

const idToPath = {
  // Student
  dashboard: "/",
  "request-appointment": "/student/request-appointment",
  "request-psych-test": "/student/request-psych-test",
  profile: "/student/profile",
  notifications: "/student/notifications",
  
  // Counselor
  "manage-students": "/students",
  appointments: "/counselor/appointments",
  "generate-reports": "/counselor/reports",
  
  // College Rep
  "counseling-data": "/rep/counseling-data",
  "request-data": "/rep/request-data",
  
  // Admin
  "pending-registrations": "/admin/pending-registrations",
  "manage-users": "/admin/manage-users",
  announcements: "/admin/announcements",
  reports: "/admin/reports",
};

  const getNavItems = () => {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case "student":
        return [
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "request-appointment", label: "Request Appointment", icon: Calendar },
          { id: "request-psych-test", label: "Request Psych Test", icon: ClipboardList },
          { id: "profile", label: "My Profile", icon: User },
          { id: "notifications", label: "Notifications", icon: Bell }
        ];
      case "counselor":
        return [
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "manage-students", label: "Manage Students", icon: Users },
          { id: "appointments", label: "Appointments", icon: Calendar },
          { id: "generate-reports", label: "Generate Reports", icon: FileText },
          { id: "profile", label: "My Profile", icon: User },
          { id: "notifications", label: "Notifications", icon: Bell }
        ];
      case "college_rep":
        return [
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "counseling-data", label: "Open Counseling Data", icon: BookOpen },
          { id: "request-data", label: "Request Student Data", icon: ClipboardList },
          { id: "profile", label: "My Profile", icon: User },
          { id: "notifications", label: "Notifications", icon: Bell }
        ];
      case "admin":
        return [
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "pending-registrations", label: "Pending Registrations", icon: UserCheck },
          { id: "manage-users", label: "Manage User Accounts", icon: Settings },
          { id: "announcements", label: "Create Announcement", icon: AlertCircle },
          { id: "reports", label: "System Reports", icon: FileText },
          { id: "profile", label: "My Profile", icon: User },
          { id: "notifications", label: "Notifications", icon: Bell }
        ];
      default:
        return [];
    }
  };

  if (!currentUser) {
    return (
      <div className="w-64 bg-maroon-500 text-white flex flex-col shadow-lg">
        <div className="p-6 border-b border-maroon-700">
          <h1 className="text-2xl font-bold">CounseLink</h1>
        </div>
      </div>
    );
  }

  const navItems = getNavItems();

  return (
    <div className="w-64 bg-maroon-500 text-white flex flex-col shadow-lg">
      <div className="p-6 border-b border-maroon-700">
        <h1 className="text-2xl font-bold">CounseLink</h1>
        <div className="mt-2 text-sm text-maroon-100">
          <div className="font-medium text-white">{currentUser.name}</div>
          <div className="capitalize">{currentUser.role?.replace('_', ' ')}</div>
          {currentUser.college && <div className="text-maroon-50">{currentUser.college}</div>}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const showBadge = item.id === "pending-registrations" && pendingCount > 0;
          const itemPath = idToPath[item.id] || "/";
          const isActive = location.pathname === itemPath || location.pathname.startsWith(itemPath + "/");
          return (
            <button
              key={item.id}
              onClick={() => {
                if (setActiveView) setActiveView(item.id);
                navigate(itemPath);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "bg-maroon-700 text-white"
                  : "text-maroon-50 hover:bg-maroon-600"
              }`}
            >
              <Icon size={20} />
              <span className="flex-1 text-left">{item.label}</span>
              {showBadge && (
                <span className="bg-yellow-400 text-maroon-900 text-xs font-bold px-2 py-1 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-maroon-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full text-maroon-50 hover:text-white hover:bg-maroon-600 px-3 py-2 rounded transition"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;