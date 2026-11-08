// src/components/MobileNav.jsx
// Phone-only bottom tab bar. Four role shortcuts in the thumb zone plus a
// "More" tab that opens the full navigation drawer, so nothing is lost.
import React from "react";
import { NavLink } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { getMobileNavItems } from "./navItems";
import { useMessages } from "../context/MessagesContext";

const tabBase =
  "relative h-full w-full min-w-0 flex flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-medium transition-colors";

export default function MobileNav({ currentUser, onMore }) {
  const { getTotalUnreadCount } = useMessages();
  const unreadMessages = getTotalUnreadCount?.() || 0;
  const items = getMobileNavItems(currentUser?.role);

  if (!items.length) return null;

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden shrink-0 border-t border-gray-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const badge = item.id === "messages" ? unreadMessages : 0;
          return (
            <li key={item.id} className="min-w-0">
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `${tabBase} ${isActive ? "text-maroon-700" : "text-gray-500"}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`relative inline-flex items-center justify-center h-7 min-w-[2.75rem] rounded-full transition-colors ${
                        isActive ? "bg-maroon-50" : ""
                      }`}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                      {badge > 0 && (
                        <span className="absolute -top-0.5 right-1.5 bg-red-500 text-white text-[9px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-center leading-none">{item.short || item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
        <li className="min-w-0">
          <button type="button" onClick={onMore} className={`${tabBase} text-gray-500`} aria-label="More navigation">
            <span className="inline-flex items-center justify-center h-7 min-w-[2.75rem]">
              <MoreHorizontal size={20} />
            </span>
            <span className="w-full truncate text-center leading-none">More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
