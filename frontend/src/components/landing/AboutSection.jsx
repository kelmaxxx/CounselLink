// src/components/landing/AboutSection.jsx
import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, BookOpen, Users, Heart, CalendarCheck } from "lucide-react";
import Reveal from "./Reveal";

const BENEFITS = [
  "Digitizing the entire appointment scheduling process end-to-end",
  "Organizing and securing counseling records with role-based access",
  "Reducing paperwork and manual administrative workload",
  "Improving real-time communication between students and counselors",
  "Making counseling services more accessible across all colleges",
];

const MINI = [
  { icon: BookOpen, label: "Digital Records", color: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
  { icon: CalendarCheck, label: "Smart Scheduling", color: "bg-maroon-500/10 text-maroon-500 dark:text-maroon-300" },
  { icon: Heart, label: "Student Wellness", color: "bg-rose-500/10 text-rose-500 dark:text-rose-300" },
  { icon: Users, label: "Counselor Tools", color: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
];

export default function AboutSection() {
  return (
    <section id="about" aria-label="About CounceLink" className="py-24 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-2xl bg-maroon-100 dark:bg-maroon-500/15 text-maroon-600 dark:text-maroon-300 text-sm font-bold mb-4 tracking-wide uppercase">
            About CounceLink
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
            Empowering the Guidance &amp; Counseling Office
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            A modern digital solution built for Mindanao State University –
            Marawi City&apos;s Division of Student Affairs.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <Reveal variant="left" className="relative">
            <div className="grid grid-cols-2 gap-4">
              {MINI.map(({ icon: Icon, label, color }, i) => (
                <motion.div
                  key={label}
                  whileHover={{ y: -6, scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/10 hover:shadow-xl flex flex-col items-center gap-3 text-center"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:bounce ${color}`}>
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 bg-gradient-to-r from-maroon-700 via-maroon-600 to-maroon-800 text-white rounded-2xl p-4 shadow-lg border border-white/20 flex items-center gap-3.5">
              <img src="/msu-logo.png" alt="MSU logo" loading="lazy" className="w-10 h-10 object-contain bg-white/15 rounded-xl p-1 shrink-0" />
              <div>
                <p className="text-xs font-bold text-maroon-200 uppercase tracking-wider">MSU – Marawi City</p>
                <p className="text-sm font-semibold text-white">Division of Student Affairs</p>
              </div>
            </div>
          </Reveal>

          <Reveal variant="right" delay={120}>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">What CounceLink Does for the Guidance Office</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-[1.85]">
              The Guidance and Counseling Office at MSU Marawi City serves
              thousands of students. CounceLink was built to support counselors
              and administrators by transforming paper-based processes into a
              seamless digital experience.
            </p>
            <ul className="space-y-4">
              {BENEFITS.map((text, i) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.45 }}
                  className="flex gap-3 items-start bg-white/60 dark:bg-white/[0.04] border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-3"
                >
                  <CheckCircle2 size={20} className="text-maroon-500 dark:text-maroon-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-gray-700 dark:text-gray-200">{text}</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-8 flex items-center gap-4">
              <img src="/dsa-logo.png?v=2" alt="Division of Student Affairs logo" loading="lazy" className="h-14 object-contain" />
              <img src="/msu-logo.png" alt="MSU Marawi logo" loading="lazy" className="h-14 object-contain" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
