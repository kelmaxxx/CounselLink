// src/utils/inventoryReport.js
//
// Builds the printable / "Save as PDF" representation of the official MSU
// DSA "Student Individual Inventory Record Form" (Doc Code: MSU DSA
// Inventory Individual Form No. 1.1, Revision No. 5, Issue Date 04/04/2024),
// reproduced from the reference document ("3.1 2025 INDIVIDUAL
// INVENTORY.docx"/.pdf). Two long-bond-paper (8.5 x 13 in) pages printed
// back-to-back, matching the reference document's natural page break:
//   - Page 1: Personal/Educational Background/Home & Family Background/
//     Health Information.
//   - Page 2: Test Record, Other Information, Disclaimer + signature, then
//     Informed Consent/Confidentiality/Exceptions/Acknowledgment — the
//     latter is only meaningful once the student has e-signed via the
//     Informed Consent page, so it's populated from the `consent`
//     (student_consents) record, not the inventory's own form_data.
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s) => (s ?? "").toString().replace(/[&<>"']/g, (c) => ESC_MAP[c]);

const formatLine = (value) => {
  if (value === null || value === undefined || value === "") return "&nbsp;";
  return escapeHtml(value).replace(/\n/g, "<br/>");
};

const formatDateOnly = (value) => {
  if (!value) return "";
  // Date-only strings (YYYY-MM-DD, e.g. dateOfBirth) must not go through
  // `new Date()` — it parses them as UTC midnight, which shifts a day
  // backwards in any timezone behind UTC once .toLocaleDateString() renders
  // it locally.
  const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    return `${Number(m)}/${Number(d)}/${y}`;
  }
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
};

// Bordered-box checkbox (renders consistently across browsers/printers,
// unlike the ☐/☑ Unicode glyphs).
const cb = (isChecked) =>
  `<span class="ckbox">${isChecked ? "X" : "&nbsp;"}</span>`;

const CIVIL_STATUS_LABELS = [
  ["single", "Single"],
  ["married", "Married"],
  ["separated", "Separated"],
  ["widow", "Widow"],
  ["solo_parent", "Solo Parent"],
];

const MARITAL_LABELS = [
  ["single_parent", "Single Parent"],
  ["married_together", "Married and staying together"],
  ["married_separated", "Married but Separated"],
  ["not_married_living_together", "Not married but living together"],
  ["other", "Other&rsquo;s (Please Specify)"],
];

const FINANCING_LABELS = [
  ["parents", "Parents"],
  ["spouse", "Spouse"],
  ["relatives", "Relatives"],
  ["brother_sister", "Brother/Sister"],
  ["scholarship", "Scholarship"],
  ["self_supporting", "Self-supporting/working"],
];

const INTEREST_LABELS = [
  ["sports", "Sports"],
  ["science", "Science"],
  ["civic", "Civic Awareness/Service"],
  ["arts", "Arts"],
  ["social_studies", "Social Studies"],
  ["religious", "Religious"],
];

const HELP_LABELS = [
  ["family", "Family matters"],
  ["career", "Career concerns"],
  ["relationship", "Relationship problems"],
  ["self", "Self"],
  ["teachers", "Concerns with teachers"],
  ["financial", "Financial matters"],
  ["academic", "Academic concerns"],
  ["health", "Health concerns"],
];

const ADDRESS_TYPE_LABELS = { residential: "Residential", boarding: "Boarding House", dormitory: "Dormitory" };

const SHARED_STYLES = `
    @page { size: 8.5in 13in; margin: 9mm 13mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Times New Roman', Georgia, serif; color: #000; line-height: 1.15; margin: 0; padding: 0; font-size: 9pt; }
    .form-page { page-break-after: always; }
    .form-page:last-child { page-break-after: auto; }
    .ckbox { display: inline-block; width: 9px; height: 9px; border: 1px solid #000; text-align: center; line-height: 9px; font-size: 7.5pt; font-weight: bold; margin-right: 3px; vertical-align: middle; }

    .letterhead-table { width: 100%; border-collapse: collapse; }
    .letterhead-table td { vertical-align: middle; padding: 1px 4px; }
    .letterhead-logo { width: 52px; text-align: center; }
    .letterhead-logo img { height: 44px; }
    .letterhead-text { text-align: center; }
    .letterhead-text .uni { font-weight: 700; font-size: 11pt; letter-spacing: 0.2px; }
    .letterhead-text .sub { font-size: 8.5pt; }
    .letterhead-text .gcs { font-weight: 700; font-size: 8.5pt; margin-top: 1px; }

    .top-row { display: flex; align-items: flex-start; gap: 8px; border-bottom: 2px solid #000; padding-bottom: 3px; margin-bottom: 4px; }
    .top-row .letterhead-table { flex: 1; }
    .doc-control { border-collapse: collapse; font-size: 6.8pt; width: 230px; flex-shrink: 0; }
    .doc-control td { border: 1px solid #000; padding: 1px 3px; }
    .doc-control td.label { font-weight: 700; }

    .form-title { text-align: center; font-weight: 700; font-size: 11pt; text-transform: uppercase; margin: 2px 0 4px; }
    .direction { font-size: 8pt; font-style: italic; margin: 0 0 4px; }
    .section-title { font-weight: 700; background: #d9d9d9; padding: 1.5px 5px; border: 1px solid #000; text-transform: uppercase; font-size: 8.5pt; margin: 4px 0 0; }

    .line { display: flex; flex-wrap: wrap; gap: 1px 14px; margin: 1.5px 0; font-size: 8pt; align-items: baseline; }
    .line .f { display: inline-flex; align-items: baseline; gap: 3px; min-width: 0; }
    .line .f.grow { flex: 1 1 220px; }
    .line .lbl { font-weight: 600; white-space: nowrap; }
    .line .ans { border-bottom: 1px solid #000; padding: 0 3px; min-width: 16px; display: inline-block; }
    .line .f.grow .ans { flex: 1; }

    table.grid-table { width: 100%; border-collapse: collapse; margin: 2px 0 3px; font-size: 7.5pt; }
    table.grid-table th, table.grid-table td { border: 1px solid #000; padding: 1.5px 4px; vertical-align: top; }
    table.grid-table th { background: #eee; font-weight: 700; text-align: center; }

    .picture-box { width: 0.9in; height: 1.05in; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 6.5pt; text-align: center; color: #555; overflow: hidden; flex-shrink: 0; }
    .picture-box img { width: 100%; height: 100%; object-fit: cover; }
    .relative-row { display: flex; gap: 8px; align-items: flex-start; }
    .relative-row > .grow { flex: 1; }

    .check-line { font-size: 8pt; margin: 1.5px 0; }
    .check-inline span.opt { display: inline-block; margin-right: 9px; white-space: nowrap; }

    p.legal { font-size: 8pt; text-align: justify; margin: 3px 0; }
    .notice { color: #c00; font-style: italic; font-size: 8pt; text-align: center; margin: 4px 0; }
    ul.exceptions { font-size: 8pt; margin: 3px 0 3px 16px; padding: 0; }
    ul.exceptions li { margin-bottom: 3px; text-align: justify; }

    .sig-row { display: flex; justify-content: space-between; margin-top: 14px; gap: 24px; }
    .sig-box { flex: 1; text-align: center; }
    .sig-line { border-top: 1px solid #000; padding-top: 2px; font-size: 7.5pt; }
    .sig-name { font-family: 'Brush Script MT', cursive; font-size: 12pt; min-height: 16px; display: block; }
    .date-signed { margin-top: 10px; font-size: 8pt; }
`;

// Renders a row of inline "label: ____answer____" fields, mirroring the
// underline-blank style of the paper form instead of boxed table cells —
// this keeps each page within its long-bond page budget.
function fieldLine(fields) {
  const parts = fields
    .map(({ label, value, grow }) => `<span class="f${grow ? " grow" : ""}"><span class="lbl">${escapeHtml(label)}:</span><span class="ans">${formatLine(value)}</span></span>`)
    .join("");
  return `<div class="line">${parts}</div>`;
}

function renderLetterhead() {
  const msuLogoUrl = `${window.location.origin}/msu-logo.png`;
  const dsaLogoUrl = `${window.location.origin}/dsa-logo.png`;
  const guidanceLogoUrl = `${window.location.origin}/guidance-logo.jpg`;
  return `
  <table class="letterhead-table">
    <tr>
      <td class="letterhead-logo"><img src="${msuLogoUrl}" alt="MSU seal" onerror="this.style.display='none'" /></td>
      <td class="letterhead-text">
        <div class="uni">MINDANAO STATE UNIVERSITY</div>
        <div class="sub">Marawi City</div>
        <div class="sub">DIVISION OF STUDENT AFFAIRS</div>
        <div class="gcs">GUIDANCE AND COUNSELING SECTION</div>
      </td>
      <td class="letterhead-logo"><img src="${dsaLogoUrl}" alt="Division of Student Affairs logo" onerror="this.style.display='none'" /></td>
      <td class="letterhead-logo"><img src="${guidanceLogoUrl}" alt="Guidance and Counseling logo" onerror="this.style.display='none'" /></td>
    </tr>
  </table>`;
}

function renderDocControl({ pageNo, dateLabel }) {
  return `
  <table class="doc-control">
    <tr><td class="label">Doc. Code:</td><td>MSU DSA Inventory Individual Form No. 1.1</td><td class="label">Page No.:</td><td>${escapeHtml(pageNo)}</td></tr>
    <tr><td class="label">Issue Date:</td><td>04/04/2024</td><td class="label">Date:</td><td>${escapeHtml(dateLabel || "")}</td></tr>
    <tr><td class="label">Revision No.:</td><td>5</td><td class="label">Control No.:</td><td>&nbsp;</td></tr>
  </table>`;
}

function renderTopRow(opts) {
  return `
  <div class="top-row">
    ${renderLetterhead()}
    ${renderDocControl(opts)}
  </div>`;
}

function checkboxGroup(options, selectedValues, otherLabel, otherValue) {
  const selected = Array.isArray(selectedValues) ? selectedValues : [];
  const items = options
    .map(([val, label]) => `<span class="opt">${cb(selected.includes(val))}${label}</span>`)
    .join("");
  const otherItem = otherLabel
    ? `<span class="opt">${cb(!!otherValue)}${otherLabel}: ${formatLine(otherValue)}</span>`
    : "";
  return `<div class="check-line check-inline">${items}${otherItem}</div>`;
}

function renderPage1(data, studentProfile) {
  const p = data.personal || {};
  const e = data.educational || {};
  const f = data.family || {};
  const h = data.health || {};
  const addressTypeLabel = ADDRESS_TYPE_LABELS[p.presentAddressType] || "";

  const avatarUrl = studentProfile?.avatarUrl
    ? (studentProfile.avatarUrl.startsWith("http") ? studentProfile.avatarUrl : `${API_BASE}${studentProfile.avatarUrl}`)
    : null;

  return `
  <div class="form-page">
    ${renderTopRow({ pageNo: "Page 1 of 2", dateLabel: formatDateOnly(data.acknowledgment?.dateAcknowledged) })}
    <div class="form-title">Student Individual Inventory Record Form</div>
    <p class="direction"><strong>DIRECTION:</strong> Please complete this inventory as accurately and honestly as you can. The purpose of collecting this information is to be of assistance to you in making choices and decisions. All information which you provide about yourself will be treated with utmost confidentiality.</p>

    <div class="section-title">I. Personal Information</div>
    <div class="relative-row" style="margin-top:3px;">
      <div class="grow">
        ${fieldLine([
          { label: "I.D. Number", value: p.idNumber || studentProfile?.studentId },
          { label: "Sex", value: p.sex },
          { label: "Age", value: p.age },
          { label: "Date of Birth", value: formatDateOnly(p.dateOfBirth) || p.dateOfBirth },
        ])}
        ${fieldLine([
          { label: "Name (Surname, First, Middle)", value: [p.surname, p.firstName, p.middleName].filter(Boolean).join(", "), grow: true },
        ])}
        <div class="check-line check-inline"><strong>Civil Status:</strong> ${CIVIL_STATUS_LABELS.map(([val, label]) => `<span class="opt">${cb(p.civilStatus === val)}${label}</span>`).join("")}</div>
        ${fieldLine([
          { label: "Course", value: p.course, grow: true },
          { label: "Year Level", value: p.yearLevel },
          { label: "A.Y.", value: p.academicYear },
        ])}
        ${fieldLine([
          { label: "Height (m)", value: p.heightM },
          { label: "Weight (kg)", value: p.weightKg },
          { label: "Place of Birth", value: p.placeOfBirth, grow: true },
        ])}
      </div>
      <div class="picture-box">
        ${avatarUrl ? `<img src="${avatarUrl}" alt="1x1 picture" onerror="this.parentNode.textContent='1 x 1 Picture'" />` : "1 x 1<br/>Picture"}
      </div>
    </div>

    ${fieldLine([
      { label: `Present Address${addressTypeLabel ? ` (${addressTypeLabel})` : " (Residential/Boarding House/Dormitory)"}`, value: p.presentAddress, grow: true },
    ])}
    ${fieldLine([
      { label: "Hometown Address", value: p.hometownAddress, grow: true },
      { label: "Email Address", value: p.emailAddress || studentProfile?.email, grow: true },
    ])}
    ${fieldLine([
      { label: "Mobile No.", value: p.mobileNo },
      { label: "GPA", value: p.gpa },
      { label: "Religion", value: p.religion },
      { label: "Citizenship", value: p.citizenship },
      { label: "Tribe", value: p.tribe },
    ])}
    ${fieldLine([
      { label: "If working, name and address of employer", value: p.employerNameAddress, grow: true },
    ])}
    ${fieldLine([
      { label: "Emergency Contact", value: p.emergencyName, grow: true },
      { label: "Contact No.", value: p.emergencyContactNo },
      { label: "Relationship", value: p.emergencyRelationship },
    ])}
    ${fieldLine([
      { label: "Emergency Contact Address", value: p.emergencyAddress, grow: true },
    ])}

    <div class="section-title">II. Educational Background</div>
    <table class="grid-table">
      <thead>
        <tr><th>Level</th><th>School Graduated</th><th>School Address</th><th>Public/Private</th><th>Year Graduated</th><th>Honors Received/Special Awards</th></tr>
      </thead>
      <tbody>
        ${(e.background || []).map((b) => `
        <tr>
          <td>${formatLine(b.level)}</td>
          <td>${formatLine(b.schoolGraduated)}</td>
          <td>${formatLine(b.schoolAddress)}</td>
          <td style="text-align:center;">${formatLine(b.publicPrivate)}</td>
          <td style="text-align:center;">${formatLine(b.yearGraduated)}</td>
          <td>${formatLine(b.honors)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div class="check-line check-inline">
      <strong>Nature of Schooling:</strong>
      <span class="opt">${cb(e.natureOfSchooling === "continuous")}Continuous</span>
      <span class="opt">${cb(e.natureOfSchooling === "interrupted")}Interrupted, why? ${formatLine(e.interruptedReason)}</span>
    </div>

    <div class="section-title">III. Home and Family Background</div>
    ${fieldLine([{ label: "Name of Father", value: f.father?.name, grow: true }, { label: "Age", value: f.father?.age }])}
    <div class="check-line check-inline">${cb(f.father?.livingStatus === "living")}Living&nbsp;&nbsp;${cb(f.father?.livingStatus === "deceased")}Deceased</div>
    ${fieldLine([{ label: "Educational Attainment", value: f.father?.educationalAttainment, grow: true }, { label: "Occupation", value: f.father?.occupation, grow: true }])}
    ${fieldLine([{ label: "Name of Mother", value: f.mother?.name, grow: true }, { label: "Age", value: f.mother?.age }])}
    <div class="check-line check-inline">${cb(f.mother?.livingStatus === "living")}Living&nbsp;&nbsp;${cb(f.mother?.livingStatus === "deceased")}Deceased</div>
    ${fieldLine([{ label: "Educational Attainment", value: f.mother?.educationalAttainment, grow: true }, { label: "Occupation", value: f.mother?.occupation, grow: true }])}
    ${fieldLine([{ label: "Name of Guardian (if any)", value: f.guardian?.name, grow: true }, { label: "Age", value: f.guardian?.age }])}
    ${fieldLine([{ label: "Educational Attainment", value: f.guardian?.educationalAttainment, grow: true }, { label: "Occupation", value: f.guardian?.occupation, grow: true }])}

    <div class="check-line"><strong>Parents&rsquo; Marital Relationship:</strong> (Please Check)</div>
    <div class="check-line check-inline">${MARITAL_LABELS.map(([val, label]) => `<span class="opt">${cb(f.parentsMaritalStatus === val)}${label}${val === "other" ? ` ${formatLine(f.parentsMaritalOther)}` : ""}</span>`).join("")}</div>

    <div class="check-line">
      Number of children in the family including yourself: <strong>${formatLine(f.siblingsTotal)}</strong>
      &nbsp;&nbsp;Number of Brothers: <strong>${formatLine(f.brothersCount)}</strong>
      &nbsp;&nbsp;Number of Sisters: <strong>${formatLine(f.sistersCount)}</strong>
    </div>

    <div class="check-line"><strong>Who finances your schooling?</strong></div>
    ${checkboxGroup(FINANCING_LABELS, f.financingSources, "Others, please specify", f.financingOther)}

    <div class="section-title">IV. Health Information</div>
    <div class="check-line">1. Do you have problems with? (Please Check)</div>
    <div class="check-line check-inline">
      <span class="opt">${cb(h.problems?.vision)}Vision</span>
      <span class="opt">${cb(h.problems?.speech)}Speech</span>
      <span class="opt">${cb(h.problems?.hearing)}Hearing</span>
      <span class="opt">${cb(h.problems?.generalHealth)}General Health</span>
      <span class="opt">${cb(h.problems?.physicalDisability)}Physical Disability</span>
    </div>
    <div class="check-line" style="font-size:8.3pt;">If yes, please specify &mdash;
      Vision: ${formatLine(h.problems?.visionDetail)}; Speech: ${formatLine(h.problems?.speechDetail)}; Hearing: ${formatLine(h.problems?.hearingDetail)};
      General Health: ${formatLine(h.problems?.generalHealthDetail)}; Physical Disability: ${formatLine(h.problems?.physicalDisabilityDetail)}
    </div>
    <div class="check-line">2. Have you been diagnosed of certain illnesses before? If yes, please specify: ${formatLine(h.diagnosedIllnessesNote)}</div>
    <div class="check-line">3. Have you taken any psychological tests before? ${cb(!!h.psychologicalTestsTaken)}Yes&nbsp;&nbsp;${cb(!h.psychologicalTestsTaken)}No</div>
  </div>`;
}

// Page 2 picks up exactly where the paper form's natural page break falls —
// starting at Test Record — and carries everything after it (Other Info,
// Disclaimer + signature, then the Informed Consent material) through to
// the end, matching the reference document's two-page layout exactly.
function renderPage2(data, consent) {
  const o = data.other || {};
  const testRows = (data.testRecord || []).length ? data.testRecord : [{}, {}, {}];
  const typedName = consent?.eConsentTypedName || "";
  const signedAt = consent?.eConsentSignedAt && !consent?.revokedAt ? formatDateOnly(consent.eConsentSignedAt) : "";

  return `
  <div class="form-page">
    ${renderTopRow({ pageNo: "Page 2 of 2", dateLabel: signedAt || formatDateOnly(data.acknowledgment?.dateAcknowledged) })}

    <div class="section-title">Test Record</div>
    <table class="grid-table">
      <thead><tr><th>Date</th><th>Kind of Test</th><th>Score</th><th>Rank</th></tr></thead>
      <tbody>
        ${testRows.map((r) => `
        <tr>
          <td>${formatLine(formatDateOnly(r.date) || r.date)}</td>
          <td>${formatLine(r.kindOfTest)}</td>
          <td>${formatLine(r.score)}</td>
          <td>${formatLine(r.rank)}</td>
        </tr>`).join("")}
      </tbody>
    </table>

    <div class="section-title">V. Other Information</div>
    <div class="check-line">1. Indicate the interest group to which you are more inclined to. (Please Check)</div>
    ${checkboxGroup(INTEREST_LABELS, o.interestGroups, "Others", o.interestGroupsOther)}
    <div class="check-line">2. Have you consulted/been sent to see the Guidance Counselor before? ${cb(!!o.consultedBefore)}Yes&nbsp;&nbsp;${cb(!o.consultedBefore)}No</div>
    <div class="check-line">If yes, what was/were the reason(s)? ${formatLine(o.consultedReason)}</div>
    <div class="check-line">3. How may your Guidance Counselor help you? (Please Check)</div>
    ${checkboxGroup(HELP_LABELS, o.helpNeeded, "Others, please specify", o.helpNeededOther)}

    <p class="legal"><strong>DISCLAIMER</strong>: I hereby authorize the Guidance and Counseling Section of Division of Student Affairs to collect data indicated herein for Individual Inventory and documentation purposes only. I understand that my personal information is protected by RA 10173, Data Privacy Act of 2012 and that the data collected will not be shared to other entities other than the purpose stated.</p>

    <div class="sig-row">
      <div class="sig-box">
        <span class="sig-name">${formatLine(data.acknowledgment?.studentPrintedName)}</span>
        <div class="sig-line">Student&rsquo;s Printed Name</div>
      </div>
      <div class="sig-box">
        <span class="sig-name">${data.acknowledgment?.studentPrintedName ? escapeHtml(data.acknowledgment.studentPrintedName) : "&nbsp;"}</span>
        <div class="sig-line">Student&rsquo;s Signature</div>
      </div>
    </div>

    <p class="notice">(Important notice: Proceed to this section only if you intend to undergo counseling and listening session with a Guidance Services Specialist)</p>

    <div class="section-title">Informed Consent</div>
    <p class="legal">Counseling is a confidential process designed to help you address your concerns, come to a greater understanding of yourself, and learn effective personal and interpersonal coping strategies. It involves a relationship between you and a trained counselor who has the desire and willingness to help you accomplish your individual goals. Counseling involves sharing sensitive, personal, and private information that may at times be distressing. During the course of counseling, there may be periods of increased anxiety or confusion. The outcome of counseling is often positive; however, the level of satisfaction for any individual is not predictable. Your counselor is available to support you throughout the counseling process.</p>

    <p class="legal"><strong>CONFIDENTIALITY:</strong> All interactions with Counseling Services, including scheduling of or attendance at appointments, content of your sessions, progress in counseling, and your records are confidential. No record of counseling is contained in any academic, educational, or job placement file. You may request in writing to release specific information about your counseling to persons you designate.</p>

    <p class="legal"><strong>EXCEPTIONS TO CONFIDENTIALITY:</strong></p>
    <ul class="exceptions">
      <li>The counseling staff works as a team. Your counselor may consult with other counseling staff to provide the best possible care. These consultations are for professional and training purposes.</li>
      <li>If there is evidence of clear and imminent danger of harm to self and/or others, a counselor is legally required to report this information to the authorities responsible for ensuring safety.</li>
      <li>Philippine law requires that staff of Counseling Services who learn of, or strongly suspect, physical or sexual abuse or neglect of any person under 18 years of age must report this information to county child protection services.</li>
      <li>A court order, issued by a judge, may require the Counseling Services staff to release information contained in records and/or require a counselor to testify in a court hearing.</li>
      <li>There is no fee for counseling services. If you are referred off campus to health, mental health, or substance abuse professionals you are responsible for their charges.</li>
    </ul>

    <div class="section-title">Acknowledgment</div>
    <p class="legal">I acknowledge having been informed of my rights and responsibilities as a student receiving counseling services at Division of Student Affairs, Guidance and Counseling Section, Mindanao State University, Marawi City.</p>
    <p class="legal">I understand the risks and benefits of guidance and counseling services, the nature, and limits of confidentiality.</p>
    <p class="legal">By signing below, I agree to the terms and conditions of counseling.</p>

    <div class="sig-row">
      <div class="sig-box">
        <span class="sig-name">${formatLine(typedName)}</span>
        <div class="sig-line">Student&rsquo;s Printed Name</div>
      </div>
      <div class="sig-box">
        <span class="sig-name">${typedName ? escapeHtml(typedName) : "&nbsp;"}</span>
        <div class="sig-line">Student&rsquo;s Signature</div>
      </div>
    </div>
    <div class="date-signed">Date Signed: ${formatLine(signedAt)}</div>
  </div>`;
}

export function buildInventoryHTML(inventoryData, studentProfile = {}, consent = null) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student Individual Inventory Record Form</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  ${renderPage1(inventoryData, studentProfile)}
  ${renderPage2(inventoryData, consent)}
</body>
</html>`;
}

function safeFileBase(studentName, idNumber) {
  const name = (studentName || idNumber || "student").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  return `inventory_form_${name}`.toLowerCase();
}

// "Print Form" — opens the browser print dialog (lets the counselor/student
// pick a physical printer or "Save as PDF" themselves).
export function printInventoryForm(inventoryData, studentProfile = {}, consent = null) {
  const html = buildInventoryHTML(inventoryData, studentProfile, consent);
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site to print the form.");
    return;
  }
  win.document.title = safeFileBase(studentProfile?.name, inventoryData?.personal?.idNumber);
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      // user cancelled
    }
  }, 250);
}

