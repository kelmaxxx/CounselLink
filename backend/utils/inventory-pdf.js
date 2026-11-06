// utils/inventory-pdf.js
//
// Fills the official MSU DSA "Student Individual Inventory Record Form" PDF
// (templates/student-inventory-blank.pdf) by drawing the student's values on
// top of it. Only two areas are re-laid-out — the course row and the education
// table columns — so long values keep a readable size; every other line stays
// exactly where the official form put it.
//
// Coordinates below were measured from the blank PDF (points, top-left origin,
// baseline of each blank's underscore). Keep them in sync with that template.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mapInventoryToPlaceholders } from "./inventory-docx.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "..", "templates", "student-inventory-blank.pdf");

const PAGE_H = 936;
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const BASE = 8.04;
const HEADER_SIZE = 6.96;
// Readability floor for filled-in values. Below this the form stops looking
// like a filled-in record, so oversize values are ellipsized instead.
const MIN_VALUE_SIZE = 6;

// [key, x0, x1, baselineY, optional font size].
const PAGE1_TEXT = [
  ["idNumber", 87.26, 195.18, 221.9],
  ["headerDate", 420.46, 572.0, 110.3],
  ["controlNo", 420.46, 572.0, 124.34],
  ["sex", 395.24, 419.19, 250.7],
  ["age", 439.97, 475.91, 250.7],
  ["course", 66.33, 227.0, 279.62],
  ["yearLevel", 270.0, 306.1, 279.62],
  ["academicYear", 324.5, 360.6, 279.62],
  ["dateOfBirth", 414.5, 503.9, 279.62],
  ["heightM", 78.34, 126.38, 289.22],
  ["weightKg", 159.66, 219.69, 289.22],
  ["placeOfBirth", 277.08, 473.03, 289.22],
  ["presentAddress", 246.65, 450.53, 298.82],
  ["emailAddress", 36.0, 170.0, 308.45],
  ["hometownAddress", 112.64, 320.58, 318.05],
  ["mobileNo", 368.57, 472.52, 318.05],
  ["gpa", 117.9, 177.94, 327.65],
  ["religion", 215.05, 291.04, 327.65],
  ["citizenship", 337.76, 389.86, 327.65],
  ["tribe", 414.15, 474.18, 327.65],
  ["employerNameAddress", 267.31, 463.26, 337.37],
  ["emergencyName", 201.71, 321.73, 346.97],
  ["emergencyContactNo", 367.71, 467.7, 346.97],
  ["emergencyAddress", 72.26, 248.19, 356.57],
  ["emergencyRelationship", 301.76, 473.72, 356.57],
  ["interruptedReason", 373.69, 465.75, 486.05],
  ["fatherName", 98.95, 262.99, 510.29],
  ["fatherAge", 283.77, 319.71, 510.29],
  ["fatherEduc", 130.39, 322.38, 520.03],
  ["fatherOccupation", 370.78, 446.77, 520.03],
  ["motherName", 100.75, 264.67, 529.63],
  ["motherAge", 285.46, 321.4, 529.63],
  ["motherEduc", 130.39, 322.38, 539.23],
  ["motherOccupation", 370.78, 446.77, 539.23],
  ["guardianName", 138.55, 294.45, 548.83],
  ["guardianAge", 315.23, 351.17, 548.83],
  ["guardianEduc", 130.39, 322.38, 558.43],
  ["guardianOccupation", 370.78, 446.77, 558.43],
  ["parentsMaritalOther", 389.89, 465.88, 596.95],
  ["siblingsTotal", 230.87, 250.85, 606.55],
  ["brothersCount", 331.72, 351.7, 606.55],
  ["sistersCount", 425.63, 445.61, 606.55],
  ["financingOther", 277.17, 361.19, 635.35],
  ["visionDetail", 36.0, 138.0, 696.79, 6],
  ["speechDetail", 144.71, 240.71, 696.79, 6],
  ["hearingDetail", 252.44, 342.33, 696.79, 6],
  ["generalHealthDetail", 345.68, 438.79, 696.79, 6],
  ["diagnosedIllnessesNote", 62.78, 350.66, 725.86, 6],
];

// Name sits above one long blank; the three guides are centered at these x.
const PAGE1_NAMES = [
  ["nameSurname", 127.7, 250.7, 120],
  ["nameFirst", 251.2, 250.7, 110],
  ["nameMiddle", 338.4, 250.7, 100],
];

