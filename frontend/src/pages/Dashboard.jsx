// src/pages/Dashboard.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import StudentDashboard from "./dashboard/StudentDashboard";
import CounselorDashboard from "./dashboard/CounselorDashboard";
import RepresentativeDashboard from "./dashboard/RepresentativeDashboard";
import AdminDashboard from "./dashboard/AdminDashboard";

export default function Dashboard() {
  const { currentUser } = useAuth();

  // If not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  switch (currentUser.role) {
    case "student":
      return <StudentDashboard />;
    case "counselor":
      return <CounselorDashboard />;
    case "college_rep":
    case "representative": // alias support
      return <RepresentativeDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}