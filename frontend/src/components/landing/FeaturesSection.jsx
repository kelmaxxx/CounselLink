// src/components/landing/FeaturesSection.jsx
import React from "react";
import {
  CalendarDays,
  ShieldCheck,
  Bell,
  ClipboardList,
  UserCircle,
  LayoutDashboard,
  BarChart3,
  Lock,
} from "lucide-react";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Online Appointment Scheduling",
    description:
      "Students can book, reschedule, or cancel counseling appointments anytime, from any device.",
    color: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
  },
  {
    icon: ShieldCheck,
    title: "Secure Counseling Records",
    description:
      "All counseling notes, forms, and session details are encrypted and access-controlled.",
    color: "bg-maroon-50 text-maroon-600 group-hover:bg-maroon-100",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description:
      "Students and counselors receive instant alerts for appointment updates, approvals, and reminders.",
    color: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
  },
  {
    icon: ClipboardList,
    title: "Appointment Tracking",
    description:
      "View the full status of any appointment — pending, approved, completed, or cancelled — in one place.",
    color: "bg-teal-50 text-teal-600 group-hover:bg-teal-100",
  },
  {
    icon: UserCircle,
    title: "Student Profile Management",
    description:
      "Maintain complete student profiles including academic details, contact info, and counseling history.",
    color: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
  },
  {
    icon: LayoutDashboard,
    title: "Counselor Dashboard",
    description:
      "A powerful overview for counselors to manage appointments, student cases, and daily schedules efficiently.",
    color: "bg-rose-50 text-rose-500 group-hover:bg-rose-100",
  },
  {
    icon: BarChart3,
    title: "Reports and Analytics",
    description:
      "Generate detailed reports on counseling sessions, student demographics, and service utilization trends.",
    color: "bg-orange-50 text-orange-500 group-hover:bg-orange-100",
  },
  {
    icon: Lock,
    title: "Role-Based Access Control",
    description:
      "Separate access levels for students, counselors, college reps, and admins to protect sensitive data.",
    color: "bg-slate-50 text-slate-600 group-hover:bg-slate-100",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-maroon-100 text-maroon-600 text-sm font-semibold mb-4 tracking-wide uppercase">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need in One Platform
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            From scheduling to records management, CounceLink covers the full
            lifecycle of guidance counseling services.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, description, color }) => (
            <div
              key={title}
              className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default"
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${color}`}
              >
                <Icon size={22} />
              </div>

              {/* Text */}
              <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">
                {title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {description}
              </p>

              {/* Hover accent line */}
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-maroon-500 to-maroon-300 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-b-2xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
