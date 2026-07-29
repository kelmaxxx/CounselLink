// src/components/landing/FAQSection.jsx
import React, { useState } from "react";
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
      className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
        isOpen
          ? "border-maroon-200 shadow-sm"
          : "border-gray-100 hover:border-gray-200"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-white hover:bg-gray-50/60 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-gray-900 leading-snug">
          {question}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform duration-300 ${
            isOpen ? "rotate-180 text-maroon-500" : ""
          }`}
        />
      </button>

      {/* Accordion body */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="px-6 pb-5 pt-1 bg-white border-t border-gray-50">
          <p className="text-gray-600 leading-relaxed text-sm">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section id="faq" className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-maroon-100 text-maroon-600 text-sm font-semibold mb-4 tracking-wide uppercase">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">
            Have a question about CounceLink? Here are answers to the most
            common questions from students and counselors.
          </p>
        </div>

        {/* Accordion list */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <FAQItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIdx === idx}
              onToggle={() => setOpenIdx(openIdx === idx ? -1 : idx)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
