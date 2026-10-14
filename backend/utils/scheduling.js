// Single source of truth for schedule validation (Asia/Manila).
//
// NEVER trust the device clock: a user can set their laptop to any date
// and time to bypass "past / night / weekend" rules enforced in the UI.
// Every create / accept / reschedule path (appointments + tests) validates
// the requested date + time block against SERVER time here.
export const MANILA_TZ = "Asia/Manila";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const hourFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: MANILA_TZ,
  hour: "2-digit",
  hourCycle: "h23",
});
const minuteFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: MANILA_TZ,
  minute: "2-digit",
  hourCycle: "h23",
});

// Manila wall-clock "today" as YYYY-MM-DD. Uses Intl, so it is correct no
// matter what timezone the server itself runs in (unlike toISOString,
// which is UTC and shifts the date during 12am–8am Manila time).
export function manilaTodayStr(now = new Date()) {
  return dateFmt.format(now);
}

export function manilaHour(now = new Date()) {
  return Number(hourFmt.format(now));
}

export function manilaMinute(now = new Date()) {
  return Number(minuteFmt.format(now));
}

// Accepts "YYYY-MM-DD" or full ISO timestamps; returns "YYYY-MM-DD" or null.
export function normalizeDateStr(value) {
  if (!value) return null;
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return value;
}

// Weekday 0 (Sun) – 6 (Sat) for a YYYY-MM-DD string. Built from calendar
// parts (no UTC conversion), so it can never shift a day.
export function weekdayOf(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return NaN;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
}

export function isWeekendDateStr(value) {
  const d = weekdayOf(normalizeDateStr(value));
  return d === 0 || d === 6;
}

// End hour of a time block (the hour the block is over). Mirrors the
// two-block system + legacy hourly slots used across the app.
export function slotEndHour(slot) {
  if (!slot) return null;
  const s = String(slot).trim().toLowerCase();
  if (s === "morning" || s === "9:00-12:00") return 12;
  if (s === "9:00-10:00") return 10;
  if (s === "10:00-11:00") return 11;
  if (s === "11:00-12:00") return 12;
  if (s === "afternoon" || s === "1:00-5:00") return 17;
  if (s === "1:00-2:00") return 14;
  if (s === "2:00-3:00") return 15;
  if (s === "3:00-4:00") return 16;
  if (s === "4:00-5:00") return 17;
  if (s.startsWith("1:") || s.startsWith("2:") || s.startsWith("3:") || s.startsWith("4:")) return 17;
  if (s.startsWith("9:") || s.startsWith("10:") || s.startsWith("11:")) return 12;
  return null;
}

// Date-level check: well-formed, not in the past, not a weekend.
export function validateScheduleDate(dateStr, now = new Date()) {
  const d = normalizeDateStr(dateStr);
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return { ok: false, message: "Invalid date. Please pick a valid date." };
  }
  if (d < manilaTodayStr(now)) {
    return { ok: false, message: "That date has already passed. Please choose a future date." };
  }
  if (isWeekendDateStr(d)) {
    return { ok: false, message: "Appointments cannot be scheduled on Saturday or Sunday." };
  }
  return { ok: true, date: d };
}

// Full check for a single confirmed block: date rules + the block must not
// have ended yet when booking for today (server clock, not device clock).
export function validateSchedule(dateStr, slot, now = new Date()) {
  const d = validateScheduleDate(dateStr, now);
  if (!d.ok) return d;
  if (slot && d.date === manilaTodayStr(now)) {
    const end = slotEndHour(slot);
    if (end == null) {
      return { ok: false, message: "Invalid time block selected." };
    }
    if (manilaHour(now) >= end) {
      return {
        ok: false,
        message: "That time block has already passed today. Please choose another date or block.",
      };
    }
  }
  return { ok: true, date: d.date };
}

// Check for request forms that send an ARRAY of preferred blocks: the date
// must be valid and at least one block must still be open when booking today.
export function validateScheduleSlots(dateStr, slots, now = new Date()) {
  const d = validateScheduleDate(dateStr, now);
  if (!d.ok) return d;
  const list = Array.isArray(slots) ? slots : slots ? String(slots).split(",") : [];
  if (d.date === manilaTodayStr(now)) {
    const hour = manilaHour(now);
    const anyOpen = list.some((s) => {
      const end = slotEndHour(s);
      return end != null && hour < end;
    });
    if (!anyOpen) {
      return {
        ok: false,
        message: "All selected time blocks have already passed today. Please choose another date.",
      };
    }
  }
  return { ok: true, date: d.date };
}

// Payload for GET /api/meta/time — lets the UI gate calendars with the
// same clock the server enforces.
export function manilaNowPayload(now = new Date()) {
  const today = manilaTodayStr(now);
  return {
    now: now.toISOString(),
    today,
    hour: manilaHour(now),
    minute: manilaMinute(now),
    weekday: weekdayOf(today),
    tz: MANILA_TZ,
  };
}
