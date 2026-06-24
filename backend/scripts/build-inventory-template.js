// scripts/build-inventory-template.js
//
// One-off build step: turns the official MSU DSA "Student Individual Inventory
// Record Form" (.docx) into a docxtemplater template by injecting {placeholders}
// into the form's blanks, checkboxes and table cells.
//
// Run:  node scripts/build-inventory-template.js
// In:   templates/source/individual-inventory-source.docx
// Out:  templates/individual-inventory-template.docx
//
// The placeholder NAMES defined here are the contract consumed by
// utils/inventory-docx.js (mapInventoryToPlaceholders). Keep them in sync.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "templates", "source", "individual-inventory-source.docx");
const OUT = path.join(__dirname, "..", "templates", "individual-inventory-template.docx");

// --- Text-node replacements, keyed by the node index from the source doc. ---
// Each value is the full new inner text for that <w:t> node (placeholders + kept
// static label text). Indices were taken from a dump of the source document.xml.
const TEXT_EDITS = {
  // I. PERSONAL INFORMATION
  33: " {idNumber}",
  34: "Name: {fullName}          Sex: {sex}   Age: {age}",
  50: "Course: {course}     Year Level: {yearLevel}",
  51: "A.Y. {academicYear}     Date of Birth: {dateOfBirth}",
  53: "): ",
  54: "{heightM}     Weight: {weightKg}     Place of Birth: {placeOfBirth}",
  60: "",
  61: "",
  62: " {presentAddress}",
  63: " ",
  65: " Address: {emailAddress}",
  66: "Hometown Address: {hometownAddress}",
  67: "Mobile No.: {mobileNo}",
  68: "Grade Point Average: {gpa}   Religion: {religion}   Citizenship: {citizenship}   Tribe: {tribe}",
  69: "If working, please indicate the name and address of employer: {employerNameAddress}",
  70: "Person to be contacted in case of emergency: {emergencyName}      Contact No. {emergencyContactNo}",
  71: "Address: ",
  72: "{emergencyAddress}     Relationship: {emergencyRelationship}",

  // II. EDUCATIONAL BACKGROUND — Nature of Schooling (split bracket boxes)
  87: "   ",
  88: "{natContinuous}",
  89: "",
  90: " Continuous",
  91: "",
  92: "{natInterrupted}",
  93: " Interrupted, why? {interruptedReason}  ",

  // III. HOME AND FAMILY BACKGROUND
  95: "Name of Father: {fatherName}     Age: {fatherAge} ",
  96: "{fatherLiving}",
  98: "Living  {fatherDeceased}",
  100: "Educational Attainment: {fatherEduc}     Occupation: {fatherOccupation}",
  101: "Name of Mother: {motherName}     Age: {motherAge} ",
  102: "{motherLiving}",
  104: "Living  {motherDeceased}",
  106: "Educational Attainment: {motherEduc}     Occupation: {motherOccupation}",
  107: "Name of Guardian (If any): {guardianName}     Age: {guardianAge} ",
  108: "Educational Attainment: {guardianEduc}     Occupation: {guardianOccupation}",
  // Parents' Marital Relationship (single-node [  ] boxes)
  110: "{pmSingleParent}",
  112: "{pmMarriedTogether}",
  114: "{pmMarriedSeparated}",
  116: "{pmNotMarriedLiving}",
  118: "{pmOther}",
  119: " Other's (Please Specify) {parentsMaritalOther}",
  120: "Number of children in the family including yourself: {siblingsTotal}   Number of Brothers: {brothersCount}   Number of Sisters: {sistersCount}",
  // Who finances your schooling?
  122: "{finParents}",
  124: "{finSpouse}",
  126: "{finRelatives}",
  128: "{finBrotherSister}",
  130: "{finScholarship}",
  132: "{finSelfSupporting}",
  134: "{finOther}",
  135: " Others, please specify: {financingOther}",

  // IV. HEALTH INFORMATION
  138: "{hVision}",
  140: "{hSpeech}",
  142: "{hHearing}",
  144: "{hGeneralHealth}",
  146: "   {hPhysical}",
  152: "{visionDetail}     {speechDetail}     {hearingDetail}     {generalHealthDetail}",
  154: "                {diagnosedIllnessesNote}",
  155: "Have you taken any psychological tests before?  {psychYes} ",
  157: "{psychNo} No",

  // TEST RECORD (3 rows x 4 cols of underscores)
  164: "{tr0Date}", 165: "{tr0Kind}", 166: "{tr0Score}", 167: "{tr0Rank}",
  168: "{tr1Date}", 169: "{tr1Kind}", 170: "{tr1Score}", 171: "{tr1Rank}",
  172: "{tr2Date}", 173: "{tr2Kind}", 174: "{tr2Score}", 175: "{tr2Rank}",

  // OTHER INFORMATION — interest groups (underscore-prefixed lines)
  178: "{igSports} Sports",
  179: "{igScience} Science",
  180: "{igCivic} Civic Awareness/Service",
  181: "{igArts} Arts",
  182: "{igSocial} Social Studies",
  183: "{igOther} Others",
  184: "{igReligious} Religious",
  185: "Have you consulted/been sent to see the Guidance Counselor before?  {consultedYes} ",
  187: "{consultedNo} No",
  189: "{consultedReason}",
  // How may your Guidance Counselor help you?
  191: "{hnFamily} Family matters",
  192: "{hnCareer} Career concerns ",
  194: " {helpNeededOther}",
  195: "{hnRelationship} Relationship problems",
  196: "{hnSelf} Self",
  197: "{hnTeachers} Concerns with teachers",
  198: "{hnFinancial} Financial matters",
  199: "{hnAcademic} Academic concerns",
  200: "{hnHealth} Health concerns",

  // ACKNOWLEDGMENT (two signature blocks share the same printed-name line)
  205: "{studentPrintedName}                                        ________________________________",
  234: "{studentPrintedName}                                        ________________________________",
  236: "Date Signed: {dateAcknowledged}",
};

