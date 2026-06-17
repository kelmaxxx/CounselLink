// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

// Student pages
import RequestAppointment from "./pages/student/RequestAppointment";
import StudentProfile from "./pages/student/StudentProfile";
import StudentNotifications from "./pages/student/StudentNotifications";
import StudentConsent from "./pages/student/StudentConsent";

// Counselor pages
import Students from "./pages/Students";
import CounselorAppointments from "./pages/counselor/CounselorAppointments";
import StudentCounselingForm from "./pages/counselor/StudentCounselingForm";
import StudentTestForm from "./pages/counselor/StudentTestForm";
import CounselorReports from "./pages/counselor/CounselorReports";
import CounselorProfile from "./pages/counselor/CounselorProfile";
import CounselorNotifications from "./pages/counselor/CounselorNotifications";
import CounselorReferrals from "./pages/counselor/CounselorReferrals";
import ReferralConfirmation from "./pages/counselor/ReferralConfirmation";
import StudentAppointments from "./pages/student/StudentAppointments";
import CounselorDirectory from "./pages/student/CounselorDirectory";
import CounselorPublicProfile from "./pages/student/CounselorPublicProfile";
import StudentFeedback from "./pages/student/StudentFeedback";

// College Rep pages
import CounselingData from "./pages/rep/CounselingData";
import RequestStudentData from "./pages/rep/RequestStudentData";
import RepReferrals from "./pages/rep/RepReferrals";
import RepReports from "./pages/rep/RepReports";
import RepProfile from "./pages/rep/RepProfile";
import RepNotifications from "./pages/rep/RepNotifications";

// Admin pages
import ManageUsers from "./pages/admin/ManageUsers";
import CreateAnnouncement from "./pages/admin/CreateAnnouncement";
import AdminReports from "./pages/admin/AdminReports";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminNotifications from "./pages/admin/AdminNotifications";
import PendingRegistrations from "./pages/admin/PendingRegistrations";
import AuditLogs from "./pages/admin/AuditLogs";

function NotificationsRedirect() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  if (role === "counselor") return <Navigate to="/counselor/notifications" replace />;
  if (role === "admin") return <Navigate to="/admin/notifications" replace />;
  if (role === "college_rep") return <Navigate to="/rep/notifications" replace />;
  return <Navigate to="/student/notifications" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Shared Messages */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Layout>
                <Messages />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Generic /notifications -> redirect to role-specific page (used by bulk announcement links) */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsRedirect />
            </ProtectedRoute>
          }
        />

        {/* Student Routes */}
        <Route
          path="/student/request-appointment"
          element={
            <ProtectedRoute>
              <Layout>
                <RequestAppointment />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/appointments"
          element={
            <ProtectedRoute>
              <Layout>
                <StudentAppointments />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/counselors"
          element={
            <ProtectedRoute>
              <Layout>
                <CounselorDirectory />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/counselors/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <CounselorPublicProfile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/feedback"
          element={
            <ProtectedRoute>
              <Layout>
                <StudentFeedback />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <StudentProfile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <StudentNotifications />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/consent"
          element={
            <ProtectedRoute>
              <Layout>
                <StudentConsent />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Counselor Routes */}
        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <Layout>
                <Students />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/appointments"
          element={
            <ProtectedRoute>
              <Layout>
                <CounselorAppointments />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <CounselorReports />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/appointments/:id/form"
          element={
            <ProtectedRoute>
              <Layout>
                <StudentCounselingForm />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/tests/:id/form"
          element={
            <ProtectedRoute>
              <Layout>
                <StudentTestForm />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <CounselorProfile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <CounselorNotifications />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/referrals"
          element={
            <ProtectedRoute>
              <Layout>
                <CounselorReferrals />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/referrals/:id/confirmation"
          element={
            <ProtectedRoute>
              <Layout>
                <ReferralConfirmation />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* College Rep Routes */}
        <Route
          path="/rep/counseling-data"
          element={
            <ProtectedRoute>
              <Layout>
                <CounselingData />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rep/referrals"
          element={
            <ProtectedRoute>
              <Layout>
                <RepReferrals />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rep/request-report"
          element={
            <ProtectedRoute>
              <Layout>
                <RequestStudentData />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rep/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <RepReports />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rep/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <RepProfile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rep/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <RepNotifications />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/pending-registrations"
          element={
            <ProtectedRoute>
              <Layout>
                <PendingRegistrations />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/manage-users"
          element={
            <ProtectedRoute>
              <Layout>
                <ManageUsers />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateAnnouncement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <AdminReports />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <AdminProfile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <AdminNotifications />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute>
              <Layout>
                <AuditLogs />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Wildcard catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}