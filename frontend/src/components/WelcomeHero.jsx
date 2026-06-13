// src/components/WelcomeHero.jsx
import React, { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Fixed overlay welcome screen that slides upward when dismissed.
 * The dashboard sits behind it at its normal position the whole time.
 */
export default function WelcomeHero({ userName }) {
  const displayName = userName || "User";
  const [dismissed, setDismissed] = useState(false);
  const [hidden, setHidden] = useState(() => {
    return sessionStorage.getItem("welcomeShown") === "true";
  });

  const dismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem("welcomeShown", "true");
    // After the slide-up animation completes, remove from DOM
    setTimeout(() => setHidden(true), 700);
  }, []);

  if (hidden) return null;

  return (
    <div
      className="welcome-hero-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        transition: "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: dismissed ? "translateY(-100%)" : "translateY(0)",
        background:
          "linear-gradient(180deg, #064e1a 0%, #0B6623 30%, #0d7a2a 60%, #1a9e3f 85%, #28b84d 100%)",
      }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(255,255,255,0.10) 0%, transparent 70%)",
        }}
      />

      {/* Dot texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* CounseLink header — small, pinned to top */}
      <img
        src="/welcome-header.png"
        alt="CounseLink - Student Counseling and Well-Being Platform"
        className="absolute top-6 z-10 drop-shadow-lg"
        style={{
          width: "clamp(160px, 22vw, 260px)",
          objectFit: "contain",
        }}
      />

      {/* Content — centered in the middle */}
      <div className="relative z-10 px-6 max-w-3xl flex flex-col items-center animate-fade-in-up">
        {/* Line 1 — big welcome */}
        <h1
          className="font-extrabold tracking-tight text-white drop-shadow-lg"
          style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)", lineHeight: 1.1 }}
        >
          WELCOME,{" "}
          <span className="text-emerald-200">{displayName.toUpperCase()}</span>
        </h1>

        {/* Line 2 — tagline */}
        <p
          className="mt-3 font-semibold text-white/80 tracking-wide"
          style={{ fontSize: "clamp(1rem, 2.4vw, 1.6rem)" }}
        >
          CounseLink at your service
        </p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className="absolute bottom-8 z-10 flex flex-col items-center gap-1 text-white/60 hover:text-white transition cursor-pointer group"
        aria-label="Dismiss welcome screen"
      >
        <span className="text-xs font-medium tracking-wider uppercase">
          Enter dashboard
        </span>
        <ChevronDown
          size={22}
          className="animate-bounce-slow group-hover:translate-y-0.5 transition"
        />
      </button>
    </div>
  );
}

