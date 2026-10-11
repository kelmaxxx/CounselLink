// src/components/landing/LandingFooter.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const QUICK_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
];

export default function LandingFooter() {
  const year = new Date().getFullYear();

  const handleScroll = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="relative overflow-hidden bg-[#0b0b0c] text-gray-300">
      {/* Giant watermark wordmark (right side, cropped) */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute inset-x-0 bottom-0 flex justify-end overflow-hidden"
      >
        <p className="text-right font-black leading-[0.82] tracking-tight text-white/[0.07] text-[26vw] lg:text-[12.5rem] pr-2 sm:pr-6 translate-y-[16%] whitespace-nowrap">
          Counce
          <br />
          Link
        </p>
      </div>

      {/* Main footer content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="/counselink-round.png"
                alt="CounceLink"
                className="h-10 w-10 object-contain"
              />
              <span className="text-white font-bold text-xl tracking-tight">
                CounceLink
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-6">
              A Web-Based Guidance Counseling Scheduling and Records System for
              the Division of Student Affairs of Mindanao State University –
              Marawi City.
            </p>

            {/* Contact mini-list */}
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-gray-400">
                <Mail size={14} className="text-maroon-400 shrink-0" />
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=msudsa70@gmail.com&su=Inquiry%20via%20CounceLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Compose in Gmail to msudsa70@gmail.com"
                  className="hover:text-maroon-300 transition-colors"
                >
                  msudsa70@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Phone size={14} className="text-maroon-400 shrink-0" />
                <span>0948-509-4731</span>
              </li>
              <li className="flex items-start gap-2 text-gray-400">
                <MapPin size={14} className="text-maroon-400 shrink-0 mt-0.5" />
                <span>Mindanao State University – Marawi City, Lanao del Sur</span>
              </li>
            </ul>
          </div>

          {/* Portal access */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Portal Access
            </h4>
            <Link
              to="/login"
              className="inline-block px-5 py-2.5 rounded-xl bg-maroon-500 text-white text-sm font-semibold hover:bg-maroon-400 transition-colors"
            >
              Login to CounceLink →
            </Link>
          </div>
        </div>

        {/* Inline link row (left) — like the reference's Google row */}
        <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-2 font-bold text-white">
            <img src="/counselink-round.png" alt="" className="h-5 w-5 object-contain" />
            CounceLink
          </span>
          {QUICK_LINKS.slice(1, 4).map((link) => (
            <button
              key={link.href}
              onClick={() => handleScroll(link.href)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {link.label}
            </button>
          ))}
          {LEGAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => handleScroll("#faq")}
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-500 text-[10px] font-bold">
              ?
            </span>
            Help
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 text-center sm:text-left">
            © {year} CounceLink — Division of Student Affairs, Mindanao State
            University – Marawi City. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span>Built with</span>
            <span className="text-maroon-400">♥</span>
            <span>for MSU students</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
