// src/components/landing/HeroSection.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, ChevronLeft, ChevronRight, Sparkles, ShieldCheck, Bell } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const DEFAULT_CAROUSEL_IMAGES = [
  { src: "/carousel/media__1785766737811.jpg", title: "College of Health Sciences", category: "Campus Visitation" },
  { src: "/carousel/media__1785766738014.jpg", title: "College of Sports, Physical Education, and Recreation", category: "Campus Visitation" },
  { src: "/carousel/media__1785766738147.jpg", title: "College of Natural Sciences & Mathematics", category: "Campus Visitation" },
  { src: "/carousel/media__1785766738228.jpg", title: "College of Fisheries & Aquatic Sciences", category: "Campus Visitation" },
  { src: "/carousel/media__1785766738249.jpg", title: "College of Education", category: "Campus Visitation" },
  { src: "/carousel/media__1785767846829.jpg", title: "College of Hospitality & Tourism Management", category: "Campus Visitation" },
  { src: "/carousel/media__1785767847016.jpg", title: "College of Engineering", category: "Campus Visitation" },
  { src: "/carousel/media__1785767847113.jpg", title: "College of Agriculture", category: "Campus Visitation" },
  { src: "/carousel/media__1785767847190.jpg", title: "College of Information & Computing Sciences", category: "Campus Visitation" },
  { src: "/carousel/media__1785767847251.jpg", title: "College of Forestry and Environmental Studies", category: "Campus Visitation" },
  { src: "/carousel/media__1785769607872.jpg", title: "College of Social Sciences and Humanities", category: "Campus Visitation" },
  { src: "/carousel/media__1785769607769.jpg", title: "College of Public affairs", category: "Campus Visitation" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] } }),
};

