// src/components/landing/LandingNavbar.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Reviews", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-gray-100"
          : "bg-transparent"
      }`}
    >
      <nav aria-label="Primary" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          <button
            onClick={() => handleNavClick("#home")}
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500 rounded-xl"
            aria-label="CounceLink — go to top"
          >
            <img
              src="/counselink-round.png"
              alt="CounceLink logo"
              className="h-9 w-9 object-contain rounded-xl shadow-md"
              loading="eager"
            />
            <span
              className={`font-bold text-lg tracking-tight transition-colors ${
                scrolled ? "text-maroon-700" : "text-white"
              }`}
            >
              CounceLink
            </span>
          </button>

          <ul className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <button
                  onClick={() => handleNavClick(link.href)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.03] ${
                    scrolled
                      ? "text-gray-600 hover:text-maroon-600 hover:bg-maroon-50"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center">
            <Link
              to="/login"
              aria-label="Login to CounceLink portal"
              className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-95 ${
                scrolled
                  ? "bg-maroon-500 text-white hover:bg-maroon-600 shadow-glow"
                  : "bg-white text-maroon-700 hover:bg-maroon-50 btn-glow"
              }`}
            >
              Login
            </Link>
          </div>

          <div className="flex md:hidden items-center">
            <button
              onClick={() => setOpen((o) => !o)}
              className={`p-2 rounded-xl transition-colors ${
                scrolled || open
                  ? "text-gray-700 hover:bg-gray-100"
                  : "text-white hover:bg-white/10"
              }`}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-white/95 backdrop-blur-xl border border-gray-100 shadow-xl rounded-2xl overflow-hidden mb-3"
            >
              <ul className="py-2 px-3">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <button
                      onClick={() => handleNavClick(link.href)}
                      className="w-full text-left px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:text-maroon-600 hover:bg-maroon-50 transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
                <li className="pt-2 pb-1">
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="block w-full text-center px-4 py-2.5 rounded-2xl bg-maroon-500 text-white text-sm font-semibold hover:bg-maroon-600 transition-colors"
                  >
                    Login
                  </Link>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