// [key, x0, x1, baselineY] for bracket checkboxes (draw an X between brackets).
const PAGE1_BOXES = [
  ["csSingle", 84.62, 91.79, 270.02],
  ["csMarried", 119.54, 126.7, 270.02],
  ["csSeparated", 159.14, 166.3, 270.02],
  ["csWidow", 206.33, 213.49, 270.02],
  ["csSoloParent", 240.89, 248.05, 270.02],
  ["natContinuous", 158.71, 173.01, 486.05],
  ["natInterrupted", 288.07, 302.37, 486.05],
  ["fatherLiving", 322.03, 331.78, 510.29],
  ["fatherDeceased", 362.34, 372.08, 510.29],
  ["motherLiving", 323.72, 333.47, 529.63],
  ["motherDeceased", 364.02, 373.77, 529.63],
  ["pmSingleParent", 288.07, 297.94, 577.63],
  ["pmMarriedTogether", 72.02, 81.89, 587.35],
  ["pmMarriedSeparated", 288.07, 297.94, 587.35],
  ["pmNotMarriedLiving", 72.02, 81.89, 596.95],
  ["pmOther", 288.07, 297.94, 596.95],
  ["finParents", 180.05, 189.92, 616.15],
  ["finSpouse", 288.07, 297.94, 616.15],
  ["finRelatives", 396.07, 405.94, 616.15],
  ["finBrotherSister", 180.05, 189.92, 625.75],
  ["finScholarship", 252.05, 261.92, 625.75],
  ["finSelfSupporting", 360.07, 369.94, 625.75],
  ["finOther", 180.05, 189.92, 635.35],
  ["hVision", 36.0, 44.55, 682.75],
  ["hSpeech", 108.02, 116.57, 682.75],
  ["hHearing", 180.05, 188.6, 682.75],
  ["hGeneralHealth", 288.07, 296.62, 682.75],
  ["hPhysical", 368.41, 376.96, 682.75],
];

const PAGE2_TEXT = [
  ["tr0Date", 36.0, 104.07, 101.66],
  ["tr0Kind", 144.02, 216.05, 101.66],
  ["tr0Score", 288.07, 364.06, 101.66],
  ["tr0Rank", 432.1, 508.09, 101.66],
  ["tr1Date", 36.0, 104.07, 111.26],
  ["tr1Kind", 144.02, 216.05, 111.26],
  ["tr1Score", 288.07, 364.06, 111.26],
  ["tr1Rank", 432.1, 508.09, 111.26],
  ["tr2Date", 36.0, 104.07, 120.86],
  ["tr2Kind", 144.02, 216.05, 120.86],
  ["tr2Score", 288.07, 364.06, 120.86],
  ["tr2Rank", 432.1, 508.09, 120.86],
  ["consultedReason", 36.0, 471.86, 212.78],
  ["helpNeededOther", 398.35, 486.34, 249.14],
];

// Line-style blanks that are checked with an X rather than a bracket box.
const PAGE2_LINE_BOXES = [
  ["igSports", 36.0, 72.04, 159.74],
  ["igScience", 180.05, 216.09, 159.74],
  ["igCivic", 288.07, 324.11, 159.74],
  ["igArts", 36.0, 72.04, 169.34],
  ["igSocial", 180.05, 216.09, 169.34],
  ["igOther", 288.07, 324.11, 169.34],
  ["igReligious", 36.0, 72.04, 178.94],
  ["consultedYes", 326.63, 354.64, 193.58],
  ["consultedNo", 396.07, 428.15, 193.58],
  ["hnFamily", 36.0, 64.01, 249.14],
  ["hnCareer", 180.05, 208.06, 249.14],
  ["hnRelationship", 36.0, 64.01, 258.74],
  ["hnSelf", 180.05, 208.06, 258.74],
  ["hnTeachers", 36.0, 64.01, 268.46],
  ["hnFinancial", 180.05, 208.06, 268.46],
  ["hnAcademic", 36.0, 64.01, 278.06],
  ["hnHealth", 180.05, 208.06, 278.06],
];

// Line-style checkboxes on page 1 (item 3: psychological tests).
const PAGE1_LINE_BOXES = [
  ["psychYes", 247.59, 275.6, 740.14],
  ["psychNo", 324.07, 356.15, 740.14],
];

