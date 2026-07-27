// src/components/landing/LandingFooter.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from "lucide-react";

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
    <footer className="bg-gray-900 text-gray-300">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
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
                <span>msudsa70@gmail.com</span>
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

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleScroll(link.href)}
                    className="text-sm text-gray-400 hover:text-maroon-300 transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Portal */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2.5 mb-8">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-maroon-300 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

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
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
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
