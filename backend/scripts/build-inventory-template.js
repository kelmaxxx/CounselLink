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
//
// TWO kinds of edit are applied to the source's text nodes, keyed by node index:
//
//   * TEXT_EDITS  — a whole <w:t> string replacement. Used for CHECKBOX markers
//     and static label text (e.g. "{natContinuous}", "Have you taken..."). These
//     have no fill-in "line" to preserve.
//
//   * ARRAY_EDITS — rebuilds the enclosing <w:r> RUN as a sequence of runs so that
//     each fill-in blank becomes a fixed-width UNDERLINED field. The value (padded
//     to FIELD_WIDTHS by the mapper) renders on a constant-length underline, so the
//     printed "lines" never move and the form stays locked to 2 pages. Labels
//     between fields keep their original run formatting.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "templates", "source", "individual-inventory-source.docx");
const OUT = path.join(__dirname, "..", "templates", "individual-inventory-template.docx");

// --- Whole-<w:t> replacements (checkboxes + static labels), keyed by node index.
const TEXT_EDITS = {
  // 1x1 Picture box replacement
  29: "{%studentAvatar}",
  30: "{%studentAvatar}",

  // I. PERSONAL INFORMATION — leftover spacer/label nodes around split lines.
  53: "): ",
  60: "",
  61: "",
  63: " ",
  71: "Address: ",

  // II. EDUCATIONAL BACKGROUND — Nature of Schooling (split bracket boxes)
  87: "   ",
  88: "{natContinuous}",
  89: "",
  90: " Continuous",
  91: "",
  92: "{natInterrupted}",

  // III. HOME AND FAMILY BACKGROUND — living/deceased boxes
  96: "{fatherLiving}",
  98: "Living  {fatherDeceased}",
  102: "{motherLiving}",
  104: "Living  {motherDeceased}",
  // Parents' Marital Relationship (single-node [  ] boxes)
  110: "{pmSingleParent}",
  112: "{pmMarriedTogether}",
  114: "{pmMarriedSeparated}",
  116: "{pmNotMarriedLiving}",
  118: "{pmOther}",
  // Who finances your schooling?
  122: "{finParents}",
  124: "{finSpouse}",
  126: "{finRelatives}",
  128: "{finBrotherSister}",
  130: "{finScholarship}",
  132: "{finSelfSupporting}",
  134: "{finOther}",

  // IV. HEALTH INFORMATION — problem boxes + psychological test yes/no
  138: "{hVision}",
  140: "{hSpeech}",
  142: "{hHearing}",
  144: "{hGeneralHealth}",
  146: "   {hPhysical}",
  155: "Have you taken any psychological tests before?  {psychYes} ",
  157: "{psychNo} No",

  // OTHER INFORMATION — interest groups + consulted yes/no + help boxes
  178: "{igSports} Sports",
  179: "{igScience} Science",
  180: "{igCivic} Civic Awareness/Service",
  181: "{igArts} Arts",
  182: "{igSocial} Social Studies",
  183: "{igOther} Others",
  184: "{igReligious} Religious",
  185: "Have you consulted/been sent to see the Guidance Counselor before?  {consultedYes} ",
  187: "{consultedNo} No",
  191: "{hnFamily} Family matters",
  192: "{hnCareer} Career concerns ",
  195: "{hnRelationship} Relationship problems",
  196: "{hnSelf} Self",
  197: "{hnTeachers} Concerns with teachers",
  198: "{hnFinancial} Financial matters",
  199: "{hnAcademic} Academic concerns",
  200: "{hnHealth} Health concerns",
};

