// src/components/landing/HowItWorksSection.jsx
import React from "react";
import {
  UserPlus,
  CalendarPlus,
  Clock,
  MessageSquare,
  History,
} from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: UserPlus,
    title: "Register / Login",
    description:
      "Create your student account using your MSU institutional email, or log in if you already have an approved account.",
  },
  {
    step: "02",
    icon: CalendarPlus,
    title: "Request Appointment",
    description:
      "Browse available counselors and time slots, then submit an appointment request with your preferred schedule.",
  },
  {
    step: "03",
    icon: Clock,
    title: "Wait for Approval",
    description:
      "Your counselor reviews the request and approves, reschedules, or declines it. You'll be notified instantly.",
  },
  {
    step: "04",
    icon: MessageSquare,
    title: "Attend Counseling Session",
    description:
      "Meet with your assigned counselor at the scheduled time. Session notes are securely recorded in the system.",
  },
  {
    step: "05",
    icon: History,
    title: "View Appointment History",
    description:
      "Access your complete counseling history, session summaries, and upcoming appointments anytime from your dashboard.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-maroon-100 text-maroon-600 text-sm font-semibold mb-4 tracking-wide uppercase">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple Steps to Get Counseling Support
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">
            From registration to your counseling session, the entire process is
            streamlined and transparent.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-14 left-0 right-0 h-px bg-gradient-to-r from-transparent via-maroon-200 to-transparent" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {STEPS.map(({ step, icon: Icon, title, description }, idx) => (
              <div key={step} className="relative flex flex-col items-center text-center group">
                {/* Number + icon circle */}
                <div className="relative z-10 mb-5">
                  <div className="w-28 h-28 rounded-full bg-white shadow-md border-2 border-maroon-100 flex flex-col items-center justify-center group-hover:border-maroon-400 group-hover:shadow-lg transition-all duration-300">
                    <span className="text-xs font-bold text-maroon-400 tracking-widest mb-1">
                      STEP {step}
                    </span>
                    <Icon size={28} className="text-maroon-500" />
                  </div>
                  {/* Connector dot */}
                  {idx < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-maroon-200" />
                  )}
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-2">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-maroon-500 text-white font-semibold text-base hover:bg-maroon-600 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            Get Started Now
          </a>
        </div>
      </div>
    </section>
  );
}
