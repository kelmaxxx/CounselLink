// src/components/Layout.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
export default function Layout({ children }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header currentUser={currentUser} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto bg-gray-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </main>
      </div>
    </div>
  );
}