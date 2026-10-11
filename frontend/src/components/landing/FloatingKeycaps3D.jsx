// src/components/landing/FloatingKeycaps3D.jsx
import React from "react";
import { motion } from "framer-motion";
import { Heart, ShieldCheck, Calendar, GraduationCap } from "lucide-react";

/**
 * FloatingKeycaps3D — decorative Google Play style 3D keycaps.
 * Fanned arc layout: each cap faces a slightly different direction
 * (like the reference), no labels, no filtering — purely visual.
 */
export function FloatingKeycaps3D() {
  const keycaps = [
    {
      id: "wellness",
      icon: Heart,
      bgTop: "from-pink-400 via-rose-500 to-rose-600",
      bgSide: "bg-rose-700",
      dishColor: "from-pink-300 to-rose-400",
      // Fan pose: far-left cap turned left, tipped back, sitting lower
      rotateX: 14,
      rotateY: -28,
      rotateZ: -7,
      yOffset: 10,
    },
    {
      id: "security",
      icon: ShieldCheck,
      bgTop: "from-sky-400 via-blue-500 to-blue-600",
      bgSide: "bg-blue-700",
      dishColor: "from-sky-300 to-blue-400",
      // Mid-left: slight left turn
      rotateX: 10,
      rotateY: -10,
      rotateZ: -2,
      yOffset: 0,
    },
    {
      id: "appointments",
      icon: Calendar,
      bgTop: "from-amber-300 via-amber-400 to-amber-500",
      bgSide: "bg-amber-600",
      dishColor: "from-amber-200 to-amber-300",
      // Mid-right: slight right turn
      rotateX: 10,
      rotateY: 12,
      rotateZ: 3,
      yOffset: 0,
    },
    {
      id: "academics",
      icon: GraduationCap,
      bgTop: "from-emerald-400 via-emerald-500 to-emerald-600",
      bgSide: "bg-emerald-700",
      dishColor: "from-emerald-300 to-emerald-400",
      // Far-right cap turned right, tipped back, sitting lower
      rotateX: 14,
      rotateY: 28,
      rotateZ: 7,
      yOffset: 10,
    },
  ];

  return (
    <div
      className="relative pt-6 pb-4 flex flex-col items-center justify-center select-none"
      aria-hidden="true"
    >
      {/* FLOATING 3D DIAMOND STAR SPARKLES */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 45, 0], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[12%] top-2 text-amber-200/80 drop-shadow-md"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, -45, 0], scale: [1, 0.85, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute right-[14%] top-4 text-amber-200/80 drop-shadow-md"
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </motion.div>

        <motion.div
          animate={{ y: [0, -6, 0], rotate: [0, 90, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute left-[24%] bottom-3 text-emerald-200/80 drop-shadow"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </motion.div>
      </div>

      {/* FANNED ROW OF 4 KEYCAPS — arc, each facing its own direction */}
      <div
        className="flex items-start justify-center gap-3 sm:gap-5 md:gap-7 relative z-10"
        style={{ perspective: 1200 }}
      >
        {keycaps.map((key, idx) => {
          const Icon = key.icon;

          return (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="flex flex-col items-center"
              style={{ marginTop: key.yOffset }}
            >
              <motion.div
                animate={{
                  y: [0, idx % 2 === 0 ? -6 : 6, 0],
                  rotateX: [key.rotateX, key.rotateX - 3, key.rotateX],
                  rotateY: [key.rotateY, key.rotateY + (idx < 2 ? 4 : -4), key.rotateY],
                }}
                transition={{
                  duration: 3.5 + idx * 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: idx * 0.3,
                }}
                className="relative w-14 h-16 sm:w-16 sm:h-[4.5rem] md:w-20 md:h-24 rounded-2xl drop-shadow-xl"
                style={{
                  transformStyle: "preserve-3d",
                  transform: `rotateX(${key.rotateX}deg) rotateY(${key.rotateY}deg) rotateZ(${key.rotateZ}deg)`,
                }}
              >
                {/* 3D Bottom Chassis (extruded base) */}
                <div
                  className={`absolute inset-x-0 bottom-0 h-4 sm:h-5 rounded-b-2xl ${key.bgSide} shadow-xl`}
                />

                {/* 3D Main Keycap Body */}
                <div
                  className={`absolute inset-x-0 top-0 bottom-2.5 sm:bottom-3 rounded-2xl bg-gradient-to-b ${key.bgTop} border-t border-white/60 p-1.5 flex flex-col items-center justify-center shadow-inner`}
                >
                  {/* Concave dish */}
                  <div
                    className={`w-full h-full rounded-xl bg-gradient-to-b ${key.dishColor} flex items-center justify-center border-t border-white/80 shadow-inner`}
                  >
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                  </div>
                  {/* Specular glint */}
                  <div className="absolute top-1 left-2 right-2 h-1 bg-white/40 rounded-full blur-[0.5px]" />
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default FloatingKeycaps3D;
