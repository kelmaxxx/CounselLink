// src/pages/dashboard/RepresentativeDashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  GraduationCap,
  Users,
  FileText,
  BookOpen,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { PageHeader, StatCard, SectionCard, BTN } from "../../components/ui";

export default function RepresentativeDashboard() {
  const { currentUser, users } = useAuth();
  const myCollege = currentUser?.college;
  const studentsInCollege =
    users?.filter((u) => u.role === "student" && u.college === myCollege) || [];

  const firstName = currentUser?.name?.split(" ")[0] || "Dean";

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="College Dean"
        title={`Welcome, ${firstName}`}
        subtitle={myCollege || "No college assigned"}
        actions={
          <Link to="/rep/request-data" className={BTN.primary}>
            <ClipboardList size={15} /> Request student data
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
        <StatCard
          label="Available reports"
          value={8}
          hint="Through the data portal"
          icon={FileText}
          accent="bg-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Open counseling data"
          subtitle="Aggregated, non-sensitive metrics for your college"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            Browse de-identified counseling activity, student volumes by status, and overall
            engagement for your college.
          </p>
          <Link
            to="/rep/counseling-data"
            className={`${BTN.secondary} mt-3`}
          >
            <BookOpen size={14} /> Open data view <ArrowRight size={12} />
          </Link>
        </SectionCard>

        <SectionCard
          title="Request student data"
          subtitle="Submit a formal data access request"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            For records that go beyond open data, file a Request for Student Counseling Data. The
            admin reviews each request before granting access.
          </p>
          <Link to="/rep/request-data" className={`${BTN.primary} mt-3`}>
            <ClipboardList size={14} /> New request <ArrowRight size={12} />
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}
