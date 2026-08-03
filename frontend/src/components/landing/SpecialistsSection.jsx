// src/components/landing/SpecialistsSection.jsx
import React, { useState } from "react";
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
    <section id="specialists" className="py-24 bg-gray-50 border-t border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-maroon-100 text-maroon-600 text-sm font-semibold mb-4 tracking-wide uppercase">
            Meet the Specialists
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Guidance &amp; Counseling Section
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Get to know the dedicated guidance services specialists at MSU Marawi's Division of Student Affairs (DSA).
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left - Information & Assignments */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="text-maroon-600" size={24} />
                College Assignments
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                Each guidance services specialist is assigned to specific colleges to ensure students receive focused, relevant, and accessible wellness and academic counseling.
              </p>
            </div>

            {/* List of Specialists & Assigned Colleges */}
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
              {SPECIALISTS.map((spec) => (
                <div 
                  key={spec.name} 
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow transition-shadow flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-800 text-sm">{spec.name}</h4>
                    <p className="text-xs text-gray-500">{spec.role}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[120px]">
                    {spec.colleges.map((c) => (
                      <span 
                        key={c} 
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-maroon-50 text-maroon-700 border border-maroon-100"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Contact details */}
            <div className="bg-white rounded-2xl p-5 border border-maroon-100 shadow-sm space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-maroon-700">Contact Division of Student Affairs</h4>
              <div className="space-y-2.5 text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-gray-400" />
                  <a href="mailto:msudsa70@gmail.com" className="hover:text-maroon-600 transition">msudsa70@gmail.com</a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-gray-400" />
                  <span>0951-035-5249</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Image Showcase with click to zoom */}
          <div className="lg:col-span-7">
            <div 
              onClick={() => setIsZoomed(true)}
              className="group relative cursor-pointer rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-white hover:-translate-y-1 transition duration-300"
            >
              <img 
                src="/guidance-specialists.jpg" 
                alt="Meet Your Guidance Services Specialists" 
                className="w-full h-auto object-cover transform transition duration-500 group-hover:scale-[1.02]"
              />
              {/* Overlay with magnifying glass */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300 backdrop-blur-[2px]">
                <div className="px-5 py-2.5 rounded-full bg-white/95 text-gray-900 font-semibold text-sm shadow flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition duration-300">
                  <ZoomIn size={16} className="text-maroon-600" />
                  Click to View Full Poster
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      {isZoomed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative max-w-5xl w-full bg-white rounded-3xl p-4 shadow-2xl overflow-hidden">
            {/* Modal header with close button */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-gray-900 px-2">MSU Guidance Services Specialists Map</span>
              <button 
                onClick={() => setIsZoomed(false)}
                className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[80vh]">
              <img 
                src="/guidance-specialists.jpg" 
                alt="Meet Your Guidance Services Specialists Full View" 
                className="w-full h-auto rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