// Kept as an alias for any older call sites/imports.
export const downloadInventoryAsPdf = printInventoryForm;

// "Export PDF" — renders page 1 and page 2 into a hidden iframe, captures
// each as its own canvas, and saves an actual two-page .pdf file straight
// to disk — no print dialog in the way.
//
// Each form is captured and placed on its own jsPDF page deliberately,
// instead of rendering both as one tall canvas and letting a page-break
// calculation slice it: html2canvas's text layout doesn't always match the
// pixel height the same CSS produces in the browser's native print engine,
// so a height-based split is liable to spill onto a 3rd, mostly-blank page.
// One canvas per page is exact by construction — always 2 pages.
//
// The iframe (rather than an off-screen <div>) matters too: html2canvas
// clones and rasterizes starting at (0,0). A <div> pushed off-screen via
// `top: -10000px` sits at a *negative* coordinate in the parent document,
// outside any capturable canvas region, and silently renders as a 0-height
// image. An iframe's contentDocument has its own (0,0)-origin coordinate
// system regardless of where the iframe sits in the parent page.
export async function exportInventoryAsPdfFile(inventoryData, studentProfile = {}, consent = null) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const PAGE_PX_WIDTH = 816; // 8.5in @ 96dpi
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "0";
  iframe.style.width = `${PAGE_PX_WIDTH}px`;
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>${SHARED_STYLES} html,body{margin:0;background:#fff;}</style></head><body>${renderPage1(inventoryData, studentProfile)}${renderPage2(inventoryData, consent)}</body></html>`);
  doc.close();

  // Let layout (and the letterhead logo <img> tags) settle before capture.
  await new Promise((resolve) => {
    const imgs = Array.from(doc.images);
    if (!imgs.length) return resolve();
    let pending = imgs.length;
    const done = () => { if (--pending <= 0) resolve(); };
    imgs.forEach((img) => (img.complete ? done() : (img.addEventListener("load", done), img.addEventListener("error", done))));
    setTimeout(resolve, 1500);
  });

  try {
    const pageEls = Array.from(doc.querySelectorAll(".form-page"));
    const pdf = new jsPDF({ unit: "in", format: [8.5, 13], orientation: "portrait" });

    for (let i = 0; i < pageEls.length; i++) {
      const canvas = await html2canvas(pageEls[i], { scale: 2, useCORS: true, windowWidth: doc.body.scrollWidth });
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      if (i > 0) pdf.addPage([8.5, 13], "portrait");
      // Fit the captured page to the full 8.5x13 sheet (each .form-page is
      // already laid out for exactly one long-bond page).
      const imgHeightIn = (canvas.height / canvas.width) * 8.5;
      pdf.addImage(imgData, "JPEG", 0, 0, 8.5, Math.min(imgHeightIn, 13));
    }

    pdf.save(`${safeFileBase(studentProfile?.name, inventoryData?.personal?.idNumber)}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}
