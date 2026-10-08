// Sagayan 2026 college identities.
// Official color per college, keyed by acronym. Source: "Sagayan 2026
// College Identities and Color Palette Reference".
export const SAGAYAN_COLLEGE_COLORS = {
  KFCIAAS: "#3C883D", // Vanguards
  CED: "#033FB5", // Phoenix
  CHS: "#3BBC99", // Vipers
  CSPEAR: "#8D1000", // Lions
  CFAS: "#5FBCF8", // Sharks
  CFES: "#3C883D", // Panthers
  CICS: "#0A4874", // T-Rex
  CNSM: "#C1201A", // Dragons
  COA: "#42AC3A", // Tamaraws
  COE: "#F60908", // Eagles
  CSSH: "#FBC911", // Tigers
  CPA: "#1E139D", // Knights
  CHTM: "#F36214", // Peacocks
  CBAA: "#EE9B00", // Griffins
  COM: "#A63154", // Sultans
  COL: "#8A088A", // Scales
};

export const COLLEGE_COLOR_FALLBACK = "#808080";

// Resolve a college's Sagayan color by acronym (case/whitespace tolerant).
// Unknown or missing acronyms get the neutral fallback so dynamic data can
// never render an uncolored cell.
export function collegeColor(acronym, fallback = COLLEGE_COLOR_FALLBACK) {
  if (!acronym) return fallback;
  return SAGAYAN_COLLEGE_COLORS[String(acronym).trim().toUpperCase()] || fallback;
}

// Readable label color over a given fill: dark text on light fills (e.g.
// CSSH yellow), white text on dark fills. YIQ brightness split at 128.
export function contrastTextColor(hex) {
  const m = String(hex || "").match(/^#?([0-9a-f]{6})$/i);
  if (!m) return "#ffffff";
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? "#1f2937" : "#ffffff";
}
