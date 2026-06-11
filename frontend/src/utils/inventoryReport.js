// src/utils/inventoryReport.js

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s) => (s ?? "").toString().replace(/[&<>"']/g, (c) => ESC_MAP[c]);

const formatLine = (value) => {
  if (value === null || value === undefined || value === "") return "&nbsp;";
  return escapeHtml(value).replace(/\n/g, "<br/>");
};

// Checkbox helper for the print layout
const cb = (isChecked) => 
  `<span style="display:inline-block; width:12px; height:12px; border:1px solid #000; text-align:center; line-height:12px; font-size:10px; margin-right:4px;">${isChecked ? 'X' : '&nbsp;'}</span>`;

export function buildInventoryHTML(inventoryData, studentProfile = {}) {
  const p = inventoryData?.personal || {};
  const e = inventoryData?.educational || {};
  const f = inventoryData?.family || {};
  const h = inventoryData?.health || {};

  // Construct absolute paths for logos so they load in the print dialog
  const msuLogoUrl = `${window.location.origin}/msu-logo.png`;
  const dsaLogoUrl = `${window.location.origin}/dsa-logo.png`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student Individual Inventory Record</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { 
      font-family: Arial, sans-serif; 
      color: #000; 
      line-height: 1.2; 
      padding: 0;
      margin: 0;
      font-size: 10pt;
    }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .border-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .border-table th, .border-table td { border: 1px solid #000; padding: 4px; vertical-align: top; }
    
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 2px solid #000; }
    .header-table td { padding: 4px; border: 1px solid #000; vertical-align: middle; }
    
    .section-title { font-weight: bold; background: #e0e0e0; padding: 4px; border: 1px solid #000; text-transform: uppercase; margin-bottom: 0; font-size: 11pt; }
    .grid-row { display: flex; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; }
    .col { border-right: 1px solid #000; padding: 4px; flex: 1; }
    .col:last-child { border-right: none; }
    .label { font-size: 8pt; display: block; margin-bottom: 2px; }
    .value { font-weight: bold; min-height: 14px; text-transform: uppercase; font-size: 9pt; }

    .picture-box { width: 1.5in; height: 1.5in; border: 1px solid #000; position: absolute; right: 0; top: 0; display: flex; align-items: center; justify-content: center; font-size: 8pt; text-align: center; color: #666; }
    .relative-container { position: relative; }
    
    h1 { font-size: 14pt; margin: 0; text-align: center; text-transform: uppercase; font-weight: bold; }
    h2 { font-size: 11pt; margin: 0; text-align: center; }
    h3 { font-size: 10pt; margin: 0; text-align: center; font-weight: normal; }
    
    /* Utility classes for flex rows */
    .flex { display: flex; }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .flex-3 { flex: 3; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <table class="header-table">
    <tr>
      <td width="15%" class="text-center" rowspan="3">
        <img src="${msuLogoUrl}" alt="MSU Logo" style="width:60px; height:60px;" onerror="this.style.display='none'"/>
      </td>
      <td width="70%" class="text-center" rowspan="3">
        <h3>Republic of the Philippines</h3>
        <h2>MINDANAO STATE UNIVERSITY</h2>
        <h3>General Santos City</h3>
        <h1>STUDENT INDIVIDUAL INVENTORY RECORD FORM</h1>
      </td>
      <td width="15%" style="font-size:8pt;">
        Doc. Code: <b>MSU-DSA-F01</b>
      </td>
    </tr>
    <tr>
      <td style="font-size:8pt;">Rev. No.: <b>05</b></td>
    </tr>
    <tr>
      <td style="font-size:8pt;">Effective Date: <b>Aug 2023</b></td>
    </tr>
  </table>

  <!-- I. PERSONAL INFORMATION -->
  <div class="relative-container">
    <div class="section-title">I. PERSONAL INFORMATION</div>
    
    <div style="width: calc(100% - 1.6in); display: inline-block;">
      <div class="grid-row">
        <div class="col flex-2">
          <span class="label">Course</span>
          <div class="value">${formatLine(p.course)}</div>
        </div>
        <div class="col flex-1">
          <span class="label">Year Level</span>
          <div class="value">${formatLine(p.yearLevel)}</div>
        </div>
        <div class="col flex-1">
          <span class="label">Academic Year</span>
          <div class="value">${formatLine(p.academicYear)}</div>
        </div>
      </div>
      
      <div class="grid-row">
        <div class="col flex-2">
          <span class="label">ID Number</span>
          <div class="value">${formatLine(p.idNumber || studentProfile?.studentId)}</div>
        </div>
        <div class="col flex-3">
          <span class="label">Religion</span>
          <div class="value">${formatLine(p.religion)}</div>
        </div>
      </div>
      
      <div class="grid-row">
        <div class="col flex-1">
          <span class="label">Surname</span>
          <div class="value">${formatLine(p.surname)}</div>
        </div>
        <div class="col flex-1">
          <span class="label">First Name</span>
          <div class="value">${formatLine(p.firstName)}</div>
        </div>
        <div class="col flex-1">
          <span class="label">Middle Name</span>
          <div class="value">${formatLine(p.middleName)}</div>
        </div>
      </div>

      <div class="grid-row">
        <div class="col flex-1">
          <span class="label">Sex</span>
          <div class="value">${formatLine(p.sex)}</div>
        </div>
        <div class="col flex-1">
          <span class="label">Age</span>
          <div class="value">${formatLine(p.age)}</div>
        </div>
        <div class="col flex-1">
          <span class="label">Civil Status</span>
          <div class="value">${formatLine(p.civilStatus)}</div>
        </div>
      </div>
    </div>
    
    ${studentProfile?.avatarUrl ? `
    <div class="picture-box" style="padding: 0; overflow: hidden; border: 1px solid #000;">
      <img src="${studentProfile.avatarUrl.startsWith('http') ? studentProfile.avatarUrl : API_BASE + studentProfile.avatarUrl}" alt="1x1 Picture" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'"/>
    </div>
    ` : `
    <div class="picture-box">1 x 1<br/>Picture</div>
    `}
  </div>

  <div class="grid-row">
    <div class="col flex-1">
      <span class="label">Date of Birth</span>
      <div class="value">${formatLine(p.dateOfBirth)}</div>
    </div>
    <div class="col flex-1">
      <span class="label">Place of Birth</span>
      <div class="value">${formatLine(p.placeOfBirth)}</div>
    </div>
    <div class="col flex-1" style="display:flex;">
      <div style="flex:1;">
        <span class="label">Height (m)</span>
        <div class="value">${formatLine(p.heightM)}</div>
      </div>
      <div style="flex:1;">
        <span class="label">Weight (kg)</span>
        <div class="value">${formatLine(p.weightKg)}</div>
      </div>
    </div>
  </div>

  <div class="grid-row">
    <div class="col flex-3">
      <span class="label">Present Address (Boarding house/Dormitory)</span>
      <div class="value">${formatLine(p.presentAddress)}</div>
    </div>
    <div class="col flex-1">
      <span class="label">Contact No.</span>
      <div class="value">${formatLine(p.mobileNo)}</div>
    </div>
  </div>

  <div class="grid-row">
    <div class="col flex-3">
      <span class="label">Hometown Address</span>
      <div class="value">${formatLine(p.hometownAddress)}</div>
    </div>
    <div class="col flex-1">
      <span class="label">Email Address</span>
      <div class="value" style="text-transform:none;">${formatLine(p.emailAddress || studentProfile?.email)}</div>
    </div>
  </div>

  <div class="grid-row">
    <div class="col flex-1">
      <span class="label">Tribe/Ethnic Affiliation</span>
      <div class="value">${formatLine(p.tribe)}</div>
    </div>
    <div class="col flex-1">
      <span class="label">Citizenship</span>
      <div class="value">${formatLine(p.citizenship)}</div>
    </div>
  </div>

  <div class="grid-row">
    <div class="col flex-1">
      <span class="label">In case of emergency, contact person</span>
      <div class="value">${formatLine(p.emergencyName)}</div>
    </div>
    <div class="col flex-1">
      <span class="label">Relationship</span>
      <div class="value">${formatLine(p.emergencyRelationship)}</div>
    </div>
    <div class="col flex-1">
      <span class="label">Contact No.</span>
      <div class="value">${formatLine(p.emergencyContactNo)}</div>
    </div>
  </div>
  
  <div class="grid-row">
    <div class="col flex-1">
      <span class="label">Emergency Contact Address</span>
      <div class="value">${formatLine(p.emergencyAddress)}</div>
    </div>
  </div>

  <br/>

  <!-- II. EDUCATIONAL BACKGROUND -->
  <div class="section-title">II. EDUCATIONAL BACKGROUND</div>
  <table class="border-table" style="margin-bottom: 0;">
    <thead>
      <tr style="font-size: 8pt; text-align: center; background: #f5f5f5;">
        <th width="20%">Level</th>
        <th width="30%">Name of School</th>
        <th width="20%">Address of School</th>
        <th width="10%">Type (Public/Private)</th>
        <th width="10%">Year Graduated</th>
        <th width="10%">Honors/Awards</th>
      </tr>
    </thead>
    <tbody>
      ${(e.background || []).map(b => `
      <tr>
        <td style="font-size: 8pt;">${formatLine(b.level)}</td>
        <td style="font-size: 8pt;">${formatLine(b.schoolGraduated)}</td>
        <td style="font-size: 8pt;">${formatLine(b.schoolAddress)}</td>
        <td style="font-size: 8pt;">${formatLine(b.publicPrivate)}</td>
        <td style="font-size: 8pt; text-align: center;">${formatLine(b.yearGraduated)}</td>
        <td style="font-size: 8pt;">${formatLine(b.honors)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="grid-row" style="border-top: none;">
    <div class="col flex-1">
      <span class="label">Nature of Schooling:</span>
      <div style="font-size:9pt; margin-top:2px;">
        ${cb(e.natureOfSchooling === 'continuous')} Continuous &nbsp;&nbsp;&nbsp;
        ${cb(e.natureOfSchooling === 'interrupted')} Interrupted
      </div>
    </div>
    <div class="col flex-2">
      <span class="label">If interrupted, specify reason:</span>
      <div class="value">${formatLine(e.interruptedReason)}</div>
    </div>
  </div>

  <br/>

  <!-- III. HOME AND FAMILY BACKGROUND -->
  <div class="section-title">III. HOME AND FAMILY BACKGROUND</div>
  <table class="border-table" style="margin-bottom: 0; font-size: 9pt;">
    <thead>
      <tr style="background: #f5f5f5;">
        <th width="20%">Family Member</th>
        <th width="35%">Name</th>
        <th width="10%">Age</th>
        <th width="15%">Status (Living/Deceased)</th>
        <th width="20%">Occupation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Father</td>
        <td>${formatLine(f.father?.name)}</td>
        <td class="text-center">${formatLine(f.father?.age)}</td>
        <td class="text-center">${formatLine(f.father?.livingStatus)}</td>
        <td>${formatLine(f.father?.occupation)}</td>
      </tr>
      <tr>
        <td>Mother</td>
        <td>${formatLine(f.mother?.name)}</td>
        <td class="text-center">${formatLine(f.mother?.age)}</td>
        <td class="text-center">${formatLine(f.mother?.livingStatus)}</td>
        <td>${formatLine(f.mother?.occupation)}</td>
      </tr>
      <tr>
        <td>Guardian</td>
        <td>${formatLine(f.guardian?.name)}</td>
        <td class="text-center">${formatLine(f.guardian?.age)}</td>
        <td class="text-center">—</td>
        <td>${formatLine(f.guardian?.occupation)}</td>
      </tr>
    </tbody>
  </table>
  <div class="grid-row" style="border-top: none;">
    <div class="col flex-1">
      <span class="label">Parents' Marital Status:</span>
      <div style="font-size:9pt; margin-top:2px;">
        ${cb(f.parentsMaritalStatus === 'married_together')} Married/Living Together <br/>
        ${cb(f.parentsMaritalStatus === 'separated')} Separated <br/>
        ${cb(f.parentsMaritalStatus === 'annulled')} Annulled <br/>
        ${cb(f.parentsMaritalStatus === 'widowed')} Widowed
      </div>
    </div>
    <div class="col flex-1">
      <span class="label">Number of Siblings:</span>
      <div class="value" style="font-size:9pt;">
        Total: ${formatLine(f.siblingsTotal)} &nbsp;&nbsp;
        Brothers: ${formatLine(f.brothersCount)} &nbsp;&nbsp;
        Sisters: ${formatLine(f.sistersCount)}
      </div>
    </div>
  </div>

  <div class="grid-row" style="border-top: none;">
    <div class="col">
      <span class="label">Main Source of Financing for Studies:</span>
      <div style="font-size:9pt; margin-top:2px; display:flex; flex-wrap:wrap; gap: 8px;">
        <div>${cb((f.financingSources || []).includes('parents'))} Parents</div>
        <div>${cb((f.financingSources || []).includes('spouse'))} Spouse</div>
        <div>${cb((f.financingSources || []).includes('relatives'))} Relatives</div>
        <div>${cb((f.financingSources || []).includes('brother_sister'))} Brother/Sister</div>
        <div>${cb((f.financingSources || []).includes('scholarship'))} Scholarship</div>
        <div>${cb((f.financingSources || []).includes('self_supporting'))} Self-supporting</div>
        <div>${cb((f.financingSources || []).includes('other'))} Other: ${formatLine(f.financingOther)}</div>
      </div>
    </div>
  </div>

  <br/>

  <!-- IV. HEALTH INFORMATION -->
  <div class="section-title">IV. HEALTH INFORMATION</div>
  <div class="grid-row">
    <div class="col">
      <span class="label">Do you have any problems with:</span>
      <div style="font-size:9pt; margin-top:4px;">
        <div style="margin-bottom: 4px;">${cb(h.problems?.vision)} <b>Vision</b> (Specify): ${formatLine(h.problems?.visionDetail)}</div>
        <div style="margin-bottom: 4px;">${cb(h.problems?.speech)} <b>Speech</b> (Specify): ${formatLine(h.problems?.speechDetail)}</div>
        <div style="margin-bottom: 4px;">${cb(h.problems?.hearing)} <b>Hearing</b> (Specify): ${formatLine(h.problems?.hearingDetail)}</div>
        <div style="margin-bottom: 4px;">${cb(h.problems?.generalHealth)} <b>General Health</b> (Specify): ${formatLine(h.problems?.generalHealthDetail)}</div>
        <div style="margin-bottom: 4px;">${cb(h.problems?.physicalDisability)} <b>Physical Disability</b> (Specify): ${formatLine(h.problems?.physicalDisabilityDetail)}</div>
      </div>
    </div>
  </div>

</body>
</html>`;
}

function safeFileBase(studentName, idNumber) {
  const name = (studentName || idNumber || "student").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  return `inventory_form_${name}`.toLowerCase();
}

export function downloadInventoryAsPdf(inventoryData, studentProfile = {}) {
  const html = buildInventoryHTML(inventoryData, studentProfile);
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site to print/save the form.");
    return;
  }
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
