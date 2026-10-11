// src/components/landing/HowItWorksSection.jsx
import React from "react";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
import { UserPlus, CalendarPlus, Clock, MessageSquare, History } from "lucide-react";

const STEPS = [
  { step: "01", icon: UserPlus, title: "Register / Login", description: "Create your student account using your MSU institutional email, or log in if you already have an approved account." },
  { step: "02", icon: CalendarPlus, title: "Request Appointment", description: "Browse available counselors and time slots, then submit an appointment request with your preferred schedule." },
  { step: "03", icon: Clock, title: "Wait for Approval", description: "Your counselor reviews the request and approves, reschedules, or declines it. You'll be notified instantly." },
  { step: "04", icon: MessageSquare, title: "Attend Counseling Session", description: "Meet with your assigned counselor at the scheduled time. Session notes are securely recorded in the system." },
  { step: "05", icon: History, title: "View Appointment History", description: "Access your complete counseling history, session summaries, and upcoming appointments anytime from your dashboard." },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-label="How it works" className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-2xl bg-maroon-100 dark:bg-maroon-500/15 text-maroon-600 dark:text-maroon-300 text-sm font-bold mb-4 tracking-wide uppercase">How It Works</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Simple Steps to Get Counseling Support</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg leading-relaxed">From registration to your counseling session, the entire process is streamlined and transparent.</p>
        </Reveal>
        <div className="relative">
          <div className="hidden lg:block absolute top-14 left-0 right-0 h-px bg-gradient-to-r from-transparent via-maroon-300 dark:via-maroon-500/40 to-transparent" aria-hidden="true" />
          <ol className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 list-none">
            {STEPS.map(({ step, icon: Icon, title, description }, idx) => (
              <motion.li
                key={step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -6 }}
                className="relative flex flex-col items-center text-center group"
              >
                <div className="relative z-10 mb-5">
                  <div className="w-28 h-28 rounded-full bg-white dark:bg-white/[0.06] backdrop-blur-xl shadow-lg border-2 border-maroon-100 dark:border-maroon-500/25 flex flex-col items-center justify-center group-hover:border-maroon-400 group-hover:shadow-glow transition-all duration-300">
                    <span className="text-xs font-bold text-maroon-500 dark:text-maroon-300 tracking-widest mb-1">STEP {step}</span>
                    <Icon size={28} className="text-maroon-500 dark:text-maroon-300 transition-transform group-hover:scale-110 group-hover:-rotate-6" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
