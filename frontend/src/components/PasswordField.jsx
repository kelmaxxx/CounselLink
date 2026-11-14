import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock } from "lucide-react";
import { INPUT } from "./ui";
import { passwordChecks } from "../utils/password";

const REQUIREMENTS = [
  { key: "length", label: "8+ chars" },
  { key: "lower", label: "a-z" },
  { key: "upper", label: "A-Z" },
  { key: "number", label: "0-9" },
  { key: "symbol", label: "symbol" },
];

const METER_COLORS = [
  "bg-gray-200",
  "bg-red-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-lime-500",
  "bg-emerald-500",
];
const METER_LABELS = ["—", "weak", "fair", "good", "strong", "strong"];

// Capitalised bindings so ESLint's no-unused-vars sees the JSX usage.
const MotionInput = motion.input;
const MotionDiv = motion.div;

// Password input with a monospace face, a smooth dots-to-letters reveal and an
// optional outlined strength meter. Policy lives in utils/password.js.
export default function PasswordField({
  value = "",
  onChange,
  name,
  placeholder = "••••••••",
  autoComplete,
  autoFocus,
  required,
  showMeter = false,
  icon = true,
  className = "",
  ...inputProps
}) {
  const [visible, setVisible] = useState(false);
  const checks = passwordChecks(value);
  const score = REQUIREMENTS.filter((r) => checks[r.key]).length;

  // A brief blur + letter-spacing glide bridges the bullet/letter glyph swap.
  const morph = useMemo(
    () => ({
      filter: ["blur(0px)", "blur(3px)", "blur(0px)"],
      letterSpacing: visible ? ["0.22em", "0.02em"] : ["0.02em", "0.12em"],
    }),
    [visible]
  );

  return (
    <div>
      <div className="relative">
        {icon && (
          <Lock
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        )}
        <MotionInput
          name={name}
          value={value}
          onChange={onChange}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          placeholder={placeholder}
          initial={false}
          animate={morph}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className={`${INPUT} font-mono tracking-wide ${icon ? "pl-9" : ""} pr-10 ${className}`}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {showMeter && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
              <MotionDiv
                className={`h-full rounded-full ${METER_COLORS[score]}`}
                initial={false}
                animate={{ width: `${(score / REQUIREMENTS.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
              />
            </div>
            <span className="w-14 text-right font-mono text-[10px] uppercase tracking-widest text-gray-500">
              {value ? METER_LABELS[score] : "—"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REQUIREMENTS.map((r) => {
              const ok = checks[r.key];
              return (
                <span
                  key={r.key}
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide transition-all duration-300 ${
                    ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-400"
                  }`}
                >
                  {r.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
