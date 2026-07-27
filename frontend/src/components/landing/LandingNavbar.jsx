// src/components/landing/LandingNavbar.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100"
          : "bg-transparent"
        }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNavClick("#home")}
            className="flex items-center gap-2.5 focus:outline-none"
            aria-label="Go to top"
          >
            <img
              src="/counselink-round.png"
              alt="CounseLink"
              className="h-9 w-9 object-contain"
            />
            <span
              className={`font-bold text-lg tracking-tight transition-colors ${scrolled ? "text-maroon-700" : "text-white"
                }`}
            >
              CounceLink
            </span>
          </button>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <button
                  onClick={() => handleNavClick(link.href)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${scrolled
                      ? "text-gray-600 hover:text-maroon-600 hover:bg-maroon-50"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                    }`}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop Login button */}
          <div className="hidden md:flex">
            <Link
              to="/login"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${scrolled
                  ? "bg-maroon-500 text-white hover:bg-maroon-600 shadow-sm"
                  : "bg-white text-maroon-600 hover:bg-maroon-50"
                }`}
            >
              Login
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((o) => !o)}
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10"
              }`}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg rounded-b-2xl overflow-hidden">
            <ul className="py-2 px-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleNavClick(link.href)}
                    className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:text-maroon-600 hover:bg-maroon-50 transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
              <li className="pt-2 pb-1">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-lg bg-maroon-500 text-white text-sm font-semibold hover:bg-maroon-600 transition-colors"
                >
                  Login
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
