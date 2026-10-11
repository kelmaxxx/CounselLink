// src/components/landing/PricingSection.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Reveal from "./Reveal";

const TIERS = [
  {
    name: "Student Access",
    tagline: "For MSU students",
    price: "Free",
    period: "with MSU email",
    cta: "Request Appointment",
    features: ["Book / reschedule / cancel online", "Real-time notifications", "Appointment history & summaries", "Confidential & secure records", "Any device access"],
  },
  {
    name: "Counselor Suite",
    tagline: "For guidance specialists",
    price: "Included",
    period: "DSA-authorized",
    cta: "Login to Portal",
    popular: true,
    features: ["Counselor dashboard & schedule", "Approve / reschedule / decline", "Secure session notes & forms", "Student case history", "Reports & analytics"],
  },
  {
    name: "Institution Insights",
    tagline: "For colleges & admins",
    price: "Included",
    period: "role-based access",
    cta: "Contact DSA",
    features: ["College-level statistics", "System-wide evaluation analytics", "Audit logs & user management", "Announcements & settings", "Data-driven welfare insights"],
  },
];

const CONFETTI_COLORS = ["#34d399", "#22d3ee", "#a78bfa", "#fbbf24", "#fb7185", "#60a5fa"];

function TiltCard({ tier, i }) {
  const [confetti, setConfetti] = useState([]);
  const triggerConfetti = () => {
    if (!tier.popular) return;
    const pieces = Array.from({ length: 24 }).map((_, k) => ({
      id: `${Date.now()}-${k}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      color: CONFETTI_COLORS[k % CONFETTI_COLORS.length],
      rotate: Math.random() * 360,
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 1800);
  };

  const handleTilt = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const rx = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
    const ry = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-8px)`;
  };
  const resetTilt = (e) => { e.currentTarget.style.transform = ""; };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleTilt}
      onMouseLeave={resetTilt}
      onMouseEnter={triggerConfetti}
      className={`tilt-card relative rounded-2xl p-8 overflow-hidden backdrop-blur-xl border ${
        tier.popular
          ? "popular-glow bg-gray-950 text-white border-transparent shadow-glow-lg scale-[1.02]"
          : "bg-white/80 dark:bg-white/[0.05] border-gray-100 dark:border-white/10 text-gray-900 dark:text-white shadow-lg"
      }`}
    >
      {confetti.map((c) => (
        <span key={c.id} className="confetti-piece" style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, transform: `rotate(${c.rotate}deg)` }} aria-hidden="true" />
      ))}
      {tier.popular && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-emerald-950 text-[11px] font-extrabold uppercase tracking-wider mb-4">
          <Sparkles size={12} aria-hidden="true" /> Most Popular
        </span>
      )}
      <h3 className="text-xl font-extrabold mb-1">{tier.name}</h3>
      <p className={`text-sm mb-5 ${tier.popular ? "text-white/60" : "text-gray-500 dark:text-gray-400"}`}>{tier.tagline}</p>
      <p className="mb-1"><span className="text-4xl font-extrabold tracking-tight">{tier.price}</span></p>
      <p className={`text-xs mb-6 font-medium ${tier.popular ? "text-emerald-300" : "text-gray-400"}`}>{tier.period}</p>
      <ul className="space-y-3 mb-8">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${tier.popular ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"}`}>
              <Check size={13} aria-hidden="true" />
            </span>
            <span className={tier.popular ? "text-white/85" : "text-gray-600 dark:text-gray-300"}>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/login"
        aria-label={`${tier.cta} — ${tier.name}`}
        className={`block text-center px-5 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-[1.03] active:scale-95 ${
          tier.popular ? "bg-white text-emerald-900 btn-glow" : "bg-emerald-600 text-white hover:bg-emerald-500"
        }`}
      >
        {tier.cta}
      </Link>
    </motion.div>
  );
}

export default function PricingSection() {
  return (
    <section id="pricing" aria-label="Access tiers" className="py-24 bg-white dark:bg-gray-950 relative overflow-hidden">
      <div className="absolute top-1/3 -left-24 w-96 h-96 bg-emerald-200/40 dark:bg-emerald-500/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <Reveal className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-sm font-bold mb-4 tracking-wide uppercase">Access</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Free for the Whole Campus</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">No fees, no tiers to unlock — every MSU-Marawi role gets exactly what it needs. Hover the highlighted card for a surprise.</p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {TIERS.map((tier, i) => (
            <TiltCard key={tier.name} tier={tier} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
