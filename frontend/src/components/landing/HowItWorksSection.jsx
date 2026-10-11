// src/components/landing/HowItWorksSection.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import Reveal from "./Reveal";
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

/**
 * Scroll-sequenced How It Works.
 * The section is tall (300vh) with a sticky viewport inside.
 * Scroll progress drives `activeStep`:
 *   enter -> Step 1 pops in, scroll more -> Step 2 pops, etc.
 * One scroll segment = one step, giving the "pop each time you scroll" feel.
 */
export default function HowItWorksSection() {
  const wrapRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
      setActiveStep(STEPS.length - 1);
    }
  }, []);

  const update = useCallback(() => {
    ticking.current = false;
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return;
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    const p = scrolled / total;
    // Map 0..1 across steps so each step gets its own scroll segment.
    // Slight bias so the first step is already visible on entry.
    const float = p * STEPS.length;
    const idx = Math.min(STEPS.length - 1, Math.max(0, Math.floor(float)));
    setActiveStep((prev) => (prev === idx ? prev : idx));
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [update, reducedMotion]);

  const jumpToStep = (i) => {
    const el = wrapRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const total = el.offsetHeight - window.innerHeight;
    const target = top + (total * (i + 0.5)) / STEPS.length;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const ActiveIcon = STEPS[activeStep].icon;
  const fillPct = ((activeStep + 1) / STEPS.length) * 100;

  return (
    <section
      id="how-it-works"
      ref={wrapRef}
      className="relative bg-gradient-to-b from-gray-50 via-white to-gray-50 lg:h-[340vh] h-[310vh]"
    >
      <div className="sticky top-0 min-h-screen flex items-center overflow-hidden py-20">
        {/* Giant background step number — changes per step */}
        <div
          key={activeStep}
          aria-hidden
          className="animate-step-ghost pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        >
          <span className="text-[38vw] lg:text-[26rem] font-black leading-none text-maroon-500/[0.06] tabular-nums">
            {STEPS[activeStep].step}
          </span>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Header */}
          <Reveal className="text-center mb-8 lg:mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-maroon-100 text-maroon-600 text-sm font-semibold mb-4 tracking-wide uppercase">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Simple Steps to Get Counseling Support
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base lg:text-lg">
              Scroll slowly — each step pops in as you go.
            </p>
          </Reveal>

          {/* Desktop stepper — sequential pop driven by scroll */}
          <div className="relative hidden lg:block">
            {/* Track + fill connector */}
            <div className="absolute top-14 left-[8%] right-[8%] h-1 rounded-full bg-maroon-100/80 overflow-visible">
              <div
                className="h-full rounded-full bg-gradient-to-r from-maroon-400 via-maroon-500 to-maroon-600 transition-all duration-500 ease-out relative"
                style={{ width: `${fillPct}%` }}
              >
                <span className="absolute -right-2 -top-1.5 w-4 h-4 rounded-full bg-maroon-500 border-4 border-white shadow-md animate-step-ping" />
              </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
              {STEPS.map(({ step, icon: Icon, title, description }, idx) => {
                const revealed = reducedMotion || idx <= activeStep;
                const isActive = idx === activeStep;
                const isDone = idx < activeStep;
                return (
                  <div
                    key={step}
                    className={`relative flex flex-col items-center text-center transition-all duration-500 ease-out ${
                      revealed
                        ? "opacity-100 translate-y-0 scale-100 blur-0"
                        : "opacity-0 translate-y-10 scale-90 blur-[3px] pointer-events-none"
                    }`}
                    style={{ transitionDelay: revealed ? "60ms" : "0ms" }}
                  >
                    <div className="relative z-10 mb-5">
                      {/* Glow ring behind active card */}
                      {isActive && (
                        <span className="absolute -inset-3 rounded-full bg-maroon-400/20 blur-xl animate-step-glow" />
                      )}
                      <div
                        key={`${step}-${isActive ? "on" : "off"}`}
                        className={`relative w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center border-2 transition-all duration-500 ${
                          isActive
                            ? "border-maroon-500 shadow-xl shadow-maroon-500/20 scale-110 animate-step-pop"
                            : isDone
                              ? "border-maroon-300 shadow-md"
                              : "border-maroon-100 shadow-md"
                        }`}
                      >
                        <span
                          className={`text-[11px] font-bold tracking-widest mb-1 ${
                            isActive ? "text-maroon-600" : "text-maroon-400"
                          }`}
                        >
                          STEP {step}
                        </span>
                        <Icon
                          size={28}
                          className={isActive ? "text-maroon-600" : "text-maroon-500"}
                        />
                      </div>
                      {/* Check badge for completed steps */}
                      <span
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all duration-500 ${
                          isDone
                            ? "bg-maroon-500 text-white border-maroon-500 opacity-100 scale-100"
                            : "bg-white text-gray-300 border-gray-200 opacity-0 scale-75"
                        }`}
                      >
                        ✓ DONE
                      </span>
                    </div>

                    <h3
                      className={`text-base font-bold mb-2 transition-colors ${
                        isActive ? "text-maroon-700" : "text-gray-900"
                      }`}
                    >
                      {title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile / tablet — focused active-step card */}
          <div className="lg:hidden">
            <div className="relative max-w-md mx-auto">
              <div className="absolute inset-x-8 top-10 h-1 rounded-full bg-maroon-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-maroon-400 to-maroon-600 transition-all duration-500"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <div
                key={activeStep}
                className="animate-step-pop relative bg-white rounded-3xl border-2 border-maroon-500 shadow-xl shadow-maroon-500/10 p-6 pt-8 text-center"
              >
                <div className="mx-auto -mt-14 mb-4 w-20 h-20 rounded-full bg-white border-2 border-maroon-500 shadow-lg flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-maroon-500 tracking-widest">
                    STEP {STEPS[activeStep].step}
                  </span>
                  <ActiveIcon size={24} className="text-maroon-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {STEPS[activeStep].title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">
                  {STEPS[activeStep].description}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {STEPS.map((s, i) => (
                    <button
                      key={s.step}
                      onClick={() => jumpToStep(i)}
                      aria-label={`Go to step ${i + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === activeStep ? "w-7 bg-maroon-500" : "w-2 bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Upcoming steps preview */}
              <div className="mt-4 space-y-2">
                {STEPS.map((s, i) =>
                  i > activeStep ? (
                    <div
                      key={s.step}
                      className="flex items-center gap-3 bg-white/60 backdrop-blur border border-dashed border-gray-200 rounded-2xl px-4 py-2.5 opacity-70"
                    >
                      <span className="text-[11px] font-black text-gray-300 tabular-nums">
                        {s.step}
                      </span>
                      <span className="text-sm font-semibold text-gray-400">
                        {s.title}
                      </span>
                      <span className="ml-auto text-[11px] text-gray-300 font-medium">
                        scroll to unlock
                      </span>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </div>

          {/* Screen-reader / SEO fallback: full list */}
          <ol className="sr-only">
            {STEPS.map((s) => (
              <li key={s.step}>
                Step {s.step}: {s.title} — {s.description}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
