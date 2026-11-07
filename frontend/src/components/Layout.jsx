// src/components/Layout.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "./motion";
export default function Layout({ children }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Each route mounts its own Layout, so the collapse preference must live
  // outside component state to survive navigation.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((v) => {
      const next = !v;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex bg-gray-50 h-screen overflow-hidden text-gray-800">
      <Sidebar
        currentUser={currentUser}
        activeView={activeView}
        setActiveView={setActiveView}
        handleLogout={handleLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header currentUser={currentUser} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto bg-gray-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <PageTransition key={location.pathname}>
            {/* Inner boundary keeps the sidebar/header on screen while a
                lazy route chunk is still downloading. */}
            <React.Suspense
              fallback={<div className="py-16 text-center text-sm text-gray-500">Loading…</div>}
            >
              {children}
            </React.Suspense>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}