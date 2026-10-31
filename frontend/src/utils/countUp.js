// Pure helpers behind CountUp, kept out of the JSX so they can be unit-tested.

// Currency/percent-wrapped numbers only. Anything else ("Mar 3", "3 / 5",
// labels) returns null and renders untouched.
const NUMERIC = /^([₱$€£]?\s*)(-?\d[\d,]*(?:\.\d+)?)(\s*%?)$/;

export function parseCount(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const match = NUMERIC.exec(String(value).trim());
  if (!match) return null;
  const target = Number(match[2].replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;
  return {
    target,
    prefix: match[1],
    suffix: match[3],
    decimals: match[2].split(".")[1]?.length ?? 0,
    grouped: match[2].includes(","),
  };
}

export function formatCount(n, { decimals = 0, grouped = false } = {}) {
  return grouped
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : n.toFixed(decimals);
}