// Civil Status: the 5 Wingdings-2 checkbox symbols, in document order.
const SYM_TAGS = ["{csSingle}", "{csMarried}", "{csSeparated}", "{csWidow}", "{csSoloParent}"];

// Educational background table: 25 empty data cells (5 levels x 5 columns),
// row-major. Levels in doc order: Elementary, JHS, Vocational, SHS, College.
const EDU_TAGS = [];
for (let i = 0; i < 5; i++) {
  EDU_TAGS.push(`{edu${i}School}`, `{edu${i}Address}`, `{edu${i}PublicPrivate}`, `{edu${i}YearGraduated}`, `{edu${i}Honors}`);
}

const RUN_RPR = `<w:rPr><w:rFonts w:ascii="Century" w:hAnsi="Century"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>`;
const makeRun = (text) => `<w:r>${RUN_RPR}<w:t xml:space="preserve">${text}</w:t></w:r>`;

function build() {
  const bin = fs.readFileSync(SRC, "binary");
  const zip = new PizZip(bin);
  let xml = zip.file("word/document.xml").asText();

  // 1) Replace text nodes by index.
  let idx = 0;
  let textEdited = 0;
  xml = xml.replace(/<w:t(?: xml:space="preserve")?>[\s\S]*?<\/w:t>/g, (full) => {
    const i = idx++;
    if (Object.prototype.hasOwnProperty.call(TEXT_EDITS, i)) {
      textEdited++;
      return `<w:t xml:space="preserve">${TEXT_EDITS[i]}</w:t>`;
    }
    return full;
  });

  // 2) Replace the 5 Civil Status Wingdings symbols with placeholder runs.
  let symIdx = 0;
  xml = xml.replace(/<w:sym w:font="Wingdings 2" w:char="00A3"\/>/g, () => makeRun(SYM_TAGS[symIdx++] ?? ""));

  // 3) Fill the 25 empty data cells of the Educational Background table.
  // Start INSIDE the table — right after the header row — so a stray empty
  // paragraph that sits between the section title and the table doesn't steal
  // the first placeholder and shift the whole grid by one column.
  const headerEnd = xml.indexOf("</w:tr>", xml.indexOf("HONORS RECEIVED"));
  const eduStart = headerEnd >= 0 ? headerEnd : xml.indexOf("EDUCATIONAL BACKGROUND");
  const eduEnd = xml.indexOf("Nature of Schooling");
  let region = xml.slice(eduStart, eduEnd);
  let eduIdx = 0;
  // Match empty paragraphs: <w:p ...><w:pPr>...</w:pPr></w:p> with no run between.
  region = region.replace(/(<w:p\b[^>]*>)(<w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/g, (full, open, ppr, close) => {
    if (eduIdx >= EDU_TAGS.length) return full;
    return `${open}${ppr}${makeRun(EDU_TAGS[eduIdx++])}${close}`;
  });
  xml = xml.slice(0, eduStart) + region + xml.slice(eduEnd);

  zip.file("word/document.xml", xml);
  const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(OUT, out);

  console.log(`Text nodes edited: ${textEdited}/${Object.keys(TEXT_EDITS).length}`);
  console.log(`Civil-status symbols replaced: ${symIdx}/${SYM_TAGS.length}`);
  console.log(`Educational cells filled: ${eduIdx}/${EDU_TAGS.length}`);
  console.log(`Template written: ${OUT}`);
}

build();
