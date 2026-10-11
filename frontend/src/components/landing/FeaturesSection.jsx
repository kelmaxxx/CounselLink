// src/components/landing/FeaturesSection.jsx
import React from "react";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
import {
  CalendarDays, ShieldCheck, Bell, ClipboardList,
  UserCircle, LayoutDashboard, BarChart3, Lock,
} from "lucide-react";

const FEATURES = [
  { icon: CalendarDays, title: "Online Appointment Scheduling", description: "Students can book, reschedule, or cancel counseling appointments anytime, from any device.", color: "bg-blue-500/10 text-blue-600 dark:text-blue-300", glow: "group-hover:shadow-blue-500/20" },
  { icon: ShieldCheck, title: "Secure Counseling Records", description: "All counseling notes, forms, and session details are encrypted and access-controlled.", color: "bg-maroon-500/10 text-maroon-500 dark:text-maroon-300", glow: "group-hover:shadow-maroon-500/20" },
  { icon: Bell, title: "Real-Time Notifications", description: "Students and counselors receive instant alerts for appointment updates, approvals, and reminders.", color: "bg-amber-500/10 text-amber-600 dark:text-amber-300", glow: "group-hover:shadow-amber-500/20" },
  { icon: ClipboardList, title: "Appointment Tracking", description: "View the full status of any appointment — pending, approved, completed, or cancelled — in one place.", color: "bg-teal-500/10 text-teal-600 dark:text-teal-300", glow: "group-hover:shadow-teal-500/20" },
  { icon: UserCircle, title: "Student Profile Management", description: "Maintain complete student profiles including academic details, contact info, and counseling history.", color: "bg-violet-500/10 text-violet-600 dark:text-violet-300", glow: "group-hover:shadow-violet-500/20" },
  { icon: LayoutDashboard, title: "Counselor Dashboard", description: "A powerful overview for counselors to manage appointments, student cases, and daily schedules efficiently.", color: "bg-rose-500/10 text-rose-500 dark:text-rose-300", glow: "group-hover:shadow-rose-500/20" },
  { icon: BarChart3, title: "Reports and Analytics", description: "Generate detailed reports on counseling sessions, student demographics, and service utilization trends.", color: "bg-orange-500/10 text-orange-500 dark:text-orange-300", glow: "group-hover:shadow-orange-500/20" },
  { icon: Lock, title: "Role-Based Access Control", description: "Separate access levels for students, counselors, college reps, and admins to protect sensitive data.", color: "bg-slate-500/10 text-slate-600 dark:text-slate-300", glow: "group-hover:shadow-slate-500/20" },
];

export default function FeaturesSection() {
  return (
    <section id="features" aria-label="Platform features" className="py-24 bg-white dark:bg-gray-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-maroon-200/30 dark:bg-maroon-500/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <Reveal className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-2xl bg-maroon-100 dark:bg-maroon-500/15 text-maroon-600 dark:text-maroon-300 text-sm font-bold mb-4 tracking-wide uppercase border border-maroon-200/60 dark:border-maroon-500/20">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
            Everything You Need in{" "}
            <span className="bg-gradient-to-r from-maroon-500 via-maroon-400 to-maroon-300 bg-clip-text text-transparent">One Platform</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            From scheduling to records management, CounceLink covers the full
            lifecycle of guidance counseling services.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, description, color, glow }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: (i % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8, scale: 1.02 }}
              className={`group relative bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-white/10 p-6 hover:shadow-2xl ${glow} cursor-default transition-shadow`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${color}`}>
                <Icon size={22} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 leading-snug">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
              <div className="absolute bottom-0 inset-x-6 h-0.5 bg-gradient-to-r from-maroon-500 via-maroon-300 to-maroon-300 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full" aria-hidden="true" />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
