// utils/inventory-docx.js
//
// Renders a filled-in copy of the official MSU DSA "Student Individual Inventory
// Record Form" (.docx) from a stored student_inventories.form_data blob.
//
// The template (templates/individual-inventory-template.docx) is produced by
// scripts/build-inventory-template.js. The placeholder names below are the
// contract shared with that script — keep them in sync.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import { imageSize } from "image-size";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "..", "templates", "individual-inventory-template.docx");
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Fits a signature into the form's blank without distortion (px @ 96dpi).
const SIG_MAX_W = 170;
const SIG_MAX_H = 48;

// Stand-in for "no signature": a 1x1 transparent PNG rendered at 1px, so the
// image tag disappears and only the underline prints. (The free image module
// cannot conditionally skip a {%tag}, so we always feed it something.)
// Signature tag values are base64 STRINGS, not Buffers — the module mistakes
// any object-typed scope value for its own pre-resolved {rId, sizePixel} shape.
const TRANSPARENT_PX_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const signatureSize = (buffer, tagValue) => {
  if (tagValue === TRANSPARENT_PX_B64) return [1, 1];
  try {
    const { width, height } = imageSize(buffer);
    const scale = Math.min(SIG_MAX_W / width, SIG_MAX_H / height, 1);
    return [Math.round(width * scale), Math.round(height * scale)];
  } catch {
    return [SIG_MAX_W, SIG_MAX_H];
  }
};

