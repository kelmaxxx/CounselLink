// Week-over-week helpers for stat-card trend badges.
// All values are computed from real timestamps — no placeholders.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Count items created in the last 7 days (cur) vs. the 7 days before (prev).
export function weekDelta(items = [], getDate, now = new Date()) {
  const end = new Date(now).getTime();
  let cur = 0;
  let prev = 0;
  (items || []).forEach((it) => {
    const t = new Date(getDate(it)).getTime();
    if (Number.isNaN(t) || t > end) return;
    if (t > end - WEEK_MS) cur += 1;
    else if (t > end - 2 * WEEK_MS) prev += 1;
  });
  const pct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  return { cur, prev, pct };
}

// Turn a { cur, prev, pct } delta into BigStat props.
// pct is null when there is no prior-period data — then we show a
// "+N new" badge only if something actually happened, else nothing.
export function trendProps(delta, label = "this week") {
  const { cur, pct } = delta || {};
  if (pct != null) {
    const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
    return {
      badge: { text: `${pct > 0 ? "+" : ""}${pct}%`, dir },
      trend:
        dir === "up"
          ? `Trending up ${label}`
          : dir === "down"
            ? `Down ${label}`
            : `Steady ${label}`,
      trendDir: dir,
    };
  }
  if (cur > 0) {
    return {
      badge: { text: `+${cur} new`, dir: "up" },
      trend: `${cur} new ${label}`,
      trendDir: "up",
    };
  }
  return { badge: null, trend: null, trendDir: "flat" };
}
