// src/components/landing/BenefitsSection.jsx
import React from "react";
import { CheckCircle2, GraduationCap, Stethoscope, Building2, ShieldCheck } from "lucide-react";

const STUDENT_BENEFITS = [
  "Easily request counseling appointments online.",
  "Receive real-time notifications for appointment updates.",
  "Track appointment status and history.",
  "Access counseling services more conveniently.",
  "Reduce waiting time and paperwork.",
];

const COUNSELOR_BENEFITS = [
  "Organize and securely manage counseling records.",
  "Streamline appointment scheduling and approvals.",
  "Generate reports more efficiently.",
  "Monitor student counseling sessions and history.",
  "Improve communication with students.",
];

const COLLEGE_BENEFITS = [
  "Monitor the number of students seeking counseling services by college.",
  "Access counseling statistics and reports for informed decision-making.",
  "Identify trends and common student concerns while maintaining confidentiality.",
  "Support student welfare initiatives through data-driven insights.",
  "Strengthen collaboration between colleges and the Guidance and Counseling Office.",
];

const ADMIN_BENEFITS = [
  "Manage user accounts, roles, and system permissions securely.",
  "Oversee system-wide counseling statistics and evaluation analytics.",
  "Monitor audit logs and track administrative activities.",
  "Configure platform settings, and announcements.",
  "Ensure seamless system operations across all university departments.",
];

const CARDS = [
  {
    icon: GraduationCap,
    title: "For Students",
    benefits: STUDENT_BENEFITS,
    bg: "bg-gradient-to-br from-maroon-500 to-maroon-700",
  },
  {
    icon: Stethoscope,
    title: "For Counselors",
    benefits: COUNSELOR_BENEFITS,
    bg: "bg-gradient-to-br from-teal-500 to-teal-700",
  },
  {
    icon: Building2,
    title: "For Colleges",
    benefits: COLLEGE_BENEFITS,
    bg: "bg-gradient-to-br from-indigo-500 to-indigo-700",
  },
  {
    icon: ShieldCheck,
    title: "For Administration",
    benefits: ADMIN_BENEFITS,
    bg: "bg-gradient-to-br from-purple-600 to-purple-800",
  },
];

function BenefitCard({ icon: Icon, title, benefits, bg }) {
  return (
    <div className={`relative rounded-3xl ${bg} p-8 overflow-hidden`}>
      {/* Decorative blobs */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />

      <div className="relative z-10">
        {/* Icon + title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Icon size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>

        {/* Benefits list */}
        <ul className="space-y-3">
          {benefits.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 size={17} className="text-white/80 shrink-0 mt-0.5" />
              <span className="text-white/90 text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function BenefitsSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-maroon-100 text-maroon-600 text-sm font-semibold mb-4 tracking-wide uppercase">
            Benefits
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Built for Everyone
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">
            CounceLink serves students, counselors, college representatives, and administrators
            with tools designed for each role.
          </p>
        </div>

        {/* Four cards — responsive grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CARDS.map((card) => (
            <BenefitCard key={card.title} {...card} />
          ))}
        </div>

        {/* Bottom promo strip */}
        <div className="mt-10 rounded-2xl bg-gradient-to-r from-maroon-50 to-indigo-50 border border-maroon-100 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">
              Ready to experience CounceLink?
            </h4>
            <p className="text-gray-500 text-sm">
              Join the growing community of MSU students, counselors, college
              representatives, and administrators already using the platform.
            </p>
          </div>
          <a
            href="/login"
            className="shrink-0 px-6 py-3 rounded-xl bg-maroon-500 text-white font-semibold text-sm hover:bg-maroon-600 transition-all duration-200 shadow-sm"
          >
            Login Now
          </a>
        </div>
      </div>
    </section>
  );
}
