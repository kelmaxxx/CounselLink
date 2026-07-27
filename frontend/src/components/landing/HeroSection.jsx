// src/components/landing/HeroSection.jsx
import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function HeroSection() {
  const [stats, setStats] = React.useState({
    studentsCount: 0,
    counselorsCount: 0,
    appointmentsCount: 0,
  });

  React.useEffect(() => {
    fetch(`${API_BASE}/api/auth/public-stats`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        setStats({
          studentsCount: data.studentsCount ?? 0,
          counselorsCount: data.counselorsCount ?? 0,
          appointmentsCount: data.appointmentsCount ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  const handleGetStarted = () => {
    const el = document.querySelector("#features");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const statItems = [
    { label: "Students Served", value: stats.studentsCount.toLocaleString() },
    { label: "Counselors", value: stats.counselorsCount.toLocaleString() },
    { label: "Appointments Booked", value: stats.appointmentsCount.toLocaleString() },
  ];

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-maroon-700 via-maroon-600 to-maroon-500" />

      {/* Decorative blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -left-24 w-80 h-80 bg-maroon-900/30 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/4 w-56 h-56 bg-white/5 rounded-full blur-2xl" />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 pt-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — text */}
          <div className="animate-fade-in-up text-white">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-white/15 border border-white/20 text-sm font-medium backdrop-blur-sm">
              <CalendarCheck size={14} className="text-green-300" />
              <span>Guidance Counseling Made Digital</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
              Guiding Students Towards{" "}
              <span className="text-green-300">Academic</span> and{" "}
              <span className="text-green-300">Personal</span> Success.
            </h1>

            <p className="text-lg sm:text-xl text-white/80 leading-relaxed mb-10 max-w-xl">
              CounceLink simplifies appointment scheduling, counseling record
              management, and communication between students and counselors at
              Mindanao State University – Marawi City.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-maroon-600 font-semibold text-base hover:bg-maroon-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Get Started
                <ArrowRight size={18} />
              </button>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-transparent border-2 border-white/50 text-white font-semibold text-base hover:border-white hover:bg-white/10 transition-all duration-200"
              >
                Login to Portal
              </Link>
            </div>

            {/* Stats row */}
            <div className="mt-14 flex flex-wrap gap-8">
              {statItems.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-white/60 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — illustration */}
          <div
            className="hidden lg:flex justify-center items-center animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="relative">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl scale-110" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 shadow-2xl">
                <img
                  src="/counselink-round.png"
                  alt="CounceLink — Guidance Counseling System"
                  className="w-64 h-64 object-contain drop-shadow-xl"
                />

                {/* Floating card: appointment */}
                <div className="absolute -top-4 -left-6 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 animate-bounce-slow">
                  <div className="w-9 h-9 rounded-xl bg-maroon-50 flex items-center justify-center">
                    <CalendarCheck size={18} className="text-maroon-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Appointment Approved</p>
                    <p className="text-xs text-gray-400">Just now</p>
                  </div>
                </div>

                {/* Floating card: notification */}
                <div
                  className="absolute -bottom-4 -right-6 bg-white rounded-2xl shadow-xl px-4 py-3 animate-bounce-slow"
                  style={{ animationDelay: "1s" }}
                >
                  <p className="text-xs font-semibold text-gray-800">🔔 Session Reminder</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tomorrow, 10:00 AM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 inset-x-0">
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-16 text-gray-50"
        >
          <path
            d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}
