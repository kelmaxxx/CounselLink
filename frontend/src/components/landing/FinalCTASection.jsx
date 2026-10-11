// src/components/landing/FinalCTASection.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Users } from "lucide-react";
import Reveal from "./Reveal";

function useCountdown(targetHours = 72) {
  const [target] = useState(() => Date.now() + targetHours * 3600 * 1000);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

export default function FinalCTASection() {
  const { d, h, m, s } = useCountdown(72);
  const units = [
    { v: d, l: "Days" },
    { v: h, l: "Hours" },
    { v: m, l: "Mins" },
    { v: s, l: "Secs" },
  ];

  return (
    <section aria-label="Get started with CounceLink" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-3xl mesh-hero grain p-10 sm:p-14 text-center text-white shadow-2xl border border-white/20">
            <div className="absolute -top-20 left-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-blob-drift" aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-xs font-bold uppercase tracking-wider mb-5 backdrop-blur-md">
                <Flame size={14} className="text-amber-300" aria-hidden="true" />
                Limited slots each week — book early
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                Your well-being can&apos;t wait. <span className="text-gradient-hero">Start today.</span>
              </h2>
              <p className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
                Join the growing community of MSU students, counselors, college representatives, and administrators already using the platform.
              </p>

              <div className="flex justify-center gap-3 mb-8" role="timer" aria-label="Priority booking window countdown">
                {units.map(({ v, l }) => (
                  <div key={l} className="glass rounded-2xl w-[70px] py-3">
                    <p className="text-2xl font-extrabold tabular-nums">{String(v).padStart(2, "0")}</p>
                    <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">{l}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/login" aria-label="Login now to book your session" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-emerald-900 font-bold btn-glow pulse-glow">
                  Login Now <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <button
                  onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl glass font-semibold hover:bg-white/20 transition-all"
                >
                  <Users size={18} aria-hidden="true" /> Talk to DSA
                </button>
              </div>
              <p className="mt-5 text-xs text-white/55">Free with your MSU institutional email · Confidential by design</p>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