const PAGE2_NAMES = [
  ["studentPrintedName", 72.02, 279.97, 335.81],
  ["studentPrintedName", 54.0, 235.85, 685.15],
];
const PAGE2_DATE = [276.63, 378.1, 710.47];
const PAGE2_SIGNATURE_LINES = [
  [297.77, 453.77, 335.81],
  [251.46, 387.83, 685.15],
];

// Educational background table. Its grid is repainted in generateInventoryPdf
// with the short columns narrowed, so long school names and addresses get the
// width they need.
const EDU_LEFT = 30.6;
const EDU_RIGHT = 572.4;
const EDU_TOP = 377.7;
const EDU_ROW_LINES = [412.13, 425.33, 438.41, 451.49, 464.57, 477.65];
const EDU_COL_EDGES = [EDU_LEFT, 147.35, 247.35, 387.35, 431.35, 487.35, EDU_RIGHT];
const EDU_COLS = [
  ["School", 147.35, 247.35],
  ["Address", 247.35, 387.35],
  ["PublicPrivate", 387.35, 431.35],
  ["YearGraduated", 431.35, 487.35],
  ["Honors", 487.35, EDU_RIGHT],
];
const EDU_ROWS = [
  [412.13, 425.33, 420.65],
  [425.33, 438.41, 433.73],
  [438.41, 451.49, 446.81],
  [451.49, 464.57, 459.89],
  [464.57, 477.65, 472.97],
];
// Header lines and the static level labels, centered in their new columns.
const EDU_HEADER_LINES = [
  ["LEVEL", 0, 384.77],
  ["SCHOOL", 1, 384.77],
  ["GRADUATED", 1, 393.29],
  ["SCHOOL ADDRESS", 2, 384.77],
  ["PUBLIC/", 3, 384.77],
  ["PRIVATE", 3, 393.29],
  ["YEAR", 4, 384.77],
  ["GRADUATED", 4, 393.29],
  ["HONORS", 5, 384.77],
  ["RECEIVED/APECIAL", 5, 393.29],
  ["AWARDS", 5, 401.69],
];
const EDU_LEVEL_LABELS = [
  ["Elementary", 420.65],
  ["Junior High School", 433.73],
  ["Vocational", 446.81],
  ["Senior High School", 459.89],
  ["College", 472.97],
];

// 1x1 picture box measured from the blank form.
const AVATAR_BOX = { x0: 485.0, x1: 557.0, top: 185.85, bottom: 257.85 };

const checked = (value) => String(value ?? "").includes("X");

const wrap = (font, text, maxWidth, size, maxLines) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) return null;
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) return null;
  return lines.every((line) => font.widthOfTextAtSize(line, size) <= maxWidth) ? lines : null;
};

const truncate = (font, text, maxWidth, size) => {
  let out = text;
  while (out && font.widthOfTextAtSize(out, size) > maxWidth) out = out.slice(0, -1);
  return out;
};

const ellipsize = (font, text, maxWidth, size) => {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const suffix = "...";
  let out = text;
  while (out && font.widthOfTextAtSize(out + suffix, size) > maxWidth) out = out.slice(0, -1);
  // Prefer cutting whole words ("BS Information Technology...") over a
  // half-word ("...Databas..."), but only when that keeps most of the value.
  const lastSpace = out.lastIndexOf(" ");
  if (lastSpace > out.length * 0.5) out = out.slice(0, lastSpace);
  return out ? `${out}${suffix}` : truncate(font, text, maxWidth, size);
};

// Shrinks until the text fits, wrapping onto at most `maxLines` lines. If it
// still does not fit at the readable floor, trim with an ellipsis.
const fitLines = (font, text, maxWidth, maxLines, startSize, minSize) => {
  for (let size = startSize; size >= minSize; size -= 0.25) {
    const lines = wrap(font, text, maxWidth, size, maxLines);
    if (lines) return { size, lines };
  }
  return { size: minSize, lines: [ellipsize(font, text, maxWidth, minSize)] };
};

const embedImage = async (pdf, bytes) => {
  if (!bytes || bytes.length < 4) return null;
  try {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await pdf.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await pdf.embedJpg(bytes);
  } catch {
    // Corrupt or unsupported image: leave the blank line for wet signing.
  }
  return null;
};

