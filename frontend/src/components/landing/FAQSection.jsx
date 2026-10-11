// src/components/landing/FAQSection.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "./Reveal";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "How do I request a counseling appointment?",
    answer:
      "After logging in with your MSU student account, navigate to the 'Request Appointment' page. Select your preferred counselor, choose an available date and time slot, describe your concern, and submit your request. You'll receive a notification once your counselor approves or responds.",
  },
  {
    question: "Can I reschedule or cancel an appointment?",
    answer:
      "Yes. You can reschedule or cancel an appointment as long as it hasn't been completed yet. Go to 'My Appointments', find the appointment you'd like to change, and select the reschedule or cancel option. Your counselor will be notified of any changes.",
  },
  {
    question: "Is my counseling information kept confidential?",
    answer:
      "Absolutely. CounceLink uses role-based access control to ensure that your counseling records are only accessible to your assigned counselor and authorized administrators. Student data is never shared without consent and is handled in accordance with the university's data privacy policies.",
  },
  {
    question: "What happens if I miss an appointment?",
    answer:
      "If you miss a scheduled appointment, it will be marked as 'No Show' in the system. You may request a new appointment from your counselor. Repeated no-shows may affect your ability to book future appointments, so please cancel in advance if you cannot attend.",
  },
  {
    question: "How do counselors approve appointment requests?",
    answer:
      "Counselors receive real-time notifications for new appointment requests. They can log in to their dashboard, review the request details, and choose to approve, propose a new time, or decline. Once a decision is made, the student is notified immediately through the platform.",
  },
  {
    question: "Who can use CounceLink?",
    answer:
      "CounceLink is designed for students, guidance counselors, college representatives, and administrators at Mindanao State University – Marawi City. Students must register using their MSU institutional email (@s.msumain.edu.ph) and wait for admin approval before they can book appointments.",
  },
];

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-200 backdrop-blur-xl ${
        isOpen
          ? "border-emerald-200 dark:border-emerald-500/30 shadow-lg bg-white dark:bg-white/[0.05]"
          : "border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20 bg-white/70 dark:bg-white/[0.03]"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-gray-900 dark:text-white leading-snug">{question}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown size={18} className={`shrink-0 ${isOpen ? "text-emerald-500" : "text-gray-400"}`} aria-hidden="true" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-1 border-t border-gray-50 dark:border-white/10">
              <p className="text-gray-600 dark:text-gray-300 leading-[1.8] text-sm">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section id="faq" aria-label="Frequently asked questions" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-sm font-bold mb-4 tracking-wide uppercase">FAQ</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg leading-relaxed">Have a question about CounceLink? Here are answers to the most common questions from students and counselors.</p>
        </Reveal>
        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <Reveal key={faq.question} variant="up" delay={Math.min(idx, 5) * 60}>
              <FAQItem question={faq.question} answer={faq.answer} isOpen={openIdx === idx} onToggle={() => setOpenIdx(openIdx === idx ? -1 : idx)} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
