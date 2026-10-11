// src/pages/LandingPage.jsx
import React, { useEffect, useState } from "react";
import LandingNavbar from "../components/landing/LandingNavbar";
import HeroSection from "../components/landing/HeroSection";
import AboutSection from "../components/landing/AboutSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import BenefitsSection from "../components/landing/BenefitsSection";
import TestimonialsSection from "../components/landing/TestimonialsSection";
import PricingSection from "../components/landing/PricingSection";
import FinalCTASection from "../components/landing/FinalCTASection";
import SpecialistsSection from "../components/landing/SpecialistsSection";
import FAQSection from "../components/landing/FAQSection";
import ContactSection from "../components/landing/ContactSection";
import LandingFooter from "../components/landing/LandingFooter";

export default function LandingPage() {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("councelink-theme");
      if (saved) return saved === "dark";
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("councelink-theme", dark ? "dark" : "light");
    } catch { /* ignore */ }
  }, [dark]);

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors ${dark ? "dark bg-gray-950" : "bg-white"}`}>
      <LandingNavbar dark={dark} onToggleDark={() => setDark((d) => !d)} />
      <main>
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <HowItWorksSection />
        <BenefitsSection />
        <TestimonialsSection />
        <PricingSection />
        <FinalCTASection />
        <SpecialistsSection />
        <FAQSection />
        <ContactSection />
      </main>
      <LandingFooter />
    </div>
  );
}