export async function generateInventoryPdf(formData = {}, profile = {}, signatures = {}) {
  const data = mapInventoryToPlaceholders(formData, profile, {}, { pad: false });
  const pdf = await PDFDocument.load(fs.readFileSync(TEMPLATE_PATH));
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const pages = pdf.getPages();
  const [page1, page2] = pages;

  const draw = (page, value, x0, x1, top, { size = BASE, min = MIN_VALUE_SIZE, maxLines = 1 } = {}) => {
    const text = String(value ?? "").trim();
    if (!text) return;
    const width = x1 - x0;
    const { size: used, lines } = fitLines(font, text, width, maxLines, size, min);
    const leading = used * 1.18;
    lines.forEach((line, i) => {
      page.drawText(line, { x: x0 + 0.6, y: PAGE_H - top - i * leading, size: used, font, color: BLACK });
    });
  };

  const tick = (page, x0, x1, top) => {
    const size = Math.min(6.5, (x1 - x0) * 0.85);
    const width = font.widthOfTextAtSize("X", size);
    page.drawText("X", {
      x: (x0 + x1) / 2 - width / 2,
      y: PAGE_H - top,
      size,
      font,
      color: BLACK,
    });
  };

  const drawCentered = (page, value, centerX, top, maxWidth) => {
    const text = String(value ?? "").trim();
    if (!text) return;
    let size = BASE;
    while (size > 5 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.25;
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: centerX - width / 2,
      y: PAGE_H - top,
      size,
      font,
      color: BLACK,
    });
  };

  // Table cells are only 13.2pt tall, so a wrapped value needs its own baselines
  // to stay inside the row instead of spilling into the next one. Try one line
  // first (largest readable size), then two lines at the 6pt floor.
  const drawCell = (page, value, x0, x1, rowTop) => {
    const text = String(value ?? "").trim();
    if (!text) return;
    const width = x1 - x0 - 1;

    let size = MIN_VALUE_SIZE;
    let lines = null;
    for (let candidate = BASE; candidate >= MIN_VALUE_SIZE; candidate -= 0.2) {
      const oneLine = wrap(font, text, width, candidate, 1);
      if (oneLine) {
        size = candidate;
        lines = oneLine;
        break;
      }
    }
    if (!lines) {
      lines = wrap(font, text, width, MIN_VALUE_SIZE, 2) || [ellipsize(font, text, width, MIN_VALUE_SIZE)];
    }

    lines.forEach((line, i) => {
      page.drawText(line, {
        x: x0 + 0.6,
        y: PAGE_H - (rowTop + (lines.length > 1 ? 5.4 + i * (size * 1.12) : 8.52)),
        size,
        font,
        color: BLACK,
      });
    });
  };

  // The course row and the education table are the two places where the form's
  // own layout is repainted: cover the template, then draw the new version.
  const line = (x0, y0, x1, y1) =>
    page1.drawLine({
      start: { x: x0, y: PAGE_H - y0 },
      end: { x: x1, y: PAGE_H - y1 },
      thickness: 0.5,
      color: BLACK,
    });

  // Course row: the short fields after it (year level, A.Y., birth date) move
  // right into the unused tail, giving the course blank the width it needs.
  page1.drawRectangle({
    x: 35.2,
    y: PAGE_H - 282.8,
    width: 469.0,
    height: 282.8 - 273.4,
    color: WHITE,
  });
  const courseRowY = PAGE_H - 279.62;
  const rowLabel = (text, x) =>
    page1.drawText(text, { x, y: courseRowY, size: BASE, font, color: BLACK });
  const rowBlank = (x, width) =>
    page1.drawText("_".repeat(Math.round(width / 4.02)), {
      x,
      y: courseRowY,
      size: BASE,
      font,
      color: BLACK,
    });
  rowLabel("Course: ", 36);
  rowBlank(66.33, 160.7);
  rowLabel("Year Level: ", 228.5);
  rowBlank(270.0, 36.1);
  rowLabel("A.Y. ", 307.5);
  rowBlank(324.5, 36.1);
  rowLabel("Date of Birth: ", 364.5);
  rowBlank(414.5, 89.4);

  // The email already gets its own overflow line under Present Address; extend
  // that line into the empty space at its right so the full address fits at the
  // normal size instead of shrinking.
  page1.drawText("_".repeat(10), {
    x: 128.46,
    y: PAGE_H - 308.45,
    size: BASE,
    font,
    color: BLACK,
  });

  // Education table: repaint the grid, header and level labels with the new
  // column widths (school/address wider, public/year/honors narrower).
  page1.drawRectangle({
    x: 29.7,
    y: PAGE_H - 479.6,
    width: 543.4,
    height: 479.6 - 374.6,
    color: WHITE,
  });
  for (const y of [EDU_TOP, ...EDU_ROW_LINES]) line(EDU_LEFT, y, EDU_RIGHT, y);
  for (const x of EDU_COL_EDGES) {
    line(x, EDU_TOP, x, EDU_ROW_LINES[EDU_ROW_LINES.length - 1]);
  }
  for (const [text, col, y] of EDU_HEADER_LINES) {
    const center = (EDU_COL_EDGES[col] + EDU_COL_EDGES[col + 1]) / 2;
    const width = bold.widthOfTextAtSize(text, HEADER_SIZE);
    page1.drawText(text, {
      x: center - width / 2,
      y: PAGE_H - y,
      size: HEADER_SIZE,
      font: bold,
      color: BLACK,
    });
  }
  for (const [text, y] of EDU_LEVEL_LABELS) {
    page1.drawText(text, { x: 36, y: PAGE_H - y, size: BASE, font, color: BLACK });
  }

  for (const [key, x0, x1, y, size] of PAGE1_TEXT) {
    draw(page1, data[key], x0, x1, y, { size: size || BASE });
  }
  for (const [key, center, y, maxWidth] of PAGE1_NAMES) {
    drawCentered(page1, data[key], center, y, maxWidth);
  }
  for (const [key, x0, x1, y] of PAGE1_BOXES) {
    if (checked(data[key])) tick(page1, x0, x1, y);
  }
  for (const [key, x0, x1, y] of PAGE1_LINE_BOXES) {
    if (checked(data[key])) tick(page1, x0, x1, y);
  }

  // Educational background table.
  for (let row = 0; row < EDU_ROWS.length; row++) {
    const [rowTop] = EDU_ROWS[row];
    for (const [suffix, x0, x1] of EDU_COLS) {
      drawCell(page1, data[`edu${row}${suffix}`], x0, x1, rowTop);
    }
  }

  for (const [key, x0, x1, y] of PAGE2_TEXT) draw(page2, data[key], x0, x1, y);
  for (const [key, x0, x1, y] of PAGE2_LINE_BOXES) {
    if (checked(data[key])) tick(page2, x0, x1, y);
  }
  for (const [key, x0, x1, y] of PAGE2_NAMES) draw(page2, data[key], x0, x1, y);
  draw(page2, data.dateAcknowledged, ...PAGE2_DATE);

  // Interest "Others" free text goes on the blank after the label; the X stays
  // in the box before it (drawn above with the other interest boxes).
  const interestOther = String(formData.other?.interestGroupsOther || "").trim();
  draw(page2, interestOther, 358.0, 570.0, 169.34, { size: 7 });

  const signature = await embedImage(pdf, signatures.studentSignature);
  if (signature) {
    for (const [x0, x1, y] of PAGE2_SIGNATURE_LINES) {
      const maxW = x1 - x0;
      const maxH = 26;
      const scale = Math.min(maxW / signature.width, maxH / signature.height, 1);
      const w = signature.width * scale;
      const h = signature.height * scale;
      page2.drawImage(signature, {
        x: x0 + (maxW - w) / 2,
        y: PAGE_H - y + 1,
        width: w,
        height: h,
      });
    }
  }

  const avatar = await embedImage(pdf, signatures.studentAvatar);
  if (avatar) {
    const w = AVATAR_BOX.x1 - AVATAR_BOX.x0 - 1;
    const h = AVATAR_BOX.bottom - AVATAR_BOX.top - 1;
    page1.drawRectangle({
      x: AVATAR_BOX.x0 + 0.5,
      y: PAGE_H - AVATAR_BOX.bottom + 0.5,
      width: w,
      height: h,
      color: rgb(1, 1, 1),
    });
    page1.drawImage(avatar, {
      x: AVATAR_BOX.x0 + 0.5,
      y: PAGE_H - AVATAR_BOX.bottom + 0.5,
      width: w,
      height: h,
    });
  }

  return Buffer.from(await pdf.save());
}
