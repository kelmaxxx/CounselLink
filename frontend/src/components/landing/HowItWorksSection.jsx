// src/components/landing/HowItWorksSection.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
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
 * Pinned Horizontal Card Track (scroll-jacked horizontal slider).
 * Vertical page scroll drives a horizontal track inside a sticky viewport.
 * Tall wrapper (~450vh) = slow, clean scroll — one viewport, no section jumps.
 */
export default function HowItWorksSection() {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const barRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const ticking = useRef(false);
  const activeRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
    }
  }, []);

  const update = useCallback(() => {
    ticking.current = false;
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const rect = wrap.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return;
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    const p = scrolled / total;

    // Horizontal distance: track width minus visible viewport
    const maxX = Math.max(0, track.scrollWidth - window.innerWidth + 48);
    const x = p * maxX;
    track.style.transform = `translate3d(${-x}px, 0, 0)`;

    if (barRef.current) {
      barRef.current.style.transform = `scaleX(${p})`;
    }

    const nearest = Math.min(
      STEPS.length - 1,
      Math.round(p * (STEPS.length - 1))
    );
    const next = nearest;
    if (activeRef.current !== next) {
      activeRef.current = next;
      setActiveStep(next);
    }
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
    // Re-measure after fonts/images settle
    const t = setTimeout(update, 300);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      clearTimeout(t);
    };
  }, [update, reducedMotion]);

  const jumpToStep = (i) => {
    const el = wrapRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const total = el.offsetHeight - window.innerHeight;
    const target = top + (total * i) / (STEPS.length - 1);
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  // Reduced-motion fallback: normal stacked layout, no pin transform
  if (reducedMotion) {
    return (
      <section id="how-it-works" className="relative bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-gray-900 text-center mb-14">
            Simple Steps to Get Counseling Support
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {STEPS.map(({ step, icon: Icon, title, description }) => (
              <div key={step} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <span className="text-5xl font-black text-maroon-500/15 tabular-nums">{step}</span>
                <div className="w-12 h-12 rounded-2xl bg-maroon-500 text-white flex items-center justify-center my-4">
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="how-it-works"
      ref={wrapRef}
      className="relative bg-gradient-to-b from-gray-50 via-white to-gray-50"
      style={{ height: "450vh" }}
    >
      {/* Pinned viewport */}
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
        {/* Giant background number */}
        <div
          key={activeStep}
          aria-hidden
          className="animate-step-ghost pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        >
          <span className="text-[38vw] lg:text-[24rem] font-black leading-none text-maroon-500/[0.06] tabular-nums">
            {STEPS[activeStep].step}
          </span>
        </div>

        {/* Large heading — no badge, no helper subtitle */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8 lg:mb-12">
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-gray-900 leading-[1.02] max-w-3xl">
              Simple Steps to Get Counseling Support
            </h2>
            <div className="shrink-0 flex items-center gap-4">
              <span className="text-sm font-bold text-maroon-600 tabular-nums">
                {String(activeStep + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2">
                {STEPS.map((s, i) => (
                  <button
                    key={s.step}
                    onClick={() => jumpToStep(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === activeStep ? "w-8 bg-maroon-500" : i < activeStep ? "w-2 bg-maroon-300" : "w-2 bg-gray-200 hover:bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Progress hairline */}
          <div className="h-1 rounded-full bg-maroon-100/80 overflow-hidden mb-8 lg:mb-10">
            <div
              ref={barRef}
              className="h-full w-full origin-left bg-gradient-to-r from-maroon-400 via-maroon-500 to-maroon-600 rounded-full"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        </div>

        {/* Horizontal card track — driven by vertical scroll */}
        <div className="relative w-full">
          <div
            ref={trackRef}
            className="flex gap-5 sm:gap-7 w-max px-4 sm:px-8 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))] will-change-transform"
            style={{ transform: "translate3d(0,0,0)" }}
          >
            {STEPS.map(({ step, icon: Icon, title, description }, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              return (
                <article
                  key={step}
                  className={`relative shrink-0 w-[82vw] sm:w-[420px] lg:w-[460px] rounded-[2rem] border-2 p-7 sm:p-9 text-left transition-all duration-500 bg-white ${
                    isActive
                      ? "border-maroon-500 shadow-2xl shadow-maroon-500/15 scale-[1.02]"
                      : isDone
                        ? "border-maroon-200 shadow-lg opacity-90"
                        : "border-gray-100 shadow-lg opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <span
                      className={`text-6xl sm:text-7xl font-black tabular-nums leading-none transition-colors ${
                        isActive ? "text-maroon-500" : "text-gray-200"
                      }`}
                    >
                      {step}
                    </span>
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                        isActive ? "bg-maroon-500 text-white shadow-lg shadow-maroon-500/30" : "bg-maroon-50 text-maroon-500"
                      }`}
                    >
                      <Icon size={26} />
                    </div>
                  </div>
                  <h3 className={`text-2xl sm:text-[1.7rem] font-bold mb-3 leading-snug ${isActive ? "text-maroon-700" : "text-gray-900"}`}>
                    {title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed text-[15px] sm:text-base">
                    {description}
                  </p>
                  <div className="mt-7 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold tracking-widest px-2.5 py-1 rounded-full border transition-all ${
                        isDone
                          ? "bg-maroon-500 text-white border-maroon-500"
                          : isActive
                            ? "bg-maroon-50 text-maroon-600 border-maroon-200"
                            : "bg-gray-50 text-gray-400 border-gray-200"
                      }`}
                    >
                      {isDone ? "✓ DONE" : isActive ? "● CURRENT" : `STEP ${step}`}
                    </span>
                    <span className="text-xs font-semibold text-gray-300 tabular-nums">
                      {i + 1} — {STEPS.length}
                    </span>
                  </div>
                </article>
              );
            })}

            {/* End spacer card */}
            <div className="shrink-0 w-[8vw] sm:w-[10vw]" aria-hidden />
          </div>
        </div>

        {/* Screen-reader / SEO fallback */}
        <ol className="sr-only">
          {STEPS.map((s) => (
            <li key={s.step}>
              Step {s.step}: {s.title} — {s.description}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