export default function HeroSection() {
  const [stats, setStats] = useState({ studentsCount: 0, counselorsCount: 0, appointmentsCount: 0 });
  const [displayStats, setDisplayStats] = useState({ studentsCount: 0, counselorsCount: 0, appointmentsCount: 0 });
  const [slides, setSlides] = useState(DEFAULT_CAROUSEL_IMAGES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
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

    fetch(`${API_BASE}/api/announcements/public`)
      .then((res) => (res.ok ? res.json() : []))
      .then((announcements) => {
        if (Array.isArray(announcements) && announcements.length > 0) {
          const dynamicSlides = announcements
            .filter((a) => a.imageUrl)
            .map((a) => {
              const fullUrl = a.imageUrl.startsWith("http") ? a.imageUrl : `${API_BASE}${a.imageUrl}`;
              const firstLine = a.content ? a.content.split("\n")[0] : "Admin Announcement";
              return {
                src: fullUrl,
                title: firstLine.length > 45 ? firstLine.substring(0, 45) + "..." : firstLine,
                category: "Admin Announcement",
              };
            });
          if (dynamicSlides.length > 0) {
            setSlides((prev) => {
              const existingSrcs = new Set(dynamicSlides.map((s) => s.src));
              const filteredPrev = prev.filter((s) => !existingSrcs.has(s.src));
              return [...dynamicSlides, ...filteredPrev];
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const interval = setInterval(() => setCurrentSlide((prev) => (prev + 1) % slides.length), 4000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplayStats(stats);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayStats({
        studentsCount: Math.round(stats.studentsCount * eased),
        counselorsCount: Math.round(stats.counselorsCount * eased),
        appointmentsCount: Math.round(stats.appointmentsCount * eased),
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stats]);

  const statItems = [
    { label: "Students Served", value: displayStats.studentsCount.toLocaleString() },
    { label: "Counselors", value: displayStats.counselorsCount.toLocaleString() },
    { label: "Appointments Booked", value: displayStats.appointmentsCount.toLocaleString() },
  ];

  return (
    <section id="home" aria-label="CounceLink hero" className="relative min-h-screen flex items-center overflow-hidden grain">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 mesh-hero dark:opacity-95" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 dark:to-black/60" aria-hidden="true" />

      {/* Moving blobs */}
      <div className="absolute -top-32 -right-32 w-[34rem] h-[34rem] bg-white/10 rounded-full blur-3xl animate-blob-drift" aria-hidden="true" />
      <div className="absolute bottom-0 -left-24 w-[28rem] h-[28rem] bg-maroon-900/40 rounded-full blur-3xl animate-blob-drift" style={{ animationDelay: "2s" }} aria-hidden="true" />
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-maroon-300/20 rounded-full blur-2xl animate-blob-drift" style={{ animationDelay: "4s" }} aria-hidden="true" />

      {/* Grain dot overlay */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        aria-hidden="true"
        style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 pt-32 pb-28 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — text */}
          <div className="text-white">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-2xl glass text-sm font-medium">
              <Sparkles size={15} className="text-amber-200" aria-hidden="true" />
              <span>Guidance Counseling Made Digital</span>
              <span className="hidden sm:inline-flex ml-1 px-2 py-0.5 rounded-full bg-maroon-300/20 border border-white/20 text-[11px] font-bold tracking-wide">MSU MARAWI</span>
            </motion.div>

            <motion.h1
              variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="text-4xl sm:text-5xl lg:text-[4.2rem] font-extrabold leading-[1.05] tracking-tight mb-6"
            >
              Guiding Students Towards{" "}
              <span className="text-gradient-hero">Academic</span> and{" "}
              <span className="text-gradient-hero">Personal</span> Success.
            </motion.h1>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="text-lg sm:text-xl text-white/85 leading-[1.9] mb-10 max-w-xl"
            >
              CounceLink simplifies appointment scheduling, counseling record
              management, and communication between students and counselors at
              Mindanao State University – Marawi City.
            </motion.p>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
              className="flex flex-wrap items-center gap-4">
              <Link
                to="/login"
                aria-label="Login to CounceLink portal"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-maroon-800 font-bold text-base btn-glow pulse-glow"
              >
                Login to Portal
                <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <button
                onClick={() => document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl glass text-white font-semibold hover:bg-white/20 transition-all hover:scale-[1.02]"
                aria-label="Explore features"
              >
                <CalendarCheck size={18} aria-hidden="true" />
                Explore Features
              </button>
            </motion.div>

            {/* Trust row */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-white/70 text-sm">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-maroon-300" /> Confidential &amp; secure</span>
              <span className="inline-flex items-center gap-1.5"><Bell size={15} className="text-green-200" /> Real-time notifications</span>
            </motion.div>

            {/* Stats row */}
            <motion.dl variants={fadeUp} initial="hidden" animate="visible" custom={5}
              className="mt-8 flex flex-wrap gap-8 glass rounded-2xl px-6 py-5 w-fit">
              {statItems.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="text-2xl font-extrabold text-white tabular-nums">{stat.value}</dd>
                  <dd className="text-xs text-white/65 mt-0.5 font-medium">{stat.label}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Right — MacBook + iPhone mockup with live carousel */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:flex justify-center items-center"
          >
            <div className="relative animate-float-soft">
              <div className="absolute inset-0 rounded-[2rem] bg-white/10 blur-3xl scale-110" aria-hidden="true" />

              {/* MacBook frame */}
              <div className="relative z-10 w-[440px] rounded-2xl glass p-3 shadow-2xl border border-white/25" role="img" aria-label="CounceLink app preview showing campus carousel">
                <div className="flex items-center gap-1.5 px-2 pb-2.5" aria-hidden="true">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/90" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-300/90" />
                  <span className="w-2.5 h-2.5 rounded-full bg-maroon-400/90" />
                  <span className="ml-3 flex-1 h-6 rounded-lg bg-white/10 border border-white/10 text-[10px] text-white/60 flex items-center px-3 font-mono">councelink.msu.edu.ph/dashboard</span>
                </div>
                <div
                  className="relative w-full h-[380px] rounded-xl overflow-hidden bg-maroon-900/50"
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                >
                  {slides.map((slide, idx) => (
                    <div key={idx} className={`absolute inset-0 transition-opacity duration-500 ${idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
                      {slide.category !== "Campus Visitation" && (
                        <div className="absolute inset-0 bg-cover bg-center blur-lg opacity-40 scale-110" style={{ backgroundImage: `url(${slide.src})` }} aria-hidden="true" />
                      )}
                      <img
                        src={slide.src}
                        alt={slide.title}
                        loading={idx === 0 ? "eager" : "lazy"}
                        className={`w-full h-full relative z-10 ${slide.category === "Campus Visitation" ? "object-cover" : "object-contain bg-black/30"}`}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12 z-20">
                        <span className="inline-block px-2 py-0.5 mb-1 text-[10px] uppercase tracking-wider font-semibold rounded-lg bg-maroon-500/90 text-white border border-white/20">
                          {slide.category}
                        </span>
                        <p className="text-sm font-semibold text-white truncate drop-shadow">{slide.title}</p>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setCurrentSlide((p) => (p - 1 + slides.length) % slides.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                    aria-label="Previous slide">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setCurrentSlide((p) => (p + 1) % slides.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                    aria-label="Next slide">
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-2 inset-x-0 z-20 flex justify-center items-center gap-1.5" role="tablist" aria-label="Carousel slides">
                    {slides.slice(0, 12).map((_, idx) => (
                      <button key={idx} onClick={() => setCurrentSlide(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
                        aria-label={`Go to slide ${idx + 1}`} />
                    ))}
                  </div>
                </div>
                <div className="mx-auto mt-2 h-1.5 w-24 rounded-full bg-white/20" aria-hidden="true" />
              </div>

              {/* iPhone frame */}
              <div className="absolute -right-14 -bottom-8 z-20 w-[130px] rounded-[1.8rem] bg-gray-950 border border-white/25 p-1.5 shadow-2xl" aria-hidden="true">
                <div className="rounded-[1.4rem] overflow-hidden bg-gradient-to-b from-maroon-800 to-maroon-950 p-2.5 h-[250px] flex flex-col">
                  <div className="mx-auto w-12 h-1 rounded-full bg-white/30 mb-2" />
                  <p className="text-[9px] font-bold text-white">Today</p>
                  <p className="text-[8px] text-maroon-200 mb-2">2 sessions</p>
                  {[["10:00 AM", "Academic"], ["2:30 PM", "Wellness"]].map(([t, k]) => (
                    <div key={t} className="rounded-xl bg-white/95 p-1.5 mb-1.5">
                      <p className="text-[8px] font-bold text-gray-800">{t}</p>
                      <p className="text-[7px] text-maroon-600 font-semibold">{k}</p>
                    </div>
                  ))}
                  <div className="mt-auto rounded-xl bg-maroon-400 p-1.5 text-center text-[8px] font-bold text-maroon-950">Book Session</div>
                </div>
              </div>

              {/* Floating cards */}
              <div className="absolute -top-5 -left-8 z-20 bg-white dark:bg-gray-900 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 animate-float-soft border border-gray-100 dark:border-white/10">
                <div className="w-9 h-9 rounded-xl bg-maroon-100 dark:bg-maroon-500/20 flex items-center justify-center">
                  <CalendarCheck size={18} className="text-maroon-500 dark:text-maroon-300" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white">Appointment Approved</p>
                  <p className="text-xs text-gray-400">Just now</p>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-4 z-20 bg-white dark:bg-gray-900 rounded-2xl shadow-xl px-4 py-3 animate-float-soft border border-gray-100 dark:border-white/10" style={{ animationDelay: "1.2s" }}>
                <p className="text-xs font-semibold text-gray-800 dark:text-white">🔔 Session Reminder</p>
                <p className="text-xs text-gray-400 mt-0.5">Tomorrow, 10:00 AM</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile carousel (below text) */}
        <div className="lg:hidden mt-12 rounded-2xl glass p-3 border border-white/20">
          <div className="relative w-full h-64 rounded-xl overflow-hidden">
            {slides.slice(0, 6).map((slide, idx) => (
              <img key={idx} src={slide.src} alt={slide.title} loading="lazy"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${idx === currentSlide % 6 ? "opacity-100" : "opacity-0"}`} />
            ))}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
              <p className="text-xs font-semibold text-white truncate">{slides[currentSlide]?.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 inset-x-0" aria-hidden="true">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-14 text-gray-50 dark:text-gray-950">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="currentColor" />
        </svg>
      </div>
    </section>
  );
}
