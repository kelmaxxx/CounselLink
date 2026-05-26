import React from "react";
import { initialsOf } from "./ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const SIZE_MAP = {
  xs: { box: "w-7 h-7", text: "text-[10px]" },
  sm: { box: "w-8 h-8", text: "text-xs" },
  md: { box: "w-10 h-10", text: "text-sm" },
  lg: { box: "w-16 h-16", text: "text-lg" },
  xl: { box: "w-20 h-20", text: "text-xl" },
  "2xl": { box: "w-24 h-24", text: "text-2xl" },
};

const FALLBACK_PALETTE = {
  student: "bg-maroon-100 text-maroon-800",
  counselor: "bg-emerald-100 text-emerald-800",
  rep: "bg-indigo-100 text-indigo-800",
  admin: "bg-slate-200 text-slate-800",
  default: "bg-gray-100 text-gray-700",
  light: "bg-white/15 text-white border border-white/20",
};

function toAbsoluteUrl(url) {
  if (!url) return null;
  if (/^(https?:|data:)/i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}

export default function Avatar({
  name = "",
  url,
  size = "md",
  theme = "default",
  className = "",
  ringClassName = "",
}) {
  const s = SIZE_MAP[size] || SIZE_MAP.md;
  const palette = FALLBACK_PALETTE[theme] || FALLBACK_PALETTE.default;
  const src = toAbsoluteUrl(url);
  const initials = initialsOf(name) || "?";

  return (
    <div
      className={`${s.box} ${ringClassName} rounded-full overflow-hidden flex-shrink-0 ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={name || "Avatar"}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement?.querySelector("[data-fallback]")?.removeAttribute("hidden");
          }}
        />
      ) : null}
      <div
        data-fallback
        hidden={Boolean(src)}
        className={`w-full h-full flex items-center justify-center font-semibold ${palette} ${s.text}`}
      >
        {initials}
      </div>
    </div>
  );
}
