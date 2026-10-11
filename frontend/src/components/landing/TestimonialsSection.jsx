// src/components/landing/TestimonialsSection.jsx
// Light white + MSU forest-green styling to match the rest of the landing page.
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import Reveal from "./Reveal";

const TESTIMONIALS = [
  { name: "Amina D.", role: "Psychology Student, CSSH", initials: "AD", color: "from-maroon-500 to-maroon-700", quote: "Booking a counseling session used to mean long lines at the DSA office. Now I request, reschedule, and get notified — all from my phone. It feels safe and private." },
  { name: "Mohammad K.", role: "Engineering Student, COE", initials: "MK", color: "from-maroon-400 to-maroon-600", quote: "The reminders saved me twice. My counselor approved my request within the day and I could track everything from my dashboard. Super smooth." },
  { name: "Sittie N.", role: "Education Student, CED", initials: "SN", color: "from-green-600 to-maroon-600", quote: "I love that my records are confidential and organized. The platform made it so much easier to reach out for help without the awkwardness." },
  { name: "Jalaluddin M. A.", role: "Guidance Services Specialist III", initials: "JA", color: "from-amber-500 to-maroon-600", quote: "CounceLink cut our paperwork dramatically. Approvals, session notes, and reports are all in one secure place. We serve more students with less stress." },
  { name: "Rohanna M. R.", role: "Guidance Services Specialist I", initials: "RR", color: "from-maroon-600 to-maroon-800", quote: "Real-time notifications changed everything — fewer no-shows, faster follow-ups, and students actually come prepared. Highly recommended for every college." },
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
    <section id="testimonials" aria-label="Student and counselor testimonials" className="py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-maroon-100 text-maroon-600 text-sm font-semibold mb-4 tracking-wide uppercase">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Loved Across Campus
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">
            Real stories from MSU students and guidance specialists using CounceLink every day.
          </p>
        </Reveal>

        <Reveal variant="scale">
          <div
            className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <Quote size={64} className="absolute top-6 left-6 text-maroon-100" aria-hidden="true" />
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
                  <blockquote className="text-lg sm:text-xl text-gray-800 leading-relaxed mb-6">
                    &ldquo;{active.quote}&rdquo;
                  </blockquote>
                  <figcaption className="flex items-center gap-3">
                    <span className={`w-12 h-12 rounded-xl bg-gradient-to-br ${active.color} flex items-center justify-center text-white font-extrabold text-sm shadow-md`} aria-hidden="true">
                      {active.initials}
                    </span>
                    <span>
                      <span className="block font-bold text-gray-900 text-sm">{active.name}</span>
                      <span className="block text-xs text-gray-500">{active.role}</span>
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
                    className={`h-2 rounded-full transition-all duration-300 ${i === idx ? "w-8 bg-maroon-500" : "w-2 bg-gray-300 hover:bg-gray-400"}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={prev} aria-label="Previous testimonial" className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-maroon-100 text-gray-700 hover:text-maroon-600 flex items-center justify-center transition-all">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={next} aria-label="Next testimonial" className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-maroon-100 text-gray-700 hover:text-maroon-600 flex items-center justify-center transition-all">
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
