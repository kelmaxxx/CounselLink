// src/components/landing/BenefitsSection.jsx
import React from "react";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
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
  { icon: GraduationCap, title: "For Students", benefits: STUDENT_BENEFITS, bg: "bg-gradient-to-br from-maroon-500 to-maroon-600 dark:from-maroon-500 dark:to-teal-800" },
  { icon: Stethoscope, title: "For Counselors", benefits: COUNSELOR_BENEFITS, bg: "bg-gradient-to-br from-maroon-500 to-maroon-700" },
  { icon: Building2, title: "For Colleges", benefits: COLLEGE_BENEFITS, bg: "bg-gradient-to-br from-indigo-500 to-indigo-700" },
  { icon: ShieldCheck, title: "For Administration", benefits: ADMIN_BENEFITS, bg: "bg-gradient-to-br from-purple-600 to-purple-800" },
];

function BenefitCard({ icon: Icon, title, benefits, bg }) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`relative rounded-2xl ${bg} p-8 overflow-hidden hover:shadow-2xl border border-white/20`}
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 animate-blob-drift" aria-hidden="true" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 animate-blob-drift" style={{ animationDelay: "3s" }} aria-hidden="true" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center">
            <Icon size={24} className="text-white" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <ul className="space-y-3">
          {benefits.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 size={17} className="text-white/80 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-white/90 text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export default function BenefitsSection() {
  return (
    <section aria-label="Benefits by role" className="py-24 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-2xl bg-maroon-100 dark:bg-maroon-500/15 text-maroon-600 dark:text-maroon-300 text-sm font-bold mb-4 tracking-wide uppercase">Benefits</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Built for Everyone</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg leading-relaxed">
            CounceLink serves students, counselors, college representatives, and administrators with tools designed for each role.
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CARDS.map((card, i) => (
            <Reveal key={card.title} variant="up" delay={(i % 4) * 90}>
              <BenefitCard {...card} />
            </Reveal>
          ))}
        </div>
        <Reveal variant="scale" className="mt-10 rounded-2xl bg-gradient-to-r from-maroon-50 to-indigo-50 dark:from-maroon-500/10 dark:to-indigo-500/10 border border-maroon-100 dark:border-white/10 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-xl">
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Ready to experience CounceLink?</h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Join the growing community of MSU students, counselors, college representatives, and administrators already using the platform.</p>
          </div>
          <a href="/login" aria-label="Login now to CounceLink" className="shrink-0 px-6 py-3 rounded-2xl bg-maroon-500 text-white font-semibold text-sm hover:bg-maroon-500 hover:-translate-y-0.5 transition-all duration-200 shadow-glow">
            Login Now
          </a>
        </Reveal>
      </div>
    </section>
  );
}
