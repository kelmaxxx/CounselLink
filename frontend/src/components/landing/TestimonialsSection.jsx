// src/components/landing/TestimonialsSection.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import Reveal from "./Reveal";

const TESTIMONIALS = [
  { name: "Amina D.", role: "Psychology Student, CSSH", initials: "AD", color: "from-emerald-400 to-teal-500", quote: "Booking a counseling session used to mean long lines at the DSA office. Now I request, reschedule, and get notified — all from my phone. It feels safe and private." },
  { name: "Mohammad K.", role: "Engineering Student, COE", initials: "MK", color: "from-cyan-400 to-blue-500", quote: "The reminders saved me twice. My counselor approved my request within the day and I could track everything from my dashboard. Super smooth." },
  { name: "Sittie N.", role: "Education Student, CED", initials: "SN", color: "from-violet-400 to-purple-500", quote: "I love that my records are confidential and organized. The platform made it so much easier to reach out for help without the awkwardness." },
  { name: "Jalaluddin M. A.", role: "Guidance Services Specialist III", initials: "JA", color: "from-amber-400 to-orange-500", quote: "CounceLink cut our paperwork dramatically. Approvals, session notes, and reports are all in one secure place. We serve more students with less stress." },
  { name: "Rohanna M. R.", role: "Guidance Services Specialist I", initials: "RR", color: "from-rose-400 to-pink-500", quote: "Real-time notifications changed everything — fewer no-shows, faster follow-ups, and students actually come prepared. Highly recommended for every college." },
];

export default function TestimonialsSection() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setIdx((p) => (p + 1) % TESTIMONIALS.length), []);
  const prev = useCallback(() => setIdx((p) => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length), []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [paused, next]);

  const active = TESTIMONIALS[idx];

  return (
    <section id="testimonials" aria-label="Student and counselor testimonials" className="py-24 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      <div className="absolute -top-24 right-1/4 w-96 h-96 bg-violet-300/20 dark:bg-violet-500/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <Reveal className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-sm font-bold mb-4 tracking-wide uppercase">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Loved Across Campus</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg">Real stories from MSU students and guidance specialists using CounceLink every day.</p>
        </Reveal>

        <Reveal variant="scale">
          <div
            className="relative bg-white/80 dark:bg-white/[0.05] backdrop-blur-2xl rounded-3xl border border-gray-100 dark:border-white/10 shadow-xl p-8 sm:p-12 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <Quote size={64} className="absolute top-6 left-6 text-emerald-100 dark:text-emerald-500/10" aria-hidden="true" />
            <div className="relative min-h-[190px] sm:min-h-[160px]">
              <AnimatePresence mode="wait">
                <motion.figure
                  key={idx}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex gap-1 mb-4" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} size={17} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="text-lg sm:text-xl text-gray-800 dark:text-gray-100 leading-[1.8] mb-6">
                    “{active.quote}”
                  </blockquote>
                  <figcaption className="flex items-center gap-3">
                    <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${active.color} flex items-center justify-center text-white font-extrabold text-sm shadow-md`} aria-hidden="true">
                      {active.initials}
                    </span>
                    <span>
                      <span className="block font-bold text-gray-900 dark:text-white text-sm">{active.name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{active.role}</span>
                    </span>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="flex gap-2" role="tablist" aria-label="Testimonial selector">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    aria-label={`Show testimonial ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${i === idx ? "w-8 bg-emerald-500" : "w-2 bg-gray-300 dark:bg-white/20 hover:bg-gray-400"}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={prev} aria-label="Previous testimonial" className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-gray-700 dark:text-white flex items-center justify-center transition-all hover:scale-105">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={next} aria-label="Next testimonial" className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-gray-700 dark:text-white flex items-center justify-center transition-all hover:scale-105">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