// --- Run rebuilds (fill-in blanks → fixed-width underlined fields), by node index.
// Segment forms:  "text" = label run · {f} = underlined field run "{f}" ·
// {tab:true} = a preserved <w:tab/> · {u:n} = a static run of n underscores
// (wet-sign lines that are never filled by data).
const F = (f) => ({ f });
const ARRAY_EDITS = {
  // I. PERSONAL INFORMATION
  33: [" ", F("idNumber")],
  // Name splits into three segments aligned to the (Surname)(First)(Middle) guide.
  34: ["Name: ", F("nameSurname"), F("nameFirst"), F("nameMiddle"), "Sex: ", F("sex"), " Age: ", F("age")],
  50: ["Course: ", F("course"), " Year Level: ", F("yearLevel")],
  51: [{ tab: true }, "A.Y. ", F("academicYear"), "Date of Birth: ", F("dateOfBirth")],
  54: [F("heightM"), " Weight: ", F("weightKg"), " Place of Birth: ", F("placeOfBirth")],
  62: [F("presentAddress")],
  65: [" Address: ", F("emailAddress")],
  66: ["Hometown Address: ", F("hometownAddress")],
  67: ["Mobile No.: ", F("mobileNo")],
  68: ["Grade Point Average: ", F("gpa"), " Religion: ", F("religion"), " Citizenship: ", F("citizenship"), " Tribe; ", F("tribe")],
  69: ["If working, please indicate the name and address of employer: ", F("employerNameAddress")],
  70: ["Person to be contacted in case of emergency: ", F("emergencyName"), " Contact No. ", F("emergencyContactNo")],
  72: [F("emergencyAddress"), " Relationship: ", F("emergencyRelationship")],

  // II. Nature of Schooling — interrupted reason blank
  93: [" Interrupted, why? ", F("interruptedReason"), "  "],

  // III. HOME AND FAMILY BACKGROUND
  95: ["Name of Father: ", F("fatherName"), " Age: ", F("fatherAge"), " "],
  100: ["Educational Attainment: ", F("fatherEduc"), " Occupation: ", F("fatherOccupation")],
  101: ["Name of Mother: ", F("motherName"), " Age: ", F("motherAge"), " "],
  106: ["Educational Attainment: ", F("motherEduc"), " Occupation: ", F("motherOccupation")],
  107: ["Name of Guardian (If any): ", F("guardianName"), " Age: ", F("guardianAge"), " "],
  108: ["Educational Attainment: ", F("guardianEduc"), " Occupation: ", F("guardianOccupation")],
  119: [" Other’s (Please Specify) ", F("parentsMaritalOther")],
  120: ["Number of children in the family including yourself: ", F("siblingsTotal"), " Number of Brothers: ", F("brothersCount"), " Number of Sisters: ", F("sistersCount")],
  135: [" Others, please specify: ", F("financingOther")],

  // IV. HEALTH INFORMATION — "if yes, specify" details + diagnosed illnesses note
  152: [F("visionDetail"), "    ", F("speechDetail"), "   ", F("hearingDetail"), "  ", F("generalHealthDetail")],
  154: ["                ", F("diagnosedIllnessesNote")],

  // TEST RECORD (3 rows x 4 cells)
  164: [F("tr0Date")], 165: [F("tr0Kind")], 166: [F("tr0Score")], 167: [F("tr0Rank")],
  168: [F("tr1Date")], 169: [F("tr1Kind")], 170: [F("tr1Score")], 171: [F("tr1Rank")],
  172: [F("tr2Date")], 173: [F("tr2Kind")], 174: [F("tr2Score")], 175: [F("tr2Rank")],

  // OTHER INFORMATION — consulted reason + help "others" blank
  189: [F("consultedReason")],
  194: [" ", F("helpNeededOther")],

  // ACKNOWLEDGMENT — printed-name field, then a spacer and the static wet-sign line.
  205: [F("studentPrintedName"), "        ", { u: 39 }],
  234: [F("studentPrintedName"), "        ", { u: 39 }],
  236: ["Date Signed: ", F("dateAcknowledged")],
};

// Civil Status: the 5 Wingdings-2 checkbox symbols, in document order.
const SYM_TAGS = ["{csSingle}", "{csMarried}", "{csSeparated}", "{csWidow}", "{csSoloParent}"];

