// utils/inventory-field-widths.js
//
// Single source of truth for the FIXED character width of every fill-in blank on
// the Student Individual Inventory form. Both sides depend on these numbers:
//
//   * scripts/build-inventory-template.js  authors each blank as an *underlined*
//     run of exactly this many characters (so the printed "line" is a constant
//     length that can never reflow — the form stays locked at 2 pages).
//   * utils/inventory-docx.js  pads/truncates each value to the same width, so a
//     short/empty value shows as a blank underline and a long value is trimmed to
//     fit its line instead of wrapping onto a third page.
//
// Widths were taken from the underscore counts of the official blank form.
export const FIELD_WIDTHS = {
  idNumber: 27,
  // Name is split into three aligned segments that sit above the
  // "(Surname) (First Name) (Middle Name)" guide row (they sum to the 78-char blank).
  nameSurname: 30, nameFirst: 26, nameMiddle: 22,
  sex: 6, age: 9,
  course: 24, yearLevel: 21, academicYear: 12, dateOfBirth: 15,
  heightM: 11, weightKg: 15, placeOfBirth: 49,
  presentAddress: 43, emailAddress: 23,
  hometownAddress: 52, mobileNo: 26,
  gpa: 15, religion: 19, citizenship: 13, tribe: 15,
  employerNameAddress: 49,
  emergencyName: 30, emergencyContactNo: 25,
  emergencyAddress: 44, emergencyRelationship: 43,
  interruptedReason: 23,
  fatherName: 41, fatherAge: 9, fatherEduc: 48, fatherOccupation: 19,
  motherName: 41, motherAge: 9, motherEduc: 48, motherOccupation: 19,
  guardianName: 39, guardianAge: 9, guardianEduc: 48, guardianOccupation: 19,
  parentsMaritalOther: 19,
  siblingsTotal: 5, brothersCount: 5, sistersCount: 5,
  financingOther: 21,
  visionDetail: 34, speechDetail: 32, hearingDetail: 30, generalHealthDetail: 31,
  diagnosedIllnessesNote: 96,
  tr0Date: 17, tr0Kind: 18, tr0Score: 19, tr0Rank: 19,
  tr1Date: 17, tr1Kind: 18, tr1Score: 19, tr1Rank: 19,
  tr2Date: 17, tr2Kind: 18, tr2Score: 19, tr2Rank: 19,
  consultedReason: 109,
  helpNeededOther: 22,
  studentPrintedName: 52,
  dateAcknowledged: 29,
};

// Truncates a value to its field width, then right-pads with spaces to exactly
// that width. Rendered inside an underlined run, the padding becomes the visible
// blank line, and the layout can never grow because the width is constant.
export function fit(value, width) {
  const s = value === null || value === undefined ? "" : String(value);
  if (!width || width < 1) return s;
  return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}
