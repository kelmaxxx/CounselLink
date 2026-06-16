// src/pages/dashboard/RepresentativeDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  GraduationCap,
  Users,
  FileText,
  BookOpen,
  ClipboardList,
  ArrowRight,
  ArrowRightLeft,
} from "lucide-react";
import { PageHeader, StatCard, SectionCard, BTN } from "../../components/ui";
import WelcomeHero from "../../components/WelcomeHero";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function RepresentativeDashboard() {
  const { currentUser, users, token } = useAuth();
  const myCollege = currentUser?.college;
  const studentsInCollege =
    users?.filter((u) => u.role === "student" && u.college === myCollege) || [];

  const [receivedReportsCount, setReceivedReportsCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/reports/received`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setReceivedReportsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setReceivedReportsCount(0));
  }, [token]);

  const firstName = currentUser?.name?.split(" ")[0] || "Representative";

  return (
    <>
      <WelcomeHero userName={firstName} />
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="College Representative"
        title={`Welcome, ${firstName}`}
        subtitle={myCollege || "No college assigned"}
        actions={
          <Link to="/rep/referrals" className={BTN.primary}>
            <ArrowRightLeft size={15} /> New referral
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="College"
          value={myCollege ? myCollege.split(" ")[0] : "—"}
          hint={myCollege || "No college assigned"}
          icon={GraduationCap}
          accent="bg-maroon-500"
        />
        <StatCard
          label="Students"
          value={studentsInCollege.length}
          hint="In your college"
          icon={Users}
          accent="bg-emerald-500"
        />
        <Link to="/rep/counseling-data" className="block">
          <StatCard
            label="Received reports"
            value={receivedReportsCount}
            hint="Submitted by counselors"
            icon={FileText}
            accent="bg-blue-500"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="Refer a student"
          subtitle="Hand off a student to a counselor"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            Refer a student from your college to a counselor with a clear reason. The counselor
            will accept or decline the referral.
          </p>
          <Link to="/rep/referrals" className={`${BTN.primary} mt-3`}>
            <ArrowRightLeft size={14} /> New referral <ArrowRight size={12} />
          </Link>
        </SectionCard>

        <SectionCard
          title="Request a report"
          subtitle="Ask a counselor for a student report"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            Submit a formal request to a counselor for a student counseling report. You'll be
            notified when the counselor responds.
          </p>
          <Link to="/rep/request-report" className={`${BTN.secondary} mt-3`}>
            <ClipboardList size={14} /> New request <ArrowRight size={12} />
          </Link>
        </SectionCard>

        <SectionCard
          title="Open counseling data"
          subtitle="Aggregated metrics for your college"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            Browse de-identified counseling activity, student volumes by status, and overall
            engagement for your college.
          </p>
          <Link to="/rep/counseling-data" className={`${BTN.secondary} mt-3`}>
            <BookOpen size={14} /> Open data view <ArrowRight size={12} />
          </Link>
        </SectionCard>
      </div>
    </div>
    </>
  );
}