// Educational background table: 25 empty data cells (5 levels x 5 columns),
// row-major. Levels in doc order: Elementary, JHS, Vocational, SHS, College.
const EDU_TAGS = [];
for (let i = 0; i < 5; i++) {
  EDU_TAGS.push(`{edu${i}School}`, `{edu${i}Address}`, `{edu${i}PublicPrivate}`, `{edu${i}YearGraduated}`, `{edu${i}Honors}`);
}

// Single run helper — Century 8 pt, same as the source document.
const RUN_RPR = `<w:rPr><w:rFonts w:ascii="Century" w:hAnsi="Century"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>`;
const makeRun = (text) => `<w:r>${RUN_RPR}<w:t xml:space="preserve">${text}</w:t></w:r>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Adds single-underline to an rPr element (or builds a default underlined rPr).
const underlineRpr = (rpr) => {
  if (!rpr) return `<w:rPr><w:rFonts w:ascii="Century" w:hAnsi="Century"/><w:sz w:val="16"/><w:szCs w:val="16"/><w:u w:val="single"/></w:rPr>`;
  if (rpr.includes("<w:u ")) return rpr;
  return rpr.replace("</w:rPr>", "<w:u w:val=\"single\"/></w:rPr>");
};

// Turns an ARRAY_EDITS segment list into a run sequence, inheriting the original
// run's rPr for labels and adding underline for {f} field runs.
function segmentsToRuns(segments, baseRpr) {
  const labelRpr = baseRpr || RUN_RPR;
  const fieldRpr = underlineRpr(baseRpr);
  return segments
    .map((seg) => {
      if (typeof seg === "string") return `<w:r>${labelRpr}<w:t xml:space="preserve">${esc(seg)}</w:t></w:r>`;
      if (seg.tab) return `<w:r>${labelRpr}<w:tab/></w:r>`;
      if (seg.u) return `<w:r>${labelRpr}<w:t xml:space="preserve">${"_".repeat(seg.u)}</w:t></w:r>`;
      if (seg.f) return `<w:r>${fieldRpr}<w:t xml:space="preserve">{${seg.f}}</w:t></w:r>`;
      return "";
    })
    .join("");
}

function build() {
  const bin = fs.readFileSync(SRC, "binary");
  const zip = new PizZip(bin);
  let xml = zip.file("word/document.xml").asText();

  // 1) Node-index pass: walk every <w:t> in document order and apply either a
  // string replacement (TEXT_EDITS) or a run rebuild (ARRAY_EDITS). Positions are
  // computed on the original xml, then spliced high-to-low so offsets stay valid.
  // This runs FIRST, before any step that adds new <w:t> nodes (which would shift
  // the indices the edit maps rely on).
  const tRe = /<w:t(?: xml:space="preserve")?>[\s\S]*?<\/w:t>/g;
  const edits = [];
  let m;
  let idx = 0;
  let textEdited = 0;
  let runsRebuilt = 0;
  while ((m = tRe.exec(xml)) !== null) {
    const i = idx++;
    const tStart = m.index;
    const tEnd = m.index + m[0].length;
    if (ARRAY_EDITS[i]) {
      // Replace the whole enclosing <w:r> run.
      const runStart = Math.max(xml.lastIndexOf("<w:r>", tStart), xml.lastIndexOf("<w:r ", tStart));
      const runEnd = xml.indexOf("</w:r>", tEnd) + "</w:r>".length;
      const runXml = xml.slice(runStart, runEnd);
      const rprMatch = runXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
      edits.push({ start: runStart, end: runEnd, text: segmentsToRuns(ARRAY_EDITS[i], rprMatch ? rprMatch[0] : "") });
      runsRebuilt++;
    } else if (Object.prototype.hasOwnProperty.call(TEXT_EDITS, i)) {
      edits.push({ start: tStart, end: tEnd, text: `<w:t xml:space="preserve">${TEXT_EDITS[i]}</w:t>` });
      textEdited++;
    }
  }
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) xml = xml.slice(0, e.start) + e.text + xml.slice(e.end);

  // 2a) Pin both tables to a FIXED layout so injected data can never resize
  // columns — cells keep their tblGrid widths and long text wraps inside the
  // cell instead of stretching the grid. (tblLayout must sit after tblW and
  // before tblLook in the OOXML schema order.)
  let tblFixed = 0;
  xml = xml.replace(/(<w:tblW\b[^>]*\/>)(?!<w:tblLayout)/g, (mm, tblW) => {
    tblFixed++;
    return `${tblW}<w:tblLayout w:type="fixed"/>`;
  });

  // 2) Replace the 5 Civil Status Wingdings symbols with placeholder runs.
  let symIdx = 0;
  xml = xml.replace(/<w:sym w:font="Wingdings 2" w:char="00A3"\/>/g, () => makeRun(SYM_TAGS[symIdx++] ?? ""));

  // 3) Fill the 25 empty data cells of the Educational Background table.
  const headerEnd = xml.indexOf("</w:tr>", xml.indexOf("HONORS RECEIVED"));
  const eduStart = headerEnd >= 0 ? headerEnd : xml.indexOf("EDUCATIONAL BACKGROUND");
  const eduEnd = xml.indexOf("Nature of Schooling");
  let region = xml.slice(eduStart, eduEnd);
  let eduIdx = 0;
  region = region.replace(/(<w:p\b[^>]*>)(<w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/g, (full, open, ppr, close) => {
    if (eduIdx >= EDU_TAGS.length) return full;
    return `${open}${ppr}${makeRun(EDU_TAGS[eduIdx++])}${close}`;
  });
  xml = xml.slice(0, eduStart) + region + xml.slice(eduEnd);

  // 4) Insert a signature-image paragraph directly ABOVE each of the two
  // student signature lines (matched by the {studentPrintedName} field run).
  const SIG_SPACER = "                                                                                          ";
  const makePara = (...texts) => `<w:p>${texts.map(makeRun).join("")}</w:p>`;
  const sigPara = () => makePara(SIG_SPACER, `{%studentSignature}`);
  let studentSigLines = 0;
  let searchFrom = 0;
  for (;;) {
    const nameAt = xml.indexOf("{studentPrintedName}", searchFrom);
    if (nameAt < 0) break;
    const paraStart = xml.lastIndexOf("<w:p ", nameAt) >= xml.lastIndexOf("<w:p>", nameAt)
      ? xml.lastIndexOf("<w:p ", nameAt)
      : xml.lastIndexOf("<w:p>", nameAt);
    if (paraStart < 0) break;
    const inserted = sigPara();
    xml = xml.slice(0, paraStart) + inserted + xml.slice(paraStart);
    studentSigLines++;
    searchFrom = nameAt + inserted.length + "{studentPrintedName}".length;
  }

  // 5) Append the counselor attestation block OUTSIDE (after) the table that
  // contains the student acknowledgment section. The "Date Signed" paragraph is
  // inside a table cell — inserting inside would crowd the table layout and push
  // content onto a 3rd page. Instead, find the </w:tbl> that closes AFTER the
  // "Date Signed" line and insert the block at body-level, right after it.
  const dateSignedAt = xml.indexOf("Date Signed: ");
  let counselorBlockAdded = 0;
  if (dateSignedAt >= 0) {
    // Find the </w:tbl> that closes the table containing "Date Signed".
    const tblCloseAt = xml.indexOf("</w:tbl>", dateSignedAt);
    if (tblCloseAt >= 0) {
      const insertAt = tblCloseAt + "</w:tbl>".length;
      // Counselor attestation: image above, then printed-name + wet-sign line,
      // then the caption. Inserted at body level so it never disturbs the table.
      const block =
        makePara("Attested by:") +
        makePara(SIG_SPACER, "{%counselorSignature}") +
        makePara("{counselorPrintedName}", "        ", "____________________________________________________") +
        makePara("Guidance Counselor's Signature over Printed Name");
      xml = xml.slice(0, insertAt) + block + xml.slice(insertAt);
      counselorBlockAdded = 1;
    }
  }

  // 6) The added signature/attestation lines fill page 2 exactly; drop EVERY empty
  // paragraph between the counselor caption and the body-final section mark —
  // including the trailing one that Word leaves before <w:sectPr>. The last
  // section's sectPr is a direct child of <w:body>, so it needs no host paragraph;
  // removing the empty trailer keeps the form locked to 2 pages instead of spilling
  // a blank page 3.
  const captionAt = xml.indexOf("Guidance Counselor's Signature over Printed Name");
  if (captionAt >= 0) {
    const blockEnd = xml.indexOf("</w:p>", captionAt) + "</w:p>".length;
    const finalSect = xml.indexOf("<w:sectPr", blockEnd);
    if (finalSect >= 0) {
      const between = xml.slice(blockEnd, finalSect).replace(/<w:p\b[^>]*>(?:<w:pPr>[\s\S]*?<\/w:pPr>)?<\/w:p>/g, "");
      xml = xml.slice(0, blockEnd) + between + xml.slice(finalSect);
    }
  }

  // 7) Force a page break BEFORE the "TEST RECORD" heading so that section
  //    always starts on page 2, giving exactly 2 printed pages regardless of
  //    how much content is on page 1.
  //    Strategy: find the paragraph that contains "TEST RECORD" and inject
  //    <w:pageBreakBefore/> into its <w:pPr> (creating one if absent).
  let pageBreakAdded = 0;
  const testRecordIdx = xml.indexOf("TEST RECORD");
  if (testRecordIdx >= 0) {
    // Walk back to the enclosing paragraph.
    const pStart = Math.max(
      xml.lastIndexOf("<w:p ", testRecordIdx),
      xml.lastIndexOf("<w:p>", testRecordIdx)
    );
    if (pStart >= 0) {
      const pEnd = xml.indexOf("</w:p>", pStart);
      if (pEnd >= 0) {
        const para = xml.slice(pStart, pEnd + "</w:p>".length);
        let newPara;
        if (para.includes("<w:pPr>")) {
          // Inject into existing pPr (right after opening tag).
          newPara = para.replace("<w:pPr>", "<w:pPr><w:pageBreakBefore/>");
        } else {
          // No pPr yet — create one right after the opening <w:p> or <w:p ...>.
          const tagEnd = para.indexOf(">") + 1;
          newPara = para.slice(0, tagEnd) + "<w:pPr><w:pageBreakBefore/></w:pPr>" + para.slice(tagEnd);
        }
        xml = xml.slice(0, pStart) + newPara + xml.slice(pEnd + "</w:p>".length);
        pageBreakAdded = 1;
      }
    }
  }

  zip.file("word/document.xml", xml);
  const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(OUT, out);

  console.log(`Tables pinned to fixed layout: ${tblFixed}`);
  console.log(`Text nodes edited: ${textEdited}/${Object.keys(TEXT_EDITS).length}`);
  console.log(`Field runs rebuilt: ${runsRebuilt}/${Object.keys(ARRAY_EDITS).length}`);
  console.log(`Civil-status symbols replaced: ${symIdx}/${SYM_TAGS.length}`);
  console.log(`Educational cells filled: ${eduIdx}/${EDU_TAGS.length}`);
  console.log(`Student signature lines added: ${studentSigLines}/2`);
  console.log(`Counselor attestation block added: ${counselorBlockAdded}/1`);
  console.log(`TEST RECORD page break added: ${pageBreakAdded}/1`);
  console.log(`Template written: ${OUT}`);
}

build();
