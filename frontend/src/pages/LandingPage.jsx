// src/pages/LandingPage.jsx
import React, { useEffect } from "react";
import LandingNavbar from "../components/landing/LandingNavbar";
import HeroSection from "../components/landing/HeroSection";
import AboutSection from "../components/landing/AboutSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import BenefitsSection from "../components/landing/BenefitsSection";
import SpecialistsSection from "../components/landing/SpecialistsSection";
import FAQSection from "../components/landing/FAQSection";
import ContactSection from "../components/landing/ContactSection";
import LandingFooter from "../components/landing/LandingFooter";

export default function LandingPage() {
  // Ensure page always starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen font-sans antialiased">
      {/* Fixed navigation */}
      <LandingNavbar />

      {/* Page sections */}
      <main>
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <HowItWorksSection />
        <BenefitsSection />
        <SpecialistsSection />
        <FAQSection />
        <ContactSection />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
