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
  
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex bg-white min-h-screen">
      {/* Sidebar - fixed width */}
      <Sidebar
        currentUser={currentUser}
        activeView={activeView}
        setActiveView={setActiveView}
        handleLogout={handleLogout}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <Header currentUser={currentUser} />

        <main className="flex-1 overflow-auto bg-gray-50 pt-4 px-6">
          {children}
        </main>
      </div>
    </div>
  );
}