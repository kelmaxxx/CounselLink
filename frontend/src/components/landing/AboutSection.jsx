// src/components/landing/AboutSection.jsx
import React from "react";
import { CheckCircle2, BookOpen, Users, Heart } from "lucide-react";

const BENEFITS = [
  "Digitizing the entire appointment scheduling process end-to-end",
  "Organizing and securing counseling records with role-based access",
  "Reducing paperwork and manual administrative workload",
  "Improving real-time communication between students and counselors",
  "Making counseling services more accessible across all colleges",
];

export default function AboutSection() {
  return (
    <section id="about" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section label */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-maroon-100 text-maroon-600 text-sm font-semibold mb-4 tracking-wide uppercase">
            About CounceLink
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Empowering the Guidance &amp; Counseling Office
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            A modern digital solution built for Mindanao State University –
            Marawi City's Division of Student Affairs.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left — visual */}
          <div className="relative">
            {/* Card grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: BookOpen,
                  label: "Digital Records",
                  color: "bg-blue-50 text-blue-600",
                },
                {
                  icon: CalendarCheckIcon,
                  label: "Smart Scheduling",
                  color: "bg-maroon-50 text-maroon-600",
                },
                {
                  icon: Heart,
                  label: "Student Wellness",
                  color: "bg-rose-50 text-rose-500",
                },
                {
                  icon: Users,
                  label: "Counselor Tools",
                  color: "bg-amber-50 text-amber-600",
                },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center gap-3 text-center"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={24} />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                </div>
              ))}
            </div>

            {/* MSU Marawi / DSA Badge Card */}
            <div className="mt-4 bg-gradient-to-r from-maroon-700 to-maroon-800 text-white rounded-2xl p-4 shadow-md border border-maroon-500/40 flex items-center gap-3.5">
              <img
                src="/msu-logo.png"
                alt="MSU Logo"
                className="w-10 h-10 object-contain bg-white/15 rounded-xl p-1 shrink-0"
              />
              <div>
                <p className="text-xs font-bold text-green-300 uppercase tracking-wider">
                  MSU – Marawi City
                </p>
                <p className="text-sm font-semibold text-white">
                  Division of Student Affairs
                </p>
              </div>
            </div>
          </div>

          {/* Right — text */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-5">
              What CounceLink Does for the Guidance Office
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              The Guidance and Counseling Office at MSU Marawi City serves
              thousands of students. CounceLink was built to support counselors
              and administrators by transforming paper-based processes into a
              seamless digital experience.
            </p>

            <ul className="space-y-4">
              {BENEFITS.map((text) => (
                <li key={text} className="flex gap-3">
                  <CheckCircle2
                    size={20}
                    className="text-maroon-500 shrink-0 mt-0.5"
                  />
                  <span className="text-gray-700">{text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center gap-4">
              <img
                src="/dsa-logo.png?v=2"
                alt="Division of Student Affairs"
                className="h-14 object-contain"
              />
              <img
                src="/msu-logo.png"
                alt="MSU Marawi"
                className="h-14 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Inline calendar icon to avoid extra import duplication
function CalendarCheckIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </svg>
  );
}
