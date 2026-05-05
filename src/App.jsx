// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Student pages
import RequestAppointment from "./pages/student/RequestAppointment";
import StudentProfile from "./pages/student/StudentProfile";
import RequestPsychTest from "./pages/student/RequestPsychTest";
import StudentNotifications from "./pages/student/StudentNotifications";

// Counselor pages
import Students from "./pages/Students";
import CounselorAppointments from "./pages/counselor/CounselorAppointments";
import StudentCounselingForm from "./pages/counselor/StudentCounselingForm";
import CounselorReports from "./pages/counselor/CounselorReports";
import CounselorProfile from "./pages/counselor/CounselorProfile";
import CounselorNotifications from "./pages/counselor/CounselorNotifications";

// College Rep pages
import CounselingData from "./pages/rep/CounselingData";
import RequestStudentData from "./pages/rep/RequestStudentData";
import RepProfile from "./pages/rep/RepProfile";
import RepNotifications from "./pages/rep/RepNotifications";

// Admin pages
import ManageUsers from "./pages/admin/ManageUsers";
import CreateAnnouncement from "./pages/admin/CreateAnnouncement";
import AdminReports from "./pages/admin/AdminReports";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminNotifications from "./pages/admin/AdminNotifications";
import PendingRegistrations from "./pages/admin/PendingRegistrations";

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
          path="/student/request-psych-test"
          element={
            <ProtectedRoute>
              <Layout>
                <RequestPsychTest />
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
          path="/rep/request-data"
          element={
            <ProtectedRoute>
              <Layout>
                <RequestStudentData />
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

        {/* Wildcard catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}