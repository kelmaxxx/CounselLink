// Server-clock helpers (Asia/Manila) for booking gates.
//
// NEVER gate "past / night / weekend" rules on `new Date()` alone: a user
// can set their laptop clock to anything and bypass client-side limits.
// The backend enforces the same rules with its own clock (source of truth);
// these helpers let the UI disable the same dates/slots up front by syncing
// once with GET /api/meta/time (public, no sensitive data).
//
// Timezone-safe: the server moment is ticked from the sync anchor and all
// wall-clock reads go through Asia/Manila Intl formatters, so a wrong
// device timezone can't shift the date either.

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const MANILA_TZ = "Asia/Manila";

let serverEpochAtSync = 0;
let clientEpochAtSync = 0;
let synced = false;
let inflight = null;

export function isServerTimeReady() {
  return synced;
}

export async function syncServerTime() {
  if (synced) return true;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/meta/time`);
      if (!res.ok) return false;
      const data = await res.json();
      const serverMs = new Date(data.now).getTime();
      if (Number.isNaN(serverMs)) return false;
      serverEpochAtSync = serverMs;
      clientEpochAtSync = Date.now();
      synced = true;
      return true;
    } catch {
      return false; // fall back to the device clock
    }
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

function serverMs() {
  if (!synced) return Date.now();
  return serverEpochAtSync + (Date.now() - clientEpochAtSync);
}

export function serverNow() {
  return new Date(serverMs());
}

const dtfDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dtfHour = new Intl.DateTimeFormat("en-GB", {
  timeZone: MANILA_TZ,
  hour: "2-digit",
  hourCycle: "h23",
});

// Manila wall-clock "today" as YYYY-MM-DD.
export function serverTodayStr() {
  return dtfDate.format(serverMs());
}

export function serverHour() {
  return Number(dtfHour.format(serverMs()));
}

// 0 (Sun) – 6 (Sat) for Manila today. Calendar math (no UTC conversion),
// so it can never shift a day.
export function serverWeekday() {
  const m = serverTodayStr().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date().getDay();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
}

// First of the current Manila month (calendar navigation anchor).
export function serverMonthStart() {
  const m = serverTodayStr().match(/^(\d{4})-(\d{2})/);
  if (!m) {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}