// Reads a stored signature image (users.signature_url, e.g.
// "/uploads/signatures/signature-7-....png") from local disk. Returns null for
// anything missing or outside the uploads directory.
export function readSignatureFile(signatureUrl) {
  if (!signatureUrl || typeof signatureUrl !== "string") return null;
  if (!signatureUrl.startsWith("/uploads/")) return null;
  const filePath = path.resolve(UPLOADS_DIR, signatureUrl.slice("/uploads/".length));
  if (!filePath.startsWith(path.resolve(UPLOADS_DIR))) return null;
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

// Checkbox glyph used everywhere a box/marker appears on the form.
const box = (checked) => (checked ? "[ X ]" : "[   ]");
// Plain text value: never emit null/undefined.
const val = (v) => (v === null || v === undefined ? "" : String(v));

export function mapInventoryToPlaceholders(formData = {}, profile = {}, signatures = {}) {
  const p = formData.personal || {};
  const e = formData.educational || {};
  const f = formData.family || {};
  const h = formData.health || {};
  const o = formData.other || {};
  const ack = formData.acknowledgment || {};
  const tests = Array.isArray(formData.testRecord) ? formData.testRecord : [];

  const fin = Array.isArray(f.financingSources) ? f.financingSources : [];
  const interests = Array.isArray(o.interestGroups) ? o.interestGroups : [];
  const help = Array.isArray(o.helpNeeded) ? o.helpNeeded : [];
  const problems = h.problems || {};

  const fullName =
    [p.surname, p.firstName, p.middleName].filter(Boolean).join(" ").trim() ||
    val(profile.name);

  const data = {
    // I. Personal
    idNumber: val(p.idNumber) || val(profile.studentNumber),
    fullName,
    sex: val(p.sex),
    age: val(p.age),
    course: val(p.course),
    yearLevel: val(p.yearLevel),
    academicYear: val(p.academicYear),
    dateOfBirth: val(p.dateOfBirth),
    heightM: val(p.heightM),
    weightKg: val(p.weightKg),
    placeOfBirth: val(p.placeOfBirth),
    presentAddress: val(p.presentAddress),
    emailAddress: val(p.emailAddress) || val(profile.email),
    hometownAddress: val(p.hometownAddress),
    mobileNo: val(p.mobileNo),
    gpa: val(p.gpa),
    religion: val(p.religion),
    citizenship: val(p.citizenship),
    tribe: val(p.tribe),
    employerNameAddress: val(p.employerNameAddress),
    emergencyName: val(p.emergencyName),
    emergencyContactNo: val(p.emergencyContactNo),
    emergencyAddress: val(p.emergencyAddress),
    emergencyRelationship: val(p.emergencyRelationship),
    // Civil status checkboxes
    csSingle: box(p.civilStatus === "single"),
    csMarried: box(p.civilStatus === "married"),
    csSeparated: box(p.civilStatus === "separated"),
    csWidow: box(p.civilStatus === "widow"),
    csSoloParent: box(p.civilStatus === "solo_parent"),

    // II. Educational — nature of schooling
    natContinuous: box(e.natureOfSchooling === "continuous"),
    natInterrupted: box(e.natureOfSchooling === "interrupted"),
    interruptedReason: val(e.interruptedReason),

    // III. Family
    fatherName: val(f.father?.name),
    fatherAge: val(f.father?.age),
    fatherLiving: box(f.father?.livingStatus === "living"),
    fatherDeceased: box(f.father?.livingStatus === "deceased"),
    fatherEduc: val(f.father?.educationalAttainment),
    fatherOccupation: val(f.father?.occupation),
    motherName: val(f.mother?.name),
    motherAge: val(f.mother?.age),
    motherLiving: box(f.mother?.livingStatus === "living"),
    motherDeceased: box(f.mother?.livingStatus === "deceased"),
    motherEduc: val(f.mother?.educationalAttainment),
    motherOccupation: val(f.mother?.occupation),
    guardianName: val(f.guardian?.name),
    guardianAge: val(f.guardian?.age),
    guardianEduc: val(f.guardian?.educationalAttainment),
    guardianOccupation: val(f.guardian?.occupation),
    pmSingleParent: box(f.parentsMaritalStatus === "single_parent"),
    pmMarriedTogether: box(f.parentsMaritalStatus === "married_together"),
    pmMarriedSeparated: box(f.parentsMaritalStatus === "married_separated"),
    pmNotMarriedLiving: box(f.parentsMaritalStatus === "not_married_living_together"),
    pmOther: box(f.parentsMaritalStatus === "other"),
    parentsMaritalOther: val(f.parentsMaritalOther),
    siblingsTotal: val(f.siblingsTotal),
    brothersCount: val(f.brothersCount),
    sistersCount: val(f.sistersCount),
    finParents: box(fin.includes("parents")),
    finSpouse: box(fin.includes("spouse")),
    finRelatives: box(fin.includes("relatives")),
    finBrotherSister: box(fin.includes("brother_sister")),
    finScholarship: box(fin.includes("scholarship")),
    finSelfSupporting: box(fin.includes("self_supporting")),
    finOther: box(!!f.financingOther),
    financingOther: val(f.financingOther),

    // IV. Health
    hVision: box(!!problems.vision),
    hSpeech: box(!!problems.speech),
    hHearing: box(!!problems.hearing),
    hGeneralHealth: box(!!problems.generalHealth),
    hPhysical: box(!!problems.physicalDisability),
    visionDetail: val(problems.visionDetail),
    speechDetail: val(problems.speechDetail),
    hearingDetail: val(problems.hearingDetail),
    generalHealthDetail: val(problems.generalHealthDetail),
    diagnosedIllnessesNote: val(h.diagnosedIllnessesNote),
    psychYes: box(!!h.psychologicalTestsTaken),
    psychNo: box(!h.psychologicalTestsTaken),

    // Other information
    igSports: box(interests.includes("sports")),
    igScience: box(interests.includes("science")),
    igCivic: box(interests.includes("civic")),
    igArts: box(interests.includes("arts")),
    igSocial: box(interests.includes("social_studies")),
    igReligious: box(interests.includes("religious")),
    igOther: box(!!o.interestGroupsOther),
    consultedYes: box(!!o.consultedBefore),
    consultedNo: box(!o.consultedBefore),
    consultedReason: val(o.consultedReason),
    hnFamily: box(help.includes("family")),
    hnCareer: box(help.includes("career")),
    hnRelationship: box(help.includes("relationship")),
    hnSelf: box(help.includes("self")),
    hnTeachers: box(help.includes("teachers")),
    hnFinancial: box(help.includes("financial")),
    hnAcademic: box(help.includes("academic")),
    hnHealth: box(help.includes("health")),
    helpNeededOther: val(o.helpNeededOther),

    // Acknowledgment
    studentPrintedName: val(ack.studentPrintedName) || fullName,
    dateAcknowledged: val(ack.dateAcknowledged),
  };

  // Digital signatures (see generateInventoryDocx's `signatures` arg): the
  // uploaded image is stamped above the blank; without one an invisible pixel
  // renders instead and the underline stays free for wet signing.
  data.studentSignature = signatures.studentSignature
    ? signatures.studentSignature.toString("base64")
    : TRANSPARENT_PX_B64;
  data.counselorSignature = signatures.counselorSignature
    ? signatures.counselorSignature.toString("base64")
    : TRANSPARENT_PX_B64;
  data.counselorPrintedName = val(signatures.counselorName);

  // Educational background table: 5 fixed levels x 5 columns.
  const bg = Array.isArray(e.background) ? e.background : [];
  for (let i = 0; i < 5; i++) {
    const row = bg[i] || {};
    data[`edu${i}School`] = val(row.schoolGraduated);
    data[`edu${i}Address`] = val(row.schoolAddress);
    data[`edu${i}PublicPrivate`] = val(row.publicPrivate);
    data[`edu${i}YearGraduated`] = val(row.yearGraduated);
    data[`edu${i}Honors`] = val(row.honors);
  }

  // Test record: up to 3 rows on the form.
  for (let i = 0; i < 3; i++) {
    const row = tests[i] || {};
    data[`tr${i}Date`] = val(row.date);
    data[`tr${i}Kind`] = val(row.kindOfTest);
    data[`tr${i}Score`] = val(row.score);
    data[`tr${i}Rank`] = val(row.rank);
  }

  return data;
}

// `signatures` (all optional): { studentSignature: Buffer, counselorSignature:
// Buffer, counselorName: string } — see readSignatureFile above for loading.
export function generateInventoryDocx(formData = {}, profile = {}, signatures = {}) {
  const content = fs.readFileSync(TEMPLATE_PATH, "binary");
  const zip = new PizZip(content);
  const imageModule = new ImageModule({
    centered: false,
    getImage: (tagValue) => Buffer.from(tagValue, "base64"),
    getSize: (img, tagValue) => signatureSize(img, tagValue),
  });
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
    modules: [imageModule],
  });
  doc.render(mapInventoryToPlaceholders(formData, profile, signatures));
  return doc.toBuffer();
}
