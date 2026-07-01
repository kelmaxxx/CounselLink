import React from "react";
import {
  Mail,
  Phone,
  Hash,
  GraduationCap,
  HeartHandshake,
  Building2,
  ShieldCheck,
  Camera,
} from "lucide-react";
import Avatar from "./Avatar";

const THEMES = {
  student: {
    banner: "from-maroon-600 via-maroon-700 to-maroon-900",
    icon: GraduationCap,
    badgeBg: "bg-maroon-50 text-maroon-800 border-maroon-200",
    avatarRing: "ring-maroon-100",
    label: "Student",
    paletteKey: "student",
  },
  counselor: {
    banner: "from-teal-600 via-emerald-700 to-emerald-900",
    icon: HeartHandshake,
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    avatarRing: "ring-emerald-100",
    label: "DSA Counselor",
    paletteKey: "counselor",
  },
  rep: {
    banner: "from-indigo-600 via-blue-700 to-blue-900",
    icon: Building2,
    badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200",
    avatarRing: "ring-indigo-100",
    label: "College",
    paletteKey: "rep",
  },
  admin: {
    banner: "from-slate-700 via-slate-800 to-zinc-900",
    icon: ShieldCheck,
    badgeBg: "bg-slate-100 text-slate-800 border-slate-300",
    avatarRing: "ring-slate-200",
    label: "System Administrator",
    paletteKey: "admin",
  },
};

export default function ProfileHero({
  theme = "student",
  name,
  subtitle,
  email,
  phone,
  identifier,
  identifierIcon: IdentifierIcon = Hash,
  chips = [],
  avatarUrl,
  onChangePhoto,
  uploading = false,
  topRightSlot,
}) {
  const t = THEMES[theme] || THEMES.student;
  const RoleIcon = t.icon;

  return (
    <div className="relative bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden mb-6 shadow-sm">
      <div className={`relative h-28 bg-gradient-to-br ${t.banner} overflow-hidden`}>
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, white 0, transparent 35%), radial-gradient(circle at 85% 75%, white 0, transparent 35%)",
          }}
        />
        <div className="absolute top-3 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-medium text-white backdrop-blur-sm">
          <RoleIcon size={13} />
          {t.label}
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 relative">
        {topRightSlot && <div className="absolute top-3 right-5">{topRightSlot}</div>}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="relative flex-shrink-0 -mt-14">
            <Avatar
              name={name}
              url={avatarUrl}
              size="xl"
              theme={t.paletteKey}
              ringClassName={`ring-4 ${t.avatarRing} bg-white shadow-sm`}
            />
            {onChangePhoto && (
              <label
                className={`absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gray-900/85 hover:bg-gray-900 text-white flex items-center justify-center cursor-pointer border-2 border-white shadow-sm transition ${
                  uploading ? "opacity-60 cursor-wait" : ""
                }`}
                title="Change photo"
              >
                <Camera size={13} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onChangePhoto(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-semibold text-gray-900 truncate leading-snug pb-0.5">
              {name || "—"}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-600 truncate mt-0.5 leading-snug">{subtitle}</p>
            )}
            {chips.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                {chips.map((c) => (
                  <span
                    key={c.label}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${t.badgeBg}`}
                  >
                    {c.icon ? <c.icon size={11} /> : null}
                    {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-600 border-t border-gray-100 pt-3">
          <span className="inline-flex items-center gap-1.5">
            <Mail size={12} className="text-gray-400" />
            {email || "—"}
          </span>
          {phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone size={12} className="text-gray-400" />
              {phone}
            </span>
          )}
          {identifier && (
            <span className="inline-flex items-center gap-1.5">
              <IdentifierIcon size={12} className="text-gray-400" />
              {identifier}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
