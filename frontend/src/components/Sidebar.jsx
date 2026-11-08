// src/components/Sidebar.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, X, ChevronsLeft, ChevronsRight } from "lucide-react";
import { getNavGroups, getRoleBase } from "./navItems";
import { useMessages } from "../context/MessagesContext";
import { useReferrals } from "../context/ReferralsContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import Avatar from "./Avatar";

// JSX member tags aren't counted as variable uses by the lint config.
const MotionSpan = motion.span;

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// Lightweight hook: keeps a count of pending report-requests for the sidebar
// badge. Refetches on mount and whenever the server sends a "notification"
// SSE event (which is fired after every report-request action).
function usePendingReportRequests(role, token) {
  const [count, setCount] = useState(0);
  const { subscribe } = useRealtime();

  const fetchCount = useCallback(async () => {
    if (!token || !["counselor", "college_rep"].includes(role)) return;
    try {
      const res = await fetch(`${API_BASE}/api/report-requests?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCount(Array.isArray(data) ? data.length : 0);
    } catch {
      // silently ignore — it's just a sidebar badge
    }
  }, [token, role]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Re-fetch when the server signals a notification change (fires on report-request create/respond/send)
  useEffect(() => {
    return subscribe("notification", () => fetchCount());
  }, [subscribe, fetchCount]);

  return count;
}

function Sidebar({ currentUser: propUser, activeView, setActiveView, handleLogout, open = false, onClose, collapsed = false, onToggleCollapse }) {
  const { currentUser: ctxUser, users } = useAuth();
  const messagesCtx = useMessages?.();
  const unreadMessages = messagesCtx?.getTotalUnreadCount?.() || 0;
  const currentUser = propUser || ctxUser;
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredNav, setHoveredNav] = useState(null);

  // Referral pending count — from the global context (already fetched on app init)
  const referralsCtx = useReferrals?.();
  const allReferrals = referralsCtx?.referrals || [];

  // For counselors: incoming pending referrals (not yet assigned to someone else)
  const pendingReferralCount =
    currentUser?.role === "counselor"
      ? allReferrals.filter(
          (r) =>
            r.status === "pending" &&
            (r.receiving_counselor_id === null || r.receiving_counselor_id === currentUser?.id)
        ).length
      : currentUser?.role === "college_rep"
      ? allReferrals.filter((r) => r.status === "pending").length
      : 0;

  // Pending report-requests badge (counselor sees all unassigned + assigned-to-them; rep sees their own)
  const { token } = useAuth();
  const pendingReportCount = usePendingReportRequests(currentUser?.role, token);

  const pendingCount = users?.filter(u => u.role === "student" && u.status === "pending_approval").length || 0;

  const roleBase = getRoleBase(currentUser?.role);

  // Collapsed rail: show a branded label card beside the hovered/focused icon.
  const showNavLabel = (e, item, badge) => {
    if (!collapsed || !window.matchMedia("(min-width: 1024px)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredNav({
      label: item.label,
      badge,
      icon: item.icon,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };
  const HoverIcon = hoveredNav?.icon;

  if (!currentUser) {
    return (
      <aside className="w-64 bg-maroon-700 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-maroon-800/60">
          <h1 className="text-base font-semibold tracking-tight">CounseLink</h1>
        </div>
      </aside>
    );
  }

  const navGroups = getNavGroups(currentUser.role);

  // On phones the sidebar is an off-canvas drawer (fixed + translate); from
  // the `lg` breakpoint up it becomes a normal static column that's always
  // visible. `open` only drives the mobile drawer state.
  const drawerClasses = `fixed inset-y-0 left-0 z-50 w-64 transform transition-[width,transform] duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto ${
    collapsed ? "lg:w-20" : "lg:w-64"
  } ${
    open ? "translate-x-0" : "-translate-x-full"
  }`;

  // Determine the badge value for each nav item
  const getBadge = (itemId) => {
    if (itemId === "pending-registrations" && pendingCount > 0) return pendingCount;
    if (itemId === "messages" && unreadMessages > 0) return unreadMessages;
    // Counselor: incoming pending referrals
    if (itemId === "referrals" && pendingReferralCount > 0) return pendingReferralCount;
    // Counselor: pending report requests
    if (itemId === "generate-reports" && pendingReportCount > 0) return pendingReportCount;
    // College Rep: pending referrals they sent that are waiting
    if (itemId === "rep-referrals" && pendingReferralCount > 0) return pendingReferralCount;
    // College Rep: their own pending report requests
    if (itemId === "request-report" && pendingReportCount > 0) return pendingReportCount;
    return 0;
  };

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
      <div className={`px-5 py-4 border-b border-maroon-800/60 ${collapsed ? "lg:px-0" : ""}`}>
        <div className={`flex items-center gap-2 ${collapsed ? "lg:justify-center" : ""}`}>
          <img
            src="/counselink-round.png"
            alt="CounseLink Logo"
            className="w-12 h-12 object-contain flex-shrink-0"
          />
          <h1 className={`text-sm font-semibold tracking-tight text-white ${collapsed ? "lg:hidden" : ""}`}>CounseLink</h1>
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
      <Link to={`${roleBase}/profile`} className={`px-5 py-3 border-b border-maroon-800/60 block hover:bg-maroon-800/40 transition cursor-pointer ${collapsed ? "lg:px-0" : ""}`}>
        <div className={`flex items-center gap-3 min-w-0 ${collapsed ? "lg:justify-center" : ""}`}>
          <Avatar
            name={currentUser.name}
            url={currentUser.avatarUrl}
            size="sm"
            theme="light"
          />
          <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <div className="text-sm font-medium text-white truncate">{currentUser.name}</div>
            <div className="text-xs text-maroon-200 capitalize truncate">
              {currentUser.role?.replace("_", " ")}
              {currentUser.college ? ` · ${currentUser.college}` : ""}
            </div>
          </div>
        </div>
      </Link>

      {/* Nav */}
      <nav
        onScroll={() => setHoveredNav(null)}
        className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 py-3 space-y-4"
      >
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className={`px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-maroon-300 ${collapsed ? "lg:hidden" : ""}`}>
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const badge = getBadge(item.id);
                const itemPath = item.path;
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
                    className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${collapsed ? "lg:gap-0 lg:px-0 lg:justify-center" : ""} ${
                      isActive
                        ? "text-white"
                        : "text-maroon-100 hover:bg-maroon-600/60 hover:text-white"
                    }`}
                    onMouseEnter={(e) => showNavLabel(e, item, badge)}
                    onMouseLeave={() => setHoveredNav(null)}
                    onFocus={(e) => showNavLabel(e, item, badge)}
                    onBlur={() => setHoveredNav(null)}
                  >
                    {isActive && (
                      <MotionSpan
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-maroon-800/80"
                        transition={{ type: "spring", stiffness: 480, damping: 42 }}
                      >
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-white" />
                      </MotionSpan>
                    )}
                    <span className={`relative z-10 flex items-center gap-3 w-full ${collapsed ? "lg:gap-0 lg:justify-center" : ""}`}>
                      <Icon size={18} className="flex-shrink-0" />
                      <span className={`flex-1 text-left truncate transition-[opacity,max-width] duration-300 ${collapsed ? "lg:max-w-0 lg:opacity-0" : "lg:max-w-[200px]"}`}>{item.label}</span>
                      {badge > 0 && (
                        <>
                          <span className={`bg-amber-400 text-maroon-900 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${collapsed ? "lg:hidden" : ""}`}>
                            {badge > 99 ? "99+" : badge}
                          </span>
                          {collapsed && (
                            <span className="hidden lg:block absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
                          )}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-maroon-800/60">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`hidden lg:flex items-center gap-3 w-full text-maroon-100 hover:text-white hover:bg-maroon-600/60 px-3 py-2 rounded-lg text-sm transition mb-1 ${collapsed ? "lg:gap-0 lg:px-0 lg:justify-center" : ""}`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full text-maroon-100 hover:text-white hover:bg-maroon-600/60 px-3 py-2 rounded-lg text-sm transition ${collapsed ? "lg:gap-0 lg:px-0 lg:justify-center" : ""}`}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut size={18} />
          <span className={collapsed ? "lg:hidden" : ""}>Sign out</span>
        </button>
      </div>
    </aside>
      {hoveredNav && HoverIcon && createPortal(
        <div
          className="fixed z-[70] hidden lg:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-lg pointer-events-none"
          style={{ top: hoveredNav.top, left: hoveredNav.left, transform: "translateY(-50%)" }}
        >
          <HoverIcon size={15} className="text-maroon-600 flex-shrink-0" />
          <span className="whitespace-nowrap">{hoveredNav.label}</span>
          {hoveredNav.badge > 0 && (
            <span className="bg-maroon-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
              {hoveredNav.badge > 99 ? "99+" : hoveredNav.badge}
            </span>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

export default Sidebar;
