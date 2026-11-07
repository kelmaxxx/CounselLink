// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { syncServerTime } from "./utils/serverTime";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import WelcomeHero from "./components/WelcomeHero";

// Route-level code splitting: each page (and its heavy deps: xlsx, recharts,
// PDF/report helpers) loads only when its route is visited.
const Login = React.lazy(() => import("./pages/Login"));
const AcceptInvitation = React.lazy(() => import("./pages/AcceptInvitation"));
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Messages = React.lazy(() => import("./pages/Messages"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const SystemEvaluationSurvey = React.lazy(() => import("./pages/SystemEvaluationSurvey"));
const SystemEvaluationTally = React.lazy(() => import("./pages/counselor/SystemEvaluationTally"));

// Student pages
const RequestAppointment = React.lazy(() => import("./pages/student/RequestAppointment"));
const StudentProfile = React.lazy(() => import("./pages/student/StudentProfile"));
const StudentNotifications = React.lazy(() => import("./pages/student/StudentNotifications"));
const StudentConsent = React.lazy(() => import("./pages/student/StudentConsent"));

// Counselor pages
const Students = React.lazy(() => import("./pages/Students"));
const CounselorAppointments = React.lazy(() => import("./pages/counselor/CounselorAppointments"));
const StudentCounselingForm = React.lazy(() => import("./pages/counselor/StudentCounselingForm"));
const StudentTestForm = React.lazy(() => import("./pages/counselor/StudentTestForm"));
const CounselorReports = React.lazy(() => import("./pages/counselor/CounselorReports"));
const FeedbackTallySummary = React.lazy(() => import("./pages/counselor/FeedbackTallySummary"));
const CounselorProfile = React.lazy(() => import("./pages/counselor/CounselorProfile"));
const CounselorNotifications = React.lazy(() => import("./pages/counselor/CounselorNotifications"));
const CounselorReferrals = React.lazy(() => import("./pages/counselor/CounselorReferrals"));
const ReferralConfirmation = React.lazy(() => import("./pages/counselor/ReferralConfirmation"));
const StudentAppointments = React.lazy(() => import("./pages/student/StudentAppointments"));
const CounselorDirectory = React.lazy(() => import("./pages/student/CounselorDirectory"));
const CounselorPublicProfile = React.lazy(() => import("./pages/student/CounselorPublicProfile"));

// College Rep pages
const CounselingData = React.lazy(() => import("./pages/rep/CounselingData"));
const RequestStudentData = React.lazy(() => import("./pages/rep/RequestStudentData"));
const RepReferrals = React.lazy(() => import("./pages/rep/RepReferrals"));
const RepProfile = React.lazy(() => import("./pages/rep/RepProfile"));
const RepNotifications = React.lazy(() => import("./pages/rep/RepNotifications"));

// Admin pages
const ManageUsers = React.lazy(() => import("./pages/admin/ManageUsers"));
const CreateAnnouncement = React.lazy(() => import("./pages/admin/CreateAnnouncement"));
const SystemLogs = React.lazy(() => import("./pages/admin/SystemLogs"));
const AdminProfile = React.lazy(() => import("./pages/admin/AdminProfile"));
const AdminNotifications = React.lazy(() => import("./pages/admin/AdminNotifications"));
const PendingRegistrations = React.lazy(() => import("./pages/admin/PendingRegistrations"));

function RouteFallback() {
  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 text-sm text-gray-500">
      Loading…
    </div>
  );
}

function NotificationsRedirect() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  if (role === "counselor") return <Navigate to="/counselor/notifications" replace />;
  if (role === "admin") return <Navigate to="/admin/notifications" replace />;
  if (role === "college_rep") return <Navigate to="/rep/notifications" replace />;
  return <Navigate to="/student/notifications" replace />;
}

/**
 * Smart root route:
 *  - Unauthenticated  → LandingPage
 *  - Authenticated    → Dashboard (via ProtectedRoute, identical to before)
 */
function RootRoute() {
  const { currentUser } = useAuth();
  if (currentUser) {
    return (
      <ProtectedRoute>
        {/* Above Layout so the fixed overlay covers the sidebar/header from the
            first frame instead of fading in beneath PageTransition. */}
        <WelcomeHero userName={currentUser.firstName || currentUser.name?.split(" ")[0]} />
        <Layout>
          <Dashboard />
        </Layout>
      </ProtectedRoute>
    );
  }
  return <LandingPage />;
}

export default function App() {
  // Anchor the booking gates to the server clock as early as possible, so a
  // wrong device clock can't enable dates/slots the server would reject.
  React.useEffect(() => {
    syncServerTime();
  }, []);

  return (
    <BrowserRouter>
      <React.Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/system-evaluation" element={<SystemEvaluationSurvey />} />
        <Route path="/eval" element={<SystemEvaluationSurvey />} />
        <Route path="/system-evaluation/tally" element={<SystemEvaluationTally />} />
        <Route path="/researcher/tally" element={<SystemEvaluationTally />} />

        {/* Root: Landing Page for guests, Dashboard for authenticated users */}
        <Route path="/" element={<RootRoute />} />

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
        {/* Legacy alias: old test notifications link to /student/tests —
            test requests live on the appointments page. */}
        <Route path="/student/tests" element={<Navigate to="/student/appointments" replace />} />
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
          path="/counselor/feedback-tally"
          element={
            <ProtectedRoute>
              <Layout>
                <FeedbackTallySummary />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/system-evaluation"
          element={
            <ProtectedRoute>
              <Layout>
                <SystemEvaluationTally />
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
          path="/admin/system-logs"
          element={
            <ProtectedRoute>
              <Layout>
                <SystemLogs />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/system-evaluation"
          element={
            <ProtectedRoute>
              <Layout>
                <SystemEvaluationTally />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/admin/reports" element={<Navigate to="/admin/system-logs" replace />} />
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
        <Route path="/admin/audit-logs" element={<Navigate to="/admin/system-logs" replace />} />

        {/* Wildcard catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}