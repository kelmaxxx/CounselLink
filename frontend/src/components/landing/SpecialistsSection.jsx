// src/components/landing/SpecialistsSection.jsx
import React, { useState } from "react";
import Reveal from "./Reveal";
import { Mail, Phone, ZoomIn, X, Users } from "lucide-react";

export default function SpecialistsSection() {
  const [isZoomed, setIsZoomed] = useState(false);

  const SPECIALISTS = [
    { name: "Jalaluddin M. Alonto", role: "Guidance Services Specialist III", colleges: ["COE", "CFES"] },
    { name: "Sittie Hakima C. Sani", role: "Guidance Services Specialist II", colleges: ["CPA", "CSPEAR"] },
    { name: "Alainah R. Moctar", role: "Guidance Services Specialist I", colleges: ["CSSH", "CNSM"] },
    { name: "Ailene P. Ampog", role: "Guidance Services Specialist I", colleges: ["CHTM", "CFAS"] },
    { name: "Aleesha L. Tampi", role: "Guidance Services Specialist I", colleges: ["KFCIAAS", "CHS"] },
    { name: "Rohanna Mayza M. Ramos", role: "Guidance Services Specialist I", colleges: ["CBAA", "COA"] },
    { name: "Anisah D. Salisip", role: "Guidance Associate", colleges: ["CED", "CICS"] },
  ];

  return (
    <section id="specialists" aria-label="Guidance specialists" className="py-24 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-sm font-bold mb-4 tracking-wide uppercase">
            Meet the Specialists
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
            Guidance &amp; Counseling Section
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Get to know the dedicated guidance services specialists at MSU Marawi&apos;s Division of Student Affairs (DSA).
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <Reveal variant="left" className="lg:col-span-5 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Users className="text-emerald-600 dark:text-emerald-400" size={24} aria-hidden="true" />
                College Assignments
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
                Each guidance services specialist is assigned to specific colleges to ensure students receive focused, relevant, and accessible wellness and academic counseling.
              </p>
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
              {SPECIALISTS.map((spec) => (
                <div
                  key={spec.name}
                  className="bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl rounded-2xl p-4 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{spec.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{spec.role}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[120px]">
                    {spec.colleges.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/20">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl rounded-2xl p-5 border border-emerald-100 dark:border-emerald-500/20 shadow-sm space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Contact Division of Student Affairs</h4>
              <div className="space-y-2.5 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-gray-400" aria-hidden="true" />
                  <a href="https://mail.google.com/mail/?view=cm&fs=1&to=msudsa70@gmail.com&su=Inquiry%20via%20CounceLink" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition">msudsa70@gmail.com</a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-gray-400" aria-hidden="true" />
                  <span>0951-035-5249</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal variant="right" delay={120} className="lg:col-span-7">
            <button
              onClick={() => setIsZoomed(true)}
              className="group relative block w-full cursor-pointer rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-white/10 bg-white hover:-translate-y-1 transition duration-300 text-left"
              aria-label="View full specialists poster"
            >
              <img
                src="/guidance-specialists.jpg"
                alt="Meet Your Guidance Services Specialists"
                loading="lazy"
                className="w-full h-auto object-cover transform transition duration-500 group-hover:scale-[1.02]"
              />
              <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                <span className="px-5 py-2.5 rounded-full bg-white/95 text-gray-900 font-semibold text-sm shadow flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition duration-300">
                  <ZoomIn size={16} className="text-emerald-600" aria-hidden="true" />
                  Click to View Full Poster
                </span>
              </span>
            </button>
          </Reveal>
        </div>
      </div>

      {isZoomed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Specialists poster fullscreen">
          <div className="relative max-w-5xl w-full bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-gray-900 dark:text-white px-2">MSU Guidance Services Specialists Map</span>
              <button
                onClick={() => setIsZoomed(false)}
                className="p-1.5 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-gray-700 dark:text-white transition"
                aria-label="Close poster viewer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[80vh]">
              <img src="/guidance-specialists.jpg" alt="Meet Your Guidance Services Specialists Full View" className="w-full h-auto rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
