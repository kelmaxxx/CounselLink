// src/components/records/InventoryForm.jsx
// Digital version of the MSU DSA Student Individual Inventory Record Form
// (Doc Code: MSU DSA Inventory Individual Form No. 1.1, Revision No. 5).
//
// Refactored to represent a pixel-perfect HTML recreation of the official
// document. The layout is optimized to span exactly 2 pages on Long Bond Paper
// (8.5 × 13 inches) for both screen viewing and printing/PDF export.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Save, FileUp, Trash2, ExternalLink, Printer, FileDown, FileText, CheckCircle2 } from "lucide-react";
import { Modal, BTN } from "../ui";
import { useStudentRecords } from "../../context/StudentRecordsContext";
import { useReactToPrint } from "react-to-print";

const EDUC_LEVELS = ["Elementary", "Junior High School", "Vocational", "Senior High School", "College"];

const INTEREST_OPTIONS = [
  { value: "sports", label: "Sports" },
  { value: "science", label: "Science" },
  { value: "civic", label: "Civic Awareness/Service" },
  { value: "arts", label: "Arts" },
  { value: "social_studies", label: "Social Studies" },
  { value: "religious", label: "Religious" },
];

const HELP_OPTIONS = [
  { value: "family", label: "Family matters" },
  { value: "career", label: "Career concerns" },
  { value: "relationship", label: "Relationship problems" },
  { value: "self", label: "Self" },
  { value: "teachers", label: "Concerns with teachers" },
  { value: "financial", label: "Financial matters" },
  { value: "academic", label: "Academic concerns" },
  { value: "health", label: "Health concerns" },
];

const FINANCING_OPTIONS = [
  { value: "parents", label: "Parents" },
  { value: "spouse", label: "Spouse" },
  { value: "relatives", label: "Relatives" },
  { value: "brother_sister", label: "Brother/Sister" },
  { value: "scholarship", label: "Scholarship" },
  { value: "self_supporting", label: "Self-supporting/working" },
];

const blankInventory = () => ({
  personal: {
    idNumber: "",
    surname: "", firstName: "", middleName: "",
    sex: "", age: "",
    civilStatus: "",
    course: "", yearLevel: "", academicYear: "", dateOfBirth: "",
    heightM: "", weightKg: "",
    placeOfBirth: "",
    presentAddress: "", presentAddressType: "residential",
    emailAddress: "",
    hometownAddress: "",
    mobileNo: "",
    gpa: "", religion: "", citizenship: "", tribe: "",
    employerNameAddress: "",
    emergencyName: "", emergencyContactNo: "", emergencyAddress: "", emergencyRelationship: "",
    headerDate: "", controlNo: "",
  },
  educational: {
    background: EDUC_LEVELS.map((level) => ({
      level, schoolGraduated: "", schoolAddress: "", publicPrivate: "", yearGraduated: "", honors: "",
    })),
    natureOfSchooling: "continuous",
    interruptedReason: "",
  },
  family: {
    father: { name: "", age: "", livingStatus: "living", educationalAttainment: "", occupation: "" },
    mother: { name: "", age: "", livingStatus: "living", educationalAttainment: "", occupation: "" },
    guardian: { name: "", age: "", educationalAttainment: "", occupation: "" },
    parentsMaritalStatus: "married_together",
    parentsMaritalOther: "",
    siblingsTotal: "", brothersCount: "", sistersCount: "",
    financingSources: [],
    financingOther: "",
  },
  health: {
    problems: {
      vision: false, visionDetail: "",
      speech: false, speechDetail: "",
      hearing: false, hearingDetail: "",
      generalHealth: false, generalHealthDetail: "",
      physicalDisability: false, physicalDisabilityDetail: "",
    },
    diagnosedIllnessesNote: "",
    psychologicalTestsTaken: false,
  },
  testRecord: [],
  other: {
    interestGroups: [],
    interestGroupsOther: "",
    consultedBefore: false,
    consultedReason: "",
    helpNeeded: [],
    helpNeededOther: "",
  },
  acknowledgment: {
    studentPrintedName: "",
    dateAcknowledged: "",
    disclaimerAgreed: false,
    disclaimerRevokedAt: null,
  },
});

const mergeInventory = (stored) => {
  const blank = blankInventory();
  if (!stored || typeof stored !== "object") return blank;
  return {
    personal: { ...blank.personal, ...(stored.personal || {}) },
    educational: {
      ...blank.educational,
      ...(stored.educational || {}),
      background: Array.isArray(stored.educational?.background) && stored.educational.background.length
        ? blank.educational.background.map((row, i) => ({ ...row, ...(stored.educational.background[i] || {}) }))
        : blank.educational.background,
    },
    family: {
      ...blank.family,
      ...(stored.family || {}),
      father: { ...blank.family.father, ...(stored.family?.father || {}) },
      mother: { ...blank.family.mother, ...(stored.family?.mother || {}) },
      guardian: { ...blank.family.guardian, ...(stored.family?.guardian || {}) },
      financingSources: Array.isArray(stored.family?.financingSources) ? stored.family.financingSources : [],
    },
    health: {
      ...blank.health,
      ...(stored.health || {}),
      problems: { ...blank.health.problems, ...(stored.health?.problems || {}) },
    },
    testRecord: Array.isArray(stored.testRecord) ? stored.testRecord : [],
    other: {
      ...blank.other,
      ...(stored.other || {}),
      interestGroups: Array.isArray(stored.other?.interestGroups) ? stored.other.interestGroups : [],
      helpNeeded: Array.isArray(stored.other?.helpNeeded) ? stored.other.helpNeeded : [],
    },
    acknowledgment: { ...blank.acknowledgment, ...(stored.acknowledgment || {}) },
  };
};

function LineInput({ value, onChange, disabled, className = "", placeholder = "", maxLength = 100, type = "text" }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange && onChange(e.target.value)}
      disabled={disabled}
      placeholder={disabled ? "" : placeholder}
      maxLength={maxLength}
      className={`border-b border-black outline-none bg-transparent px-1 h-[16px] text-[11px] font-sans text-black leading-none shrink-0 ${className}`}
    />
  );
}

function FormCheckbox({ checked, onChange, disabled, label }) {
  return (
    <label className="inline-flex items-center gap-1 cursor-pointer select-none text-[11px]">
      <input
        type="checkbox"
        checked={checked || false}
        onChange={(e) => onChange && onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <span className="w-3.5 h-3.5 border border-black flex items-center justify-center text-[10px] font-bold text-black bg-transparent shrink-0">
        {checked ? "✓" : ""}
      </span>
      {label && <span className="text-black ml-1 select-none font-medium">{label}</span>}
    </label>
  );
}

function SectionHeader({ number, children }) {
  return (
    <div className="flex gap-2 items-center border-b border-black pb-0.5 mt-2 mb-1 select-none">
      <span className="font-bold text-[11px] font-serif">{number}.</span>
      <span className="font-bold text-[10px] uppercase font-sans tracking-wide">{children}</span>
    </div>
  );
}

export default function InventoryForm({
  inventory,
  studentName,
  studentId,
  studentProfile,
  apiBase,
  consent = null,
  onSave,
  onUploadScan,
  onDeleteScan,
  readOnly = false,
  isStudentView = false,
  hasFeedback = true,
  hasSignature = true,
}) {
  const { downloadInventoryDocx } = useStudentRecords();
  const [data, setData] = useState(() => mergeInventory(inventory?.formData));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [scanInputKey, setScanInputKey] = useState(0); 
  const [confirmRemoveScan, setConfirmRemoveScan] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const dirtyRef = useRef(false);
  const printRef = useRef(null);

  const triggerPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Student Individual Inventory Record",
  });

  useEffect(() => {
    if (dirtyRef.current) return;
    setData(mergeInventory(inventory?.formData));
  }, [inventory?.id, inventory?.updatedAt]);

  const edit = (updater) => {
    dirtyRef.current = true;
    setData(updater);
  };

  const updateSection = (section, patch) =>
    edit((d) => ({ ...d, [section]: { ...d[section], ...patch } }));

  const updateNested = (section, key, patch) =>
    edit((d) => ({ ...d, [section]: { ...d[section], [key]: { ...d[section][key], ...patch } } }));

  const updateBackgroundRow = (idx, patch) =>
    edit((d) => ({
      ...d,
      educational: {
        ...d.educational,
        background: d.educational.background.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
      },
    }));

  const handleUpdateTestRecord = (idx, field, value) => {
    edit((d) => {
      const list = [...(d.testRecord || [])];
      while (list.length <= idx) {
        list.push({ date: "", kindOfTest: "", score: "", rank: "" });
      }
      list[idx] = { ...list[idx], [field]: value };
      return { ...d, testRecord: list };
    });
  };

  const handleAddTestRow = () => {
    edit((d) => ({
      ...d,
      testRecord: [...(d.testRecord || []), { date: "", kindOfTest: "", score: "", rank: "" }],
    }));
  };

  const handleRemoveTestRow = (idx) => {
    edit((d) => ({
      ...d,
      testRecord: (d.testRecord || []).filter((_, i) => i !== idx),
    }));
  };

  const toggleFinancing = (val, checked) => {
    let current = [...(data.family.financingSources || [])];
    if (checked) {
      if (!current.includes(val)) current.push(val);
    } else {
      current = current.filter((v) => v !== val);
    }
    updateSection("family", { financingSources: current });
  };

  const toggleInterest = (val, checked) => {
    let current = [...(data.other.interestGroups || [])];
    if (checked) {
      if (!current.includes(val)) current.push(val);
    } else {
      current = current.filter((v) => v !== val);
    }
    updateSection("other", { interestGroups: current });
  };

  const toggleHelp = (val, checked) => {
    let current = [...(data.other.helpNeeded || [])];
    if (checked) {
      if (!current.includes(val)) current.push(val);
    } else {
      current = current.filter((v) => v !== val);
    }
    updateSection("other", { helpNeeded: current });
  };

  const showFeedback = (type, text, ms = 3000) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), ms);
  };

  const handleSave = async () => {
    setBusy(true);
    const res = await onSave(data);
    setBusy(false);
    if (res.success) {
      dirtyRef.current = false;
      setShowSaveSuccess(true);
    } else {
      alert(res.message || "Failed to save");
    }
    showFeedback(res.success ? "success" : "error", res.success ? "Inventory saved" : (res.message || "Failed to save"));
  };

  const handleDownloadDocx = async () => {
    setBusy(true);
    if (!readOnly) {
      const saveRes = await onSave(data);
      if (!saveRes.success) {
        setBusy(false);
        showFeedback("error", saveRes.message || "Could not save before download");
        return;
      }
      dirtyRef.current = false;
    }
    const res = await downloadInventoryDocx(studentId, studentName || "student");
    setBusy(false);
    if (!res.success) showFeedback("error", res.message || "Failed to generate Word file");
  };

  const handlePrint = async () => {
    setBusy(true);
    if (!readOnly) {
      const saveRes = await onSave(data);
      if (!saveRes.success) {
        setBusy(false);
        showFeedback("error", saveRes.message || "Could not save before printing");
        return;
      }
      dirtyRef.current = false;
    }
    setBusy(false);
    triggerPrint();
  };

  const handleScanChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const res = await onUploadScan(file);
    setBusy(false);
    setScanInputKey((k) => k + 1);
    showFeedback(res.success ? "success" : "error", res.success ? "Scan uploaded" : (res.message || "Failed to upload"));
  };

  const handleScanDelete = async () => {
    setConfirmRemoveScan(false);
    setBusy(true);
    const res = await onDeleteScan();
    setBusy(false);
    showFeedback(res.success ? "success" : "error", res.success ? "Scan removed" : (res.message || "Failed to remove scan"));
  };

  const scanHref = useMemo(() => {
    if (!inventory?.scanUrl) return null;
    return inventory.scanUrl.startsWith("http") ? inventory.scanUrl : `${apiBase}${inventory.scanUrl}`;
  }, [inventory?.scanUrl, apiBase]);

  const studentSigUrl = useMemo(() => {
    const sigPath = studentProfile?.signatureUrl || studentProfile?.signature_url;
    if (!sigPath) return null;
    return sigPath.startsWith("data:") || sigPath.startsWith("http") ? sigPath : `${apiBase}${sigPath}`;
  }, [studentProfile?.signatureUrl, studentProfile?.signature_url, apiBase]);

  const studentAvatarUrl = useMemo(() => {
    const avatarPath = studentProfile?.avatarUrl || studentProfile?.avatar_url;
    if (!avatarPath) return null;
    return avatarPath.startsWith("data:") || avatarPath.startsWith("http") ? avatarPath : `${apiBase}${avatarPath}`;
  }, [studentProfile?.avatarUrl, studentProfile?.avatar_url, apiBase]);

  return (
    <div className="space-y-4">
      {/* Dynamic Style injection for print styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .document-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          background-color: #f3f4f6;
          padding: 24px 16px;
          width: 100%;
          box-sizing: border-box;
        }

        .page-sheet {
          background: white;
          width: 8.5in;
          height: 13in;
          padding: 0.5in;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          font-family: Arial, sans-serif;
          color: black;
          text-align: left;
          flex-shrink: 0;
        }

        @media print {
          /* Hide app overlays, dashboard components, headers, buttons */
          .no-print,
          header,
          footer,
          aside,
          nav,
          button,
          .modal-header,
          .modal-footer {
            display: none !important;
          }

          /* Force modal wrapper to behave as a simple transparent container */
          #root,
          body > div,
          .fixed,
          .absolute,
          .bg-black\\/30,
          .backdrop-blur-sm,
          .shadow-xl,
          .rounded-2xl {
            position: static !important;
            inset: auto !important;
            background: transparent !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            width: auto !important;
            height: auto !important;
            max-height: none !important;
          }

          /* Reset document container so it flows directly to paper */
          .document-container {
            display: block !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }

          .page-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.5in !important;
            width: 8.5in !important;
            height: 13in !important;
            page-break-after: always;
            break-after: page;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }

          @page {
            size: 8.5in 13in;
            margin: 0;
          }

          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}} />

      {feedback && (
        <div className={`p-2 rounded border text-sm no-print ${feedback.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {feedback.text}
        </div>
      )}

      {/* Warning banner on screen if more than 3 test records are loaded */}
      {data.testRecord && data.testRecord.length > 3 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 no-print">
          ⚠️ <strong>Notice:</strong> This form currently contains {data.testRecord.length} test records. Only the first 3 will fit on the printed document to preserve the 2-page layout. You can manage all records in the editor section at the bottom.
        </div>
      )}

      {/* TWO PAGE SHEETS CONTAINER */}
      <div className="document-container" ref={printRef}>
        
        {/* ================= PAGE 1 ================= */}
        <div className="page-sheet" id="page-1">
          {/* Header block table */}
          <table className="w-full border-collapse border border-black text-[9px] font-sans">
            <tbody>
              <tr>
                {/* Logos */}
                <td className="border border-black p-1 w-[150px] align-middle">
                  <div className="flex justify-center items-center gap-1.5">
                    <img src="/msu-logo.png" alt="MSU Logo" className="w-[42px] h-[42px] object-contain shrink-0" />
                    <img src="/dsa-logo.png?v=2" alt="DSA Logo" className="w-[42px] h-[42px] object-contain shrink-0" />
                    <img src="/guidance-logo.jpg" alt="Guidance Logo" className="w-[42px] h-[42px] object-contain shrink-0" />
                  </div>
                </td>
                {/* Middle Text */}
                <td className="border border-black p-1.5 text-center align-middle font-bold leading-tight select-none">
                  <div className="text-[10px]">MINDANAO STATE UNIVERSITY</div>
                  <div className="text-[8px] font-normal italic">Marawi City</div>
                  <div className="text-[9px] tracking-wide mt-0.5">DIVISION OF STUDENT AFFAIRS</div>
                  <div className="text-[10px] tracking-wider mt-0.5">STUDENT INDIVIDUAL INVENTORY</div>
                  <div className="text-[8px] font-normal uppercase tracking-widest mt-0.5">GUIDANCE AND COUNSELING SECTION</div>
                </td>
                {/* Right Table Info */}
                <td className="border border-black p-0 w-[230px] align-top">
                  <table className="w-full border-collapse text-[8px] h-full">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="p-1 font-semibold border-r border-black w-20 select-none">Doc. Code:</td>
                        <td className="p-1">MSU DSA Inventory Individual Form No.1.1</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1 font-semibold border-r border-black select-none">Issue Date:</td>
                        <td className="p-1">04/04/2024</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1 font-semibold border-r border-black select-none">Revision No.:</td>
                        <td className="p-1">5</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1 font-semibold border-r border-black select-none">Page No.:</td>
                        <td className="p-1">Page 1 of 2</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1 font-semibold border-r border-black select-none">Date:</td>
                        <td className="p-0">
                          <input
                            type="text"
                            value={data.personal.headerDate || ""}
                            onChange={(e) => updateSection("personal", { headerDate: e.target.value })}
                            disabled={readOnly}
                            className="w-full h-full px-1 border-none outline-none bg-transparent text-[8px] font-bold text-black"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-1 font-semibold border-r border-black select-none">Control No.:</td>
                        <td className="p-0">
                          <input
                            type="text"
                            value={data.personal.controlNo || ""}
                            onChange={(e) => updateSection("personal", { controlNo: e.target.value })}
                            disabled={readOnly}
                            className="w-full h-full px-1 border-none outline-none bg-transparent text-[8px] font-bold text-black"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Title and Direction */}
          <div className="text-center font-bold text-[11px] mt-2 select-none uppercase font-sans tracking-wide">
            STUDENT INDIVIDUAL INVENTORY RECORD FORM
          </div>
          <p className="text-[9.5px] text-justify leading-tight mt-1 select-none font-sans border border-black p-1">
            <strong>DIRECTION:</strong> Please complete this inventory as accurately and honestly as you can. The purpose of collecting this information is to be of assistance to you in making choices and decisions. All information which you provide about yourself will be treated with utmost confidentiality.
          </p>

          {/* SECTION I. PERSONAL INFORMATION */}
          <SectionHeader number="I">PERSONAL INFORMATION</SectionHeader>
          
          <div className="flex gap-4 relative">
            <div className="flex-1 flex flex-col gap-1.5">
              {/* ID Number */}
              <div className="flex items-end text-[10px] gap-1 h-[20px]">
                <span className="font-semibold whitespace-nowrap select-none">I.D. Number:</span>
                <LineInput value={data.personal.idNumber} onChange={(v) => updateSection("personal", { idNumber: v })} disabled={readOnly} className="w-[180px]" maxLength={20} />
              </div>
              
              {/* Name / Sex / Age */}
              <div className="flex items-end text-[10px] gap-1 mt-0.5">
                <span className="font-semibold whitespace-nowrap select-none">Name:</span>
                <div className="flex-grow flex gap-2">
                  <div className="flex-grow flex flex-col items-center">
                    <LineInput value={data.personal.surname} onChange={(v) => updateSection("personal", { surname: v })} disabled={readOnly} className="w-full text-center" maxLength={30} />
                    <span className="text-[8px] text-gray-500 italic mt-0.5 leading-none select-none">(Surname)</span>
                  </div>
                  <div className="flex-grow flex flex-col items-center">
                    <LineInput value={data.personal.firstName} onChange={(v) => updateSection("personal", { firstName: v })} disabled={readOnly} className="w-full text-center" maxLength={30} />
                    <span className="text-[8px] text-gray-500 italic mt-0.5 leading-none select-none">(First Name)</span>
                  </div>
                  <div className="flex-grow flex flex-col items-center">
                    <LineInput value={data.personal.middleName} onChange={(v) => updateSection("personal", { middleName: v })} disabled={readOnly} className="w-full text-center" maxLength={30} />
                    <span className="text-[8px] text-gray-500 italic mt-0.5 leading-none select-none">(Middle Name)</span>
                  </div>
                </div>
                <span className="font-semibold whitespace-nowrap ml-1 select-none">Sex:</span>
                <LineInput value={data.personal.sex} onChange={(v) => updateSection("personal", { sex: v })} disabled={readOnly} className="w-[45px] text-center" maxLength={10} />
                <span className="font-semibold whitespace-nowrap ml-1 select-none">Age:</span>
                <LineInput value={data.personal.age} onChange={(v) => updateSection("personal", { age: v })} disabled={readOnly} className="w-[40px] text-center" maxLength={5} />
              </div>
            </div>

            {/* Picture box */}
            <div className="w-[75px] h-[75px] border border-black flex flex-col items-center justify-center text-center select-none shrink-0 self-start overflow-hidden relative">
              {studentAvatarUrl ? (
                <img src={studentAvatarUrl} alt="1x1 Picture" className="w-full h-full object-cover" />
              ) : (
                <div className="p-1">
                  <div className="text-[9px] font-bold">1x1</div>
                  <div className="text-[9px] font-bold">Picture</div>
                </div>
              )}
            </div>
          </div>

          {/* Civil Status */}
          <div className="flex items-center text-[10px] gap-2 h-[20px] mt-1.5">
            <span className="font-semibold select-none">Civil Status:</span>
            <div className="flex gap-4">
              <FormCheckbox checked={data.personal.civilStatus === "single"} onChange={(c) => c && updateSection("personal", { civilStatus: "single" })} disabled={readOnly} label="Single" />
              <FormCheckbox checked={data.personal.civilStatus === "married"} onChange={(c) => c && updateSection("personal", { civilStatus: "married" })} disabled={readOnly} label="Married" />
              <FormCheckbox checked={data.personal.civilStatus === "separated"} onChange={(c) => c && updateSection("personal", { civilStatus: "separated" })} disabled={readOnly} label="Separated" />
              <FormCheckbox checked={data.personal.civilStatus === "widow"} onChange={(c) => c && updateSection("personal", { civilStatus: "widow" })} disabled={readOnly} label="Widow" />
              <FormCheckbox checked={data.personal.civilStatus === "solo_parent"} onChange={(c) => c && updateSection("personal", { civilStatus: "solo_parent" })} disabled={readOnly} label="Solo Parent" />
            </div>
          </div>

          {/* Course / Year Level / A.Y. / DOB */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-1">
            <span className="font-semibold whitespace-nowrap select-none">Course:</span>
            <LineInput value={data.personal.course} onChange={(v) => updateSection("personal", { course: v })} disabled={readOnly} className="flex-1 min-w-0" maxLength={25} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Year Level:</span>
            <LineInput value={data.personal.yearLevel} onChange={(v) => updateSection("personal", { yearLevel: v })} disabled={readOnly} className="w-[85px]" maxLength={15} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">A.Y.:</span>
            <LineInput value={data.personal.academicYear} onChange={(v) => updateSection("personal", { academicYear: v })} disabled={readOnly} className="w-[70px]" placeholder="2025-2026" maxLength={15} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Date of Birth:</span>
            <LineInput value={data.personal.dateOfBirth} onChange={(v) => updateSection("personal", { dateOfBirth: v })} disabled={readOnly} className="w-[90px]" maxLength={20} />
          </div>

          {/* Height / Weight / POB */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-1">
            <span className="font-semibold whitespace-nowrap select-none">Height (m):</span>
            <LineInput value={data.personal.heightM} onChange={(v) => updateSection("personal", { heightM: v })} disabled={readOnly} className="w-[60px] text-center" maxLength={10} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Weight:</span>
            <LineInput value={data.personal.weightKg} onChange={(v) => updateSection("personal", { weightKg: v })} disabled={readOnly} className="w-[60px] text-center" maxLength={10} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Place of Birth:</span>
            <LineInput value={data.personal.placeOfBirth} onChange={(v) => updateSection("personal", { placeOfBirth: v })} disabled={readOnly} className="flex-1 min-w-0" maxLength={60} />
          </div>

          {/* Present Address / Email */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-1">
            <span className="font-semibold whitespace-nowrap select-none">Present Address (Residential/BoardingHouse/Dormitory):</span>
            <LineInput value={data.personal.presentAddress} onChange={(v) => updateSection("personal", { presentAddress: v })} disabled={readOnly} className="flex-1 min-w-0" maxLength={70} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Email Address:</span>
            <LineInput value={data.personal.emailAddress} onChange={(v) => updateSection("personal", { emailAddress: v })} disabled={readOnly} className="w-[140px]" maxLength={35} />
          </div>

          {/* Hometown Address / Mobile */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-1">
            <span className="font-semibold whitespace-nowrap select-none">Hometown Address:</span>
            <LineInput value={data.personal.hometownAddress} onChange={(v) => updateSection("personal", { hometownAddress: v })} disabled={readOnly} className="flex-1 min-w-0" maxLength={80} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Mobile No.:</span>
            <LineInput value={data.personal.mobileNo} onChange={(v) => updateSection("personal", { mobileNo: v })} disabled={readOnly} className="w-[140px]" maxLength={25} />
          </div>

          {/* GPA / Religion / Citizenship / Tribe */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-1">
            <span className="font-semibold whitespace-nowrap select-none">Grade Point Average:</span>
            <LineInput value={data.personal.gpa} onChange={(v) => updateSection("personal", { gpa: v })} disabled={readOnly} className="w-[60px] text-center" maxLength={10} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Religion:</span>
            <LineInput value={data.personal.religion} onChange={(v) => updateSection("personal", { religion: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={25} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Citizenship:</span>
            <LineInput value={data.personal.citizenship} onChange={(v) => updateSection("personal", { citizenship: v })} disabled={readOnly} className="w-[90px]" maxLength={20} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Tribe:</span>
            <LineInput value={data.personal.tribe} onChange={(v) => updateSection("personal", { tribe: v })} disabled={readOnly} className="w-[90px]" maxLength={20} />
          </div>

          {/* Working Details */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-1">
            <span className="font-semibold whitespace-nowrap select-none">If working, please indicate the name and address of employer:</span>
            <LineInput value={data.personal.employerNameAddress} onChange={(v) => updateSection("personal", { employerNameAddress: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={60} />
          </div>

          {/* Emergency Details */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-1">
            <span className="font-semibold whitespace-nowrap select-none">Person to be contacted in case of emergency:</span>
            <LineInput value={data.personal.emergencyName} onChange={(v) => updateSection("personal", { emergencyName: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={50} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Contact No.</span>
            <LineInput value={data.personal.emergencyContactNo} onChange={(v) => updateSection("personal", { emergencyContactNo: v })} disabled={readOnly} className="w-[140px]" maxLength={25} />
          </div>
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-0.5">
            <span className="font-semibold whitespace-nowrap select-none">Address:</span>
            <LineInput value={data.personal.emergencyAddress} onChange={(v) => updateSection("personal", { emergencyAddress: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={70} />
            <span className="font-semibold whitespace-nowrap ml-1 select-none">Relationship:</span>
            <LineInput value={data.personal.emergencyRelationship} onChange={(v) => updateSection("personal", { emergencyRelationship: v })} disabled={readOnly} className="w-[140px]" maxLength={25} />
          </div>

          {/* SECTION II. EDUCATIONAL BACKGROUND */}
          <SectionHeader number="II">EDUCATIONAL BACKGROUND</SectionHeader>
          <table className="w-full border-collapse border border-black text-[9px] mt-1 font-sans">
            <thead>
              <tr className="bg-gray-50 select-none">
                <th className="border border-black px-1 py-0.5 text-center font-bold w-[90px] h-[20px]">LEVEL</th>
                <th className="border border-black px-1 py-0.5 text-center font-bold">SCHOOL GRADUATED</th>
                <th className="border border-black px-1 py-0.5 text-center font-bold">SCHOOL ADDRESS</th>
                <th className="border border-black px-1 py-0.5 text-center font-bold w-[90px]">PUBLIC/PRIVATE</th>
                <th className="border border-black px-1 py-0.5 text-center font-bold w-[75px]">YEAR GRADUATED</th>
                <th className="border border-black px-1 py-0.5 text-center font-bold w-[140px]">HONORS RECEIVED/SPECIAL AWARDS</th>
              </tr>
            </thead>
            <tbody>
              {data.educational.background.map((row, idx) => (
                <tr key={row.level} className="h-[18px]">
                  <td className="border border-black px-1 text-left font-semibold select-none">{row.level}</td>
                  <td className="border border-black p-0">
                    <input
                      type="text"
                      value={row.schoolGraduated || ""}
                      onChange={(e) => updateBackgroundRow(idx, { schoolGraduated: e.target.value })}
                      disabled={readOnly}
                      maxLength={60}
                      className="w-full h-full px-1 border-none outline-none bg-transparent text-[9.5px] text-black"
                    />
                  </td>
                  <td className="border border-black p-0">
                    <input
                      type="text"
                      value={row.schoolAddress || ""}
                      onChange={(e) => updateBackgroundRow(idx, { schoolAddress: e.target.value })}
                      disabled={readOnly}
                      maxLength={60}
                      className="w-full h-full px-1 border-none outline-none bg-transparent text-[9.5px] text-black"
                    />
                  </td>
                  <td className="border border-black p-0 text-center">
                    <select
                      value={row.publicPrivate || ""}
                      onChange={(e) => updateBackgroundRow(idx, { publicPrivate: e.target.value })}
                      disabled={readOnly}
                      className="w-full h-full border-none outline-none bg-transparent text-[9.5px] text-black text-center cursor-pointer disabled:cursor-not-allowed"
                    >
                      <option value="">—</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </td>
                  <td className="border border-black p-0 text-center">
                    <input
                      type="text"
                      value={row.yearGraduated || ""}
                      onChange={(e) => updateBackgroundRow(idx, { yearGraduated: e.target.value })}
                      disabled={readOnly}
                      maxLength={10}
                      className="w-full h-full px-1 border-none outline-none bg-transparent text-[9.5px] text-black text-center"
                    />
                  </td>
                  <td className="border border-black p-0">
                    <input
                      type="text"
                      value={row.honors || ""}
                      onChange={(e) => updateBackgroundRow(idx, { honors: e.target.value })}
                      disabled={readOnly}
                      maxLength={60}
                      className="w-full h-full px-1 border-none outline-none bg-transparent text-[9.5px] text-black"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Nature of Schooling */}
          <div className="flex items-end text-[10px] gap-2 h-[20px] mt-1 select-none">
            <span className="font-semibold">Nature of Schooling:</span>
            <FormCheckbox checked={data.educational.natureOfSchooling === "continuous"} onChange={(c) => c && updateSection("educational", { natureOfSchooling: "continuous" })} disabled={readOnly} label="Continuous" />
            <FormCheckbox checked={data.educational.natureOfSchooling === "interrupted"} onChange={(c) => c && updateSection("educational", { natureOfSchooling: "interrupted" })} disabled={readOnly} label="Interrupted, why?" />
            <LineInput value={data.educational.interruptedReason} onChange={(v) => updateSection("educational", { interruptedReason: v })} disabled={readOnly || data.educational.natureOfSchooling !== "interrupted"} className="flex-grow min-w-0" maxLength={60} />
          </div>

          {/* SECTION III. HOME AND FAMILY BACKGROUND */}
          <SectionHeader number="III">HOME AND FAMILY BACKGROUND</SectionHeader>
          
          {/* Father Details */}
          <div>
            <div className="flex items-end text-[10px] gap-1 h-[20px]">
              <span className="font-semibold whitespace-nowrap select-none">Name of Father:</span>
              <LineInput value={data.family.father.name} onChange={(v) => updateNested("family", "father", { name: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={50} />
              <span className="font-semibold whitespace-nowrap ml-1 select-none">Age:</span>
              <LineInput value={data.family.father.age} onChange={(v) => updateNested("family", "father", { age: v })} disabled={readOnly} className="w-[35px] text-center" maxLength={5} />
              <div className="flex gap-2 ml-2 select-none">
                <FormCheckbox checked={data.family.father.livingStatus === "living"} onChange={(c) => c && updateNested("family", "father", { livingStatus: "living" })} disabled={readOnly} label="Living" />
                <FormCheckbox checked={data.family.father.livingStatus === "deceased"} onChange={(c) => c && updateNested("family", "father", { livingStatus: "deceased" })} disabled={readOnly} label="Deceased" />
              </div>
            </div>
            <div className="flex items-end text-[10px] gap-1 h-[20px] mt-0.5">
              <span className="font-semibold whitespace-nowrap select-none">Educational Attainment:</span>
              <LineInput value={data.family.father.educationalAttainment} onChange={(v) => updateNested("family", "father", { educationalAttainment: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={60} />
              <span className="font-semibold whitespace-nowrap ml-2 select-none">Occupation:</span>
              <LineInput value={data.family.father.occupation} onChange={(v) => updateNested("family", "father", { occupation: v })} disabled={readOnly} className="w-[180px]" maxLength={40} />
            </div>
          </div>

          {/* Mother Details */}
          <div className="mt-1">
            <div className="flex items-end text-[10px] gap-1 h-[20px]">
              <span className="font-semibold whitespace-nowrap select-none">Name of Mother:</span>
              <LineInput value={data.family.mother.name} onChange={(v) => updateNested("family", "mother", { name: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={50} />
              <span className="font-semibold whitespace-nowrap ml-1 select-none">Age:</span>
              <LineInput value={data.family.mother.age} onChange={(v) => updateNested("family", "mother", { age: v })} disabled={readOnly} className="w-[35px] text-center" maxLength={5} />
              <div className="flex gap-2 ml-2 select-none">
                <FormCheckbox checked={data.family.mother.livingStatus === "living"} onChange={(c) => c && updateNested("family", "mother", { livingStatus: "living" })} disabled={readOnly} label="Living" />
                <FormCheckbox checked={data.family.mother.livingStatus === "deceased"} onChange={(c) => c && updateNested("family", "mother", { livingStatus: "deceased" })} disabled={readOnly} label="Deceased" />
              </div>
            </div>
            <div className="flex items-end text-[10px] gap-1 h-[20px] mt-0.5">
              <span className="font-semibold whitespace-nowrap select-none">Educational Attainment:</span>
              <LineInput value={data.family.mother.educationalAttainment} onChange={(v) => updateNested("family", "mother", { educationalAttainment: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={60} />
              <span className="font-semibold whitespace-nowrap ml-2 select-none">Occupation:</span>
              <LineInput value={data.family.mother.occupation} onChange={(v) => updateNested("family", "mother", { occupation: v })} disabled={readOnly} className="w-[180px]" maxLength={40} />
            </div>
          </div>

          {/* Guardian Details */}
          <div className="mt-1">
            <div className="flex items-end text-[10px] gap-1 h-[20px]">
              <span className="font-semibold whitespace-nowrap select-none">Name of Guardian (If any):</span>
              <LineInput value={data.family.guardian.name} onChange={(v) => updateNested("family", "guardian", { name: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={50} />
              <span className="font-semibold whitespace-nowrap ml-1 select-none">Age:</span>
              <LineInput value={data.family.guardian.age} onChange={(v) => updateNested("family", "guardian", { age: v })} disabled={readOnly} className="w-[35px] text-center" maxLength={5} />
            </div>
            <div className="flex items-end text-[10px] gap-1 h-[20px] mt-0.5">
              <span className="font-semibold whitespace-nowrap select-none">Educational Attainment:</span>
              <LineInput value={data.family.guardian.educationalAttainment} onChange={(v) => updateNested("family", "guardian", { educationalAttainment: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={60} />
              <span className="font-semibold whitespace-nowrap ml-2 select-none">Occupation:</span>
              <LineInput value={data.family.guardian.occupation} onChange={(v) => updateNested("family", "guardian", { occupation: v })} disabled={readOnly} className="w-[180px]" maxLength={40} />
            </div>
          </div>

          {/* Parents Marital Relationship */}
          <div className="text-[10px] mt-1.5 flex items-start gap-4">
            <span className="font-semibold whitespace-nowrap mt-0.5 select-none">Parents’ Marital Relationship: (Please Check)</span>
            <div className="flex-grow grid grid-cols-2 gap-x-6 gap-y-1">
              <FormCheckbox checked={data.family.parentsMaritalStatus === "married_together"} onChange={(c) => c && updateSection("family", { parentsMaritalStatus: "married_together" })} disabled={readOnly} label="Married and staying together" />
              <FormCheckbox checked={data.family.parentsMaritalStatus === "single_parent"} onChange={(c) => c && updateSection("family", { parentsMaritalStatus: "single_parent" })} disabled={readOnly} label="Single Parent" />
              <FormCheckbox checked={data.family.parentsMaritalStatus === "not_married_living_together"} onChange={(c) => c && updateSection("family", { parentsMaritalStatus: "not_married_living_together" })} disabled={readOnly} label="Not married but living together" />
              <FormCheckbox checked={data.family.parentsMaritalStatus === "married_separated"} onChange={(c) => c && updateSection("family", { parentsMaritalStatus: "married_separated" })} disabled={readOnly} label="Married but Separated" />
              <div className="col-span-2 flex items-end gap-1 h-[18px]">
                <FormCheckbox checked={data.family.parentsMaritalStatus === "other"} onChange={(c) => c && updateSection("family", { parentsMaritalStatus: "other" })} disabled={readOnly} label="Other’s (Please Specify)" />
                <LineInput value={data.family.parentsMaritalOther} onChange={(v) => updateSection("family", { parentsMaritalOther: v })} disabled={readOnly || data.family.parentsMaritalStatus !== "other"} className="flex-grow min-w-0" maxLength={40} />
              </div>
            </div>
          </div>

          {/* Children / Siblings Counts */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-1">
            <span className="font-semibold whitespace-nowrap select-none">Number of children in the family including yourself:</span>
            <LineInput value={data.family.siblingsTotal} onChange={(v) => updateSection("family", { siblingsTotal: v })} disabled={readOnly} className="w-[45px] text-center" maxLength={5} />
            <span className="font-semibold whitespace-nowrap ml-2 select-none">Number of Brothers:</span>
            <LineInput value={data.family.brothersCount} onChange={(v) => updateSection("family", { brothersCount: v })} disabled={readOnly} className="w-[45px] text-center" maxLength={5} />
            <span className="font-semibold whitespace-nowrap ml-2 select-none">Number of Sisters:</span>
            <LineInput value={data.family.sistersCount} onChange={(v) => updateSection("family", { sistersCount: v })} disabled={readOnly} className="w-[45px] text-center" maxLength={5} />
          </div>

          {/* Finances Schooling */}
          <div className="text-[10px] mt-1 flex items-start gap-2 select-none">
            <span className="font-semibold whitespace-nowrap mt-0.5">Who finances your schooling?</span>
            <div className="flex-grow flex flex-col gap-0.5">
              <div className="flex justify-between max-w-[480px]">
                <FormCheckbox checked={data.family.financingSources.includes("parents")} onChange={(checked) => toggleFinancing("parents", checked)} disabled={readOnly} label="Parents" />
                <FormCheckbox checked={data.family.financingSources.includes("spouse")} onChange={(checked) => toggleFinancing("spouse", checked)} disabled={readOnly} label="Spouse" />
                <FormCheckbox checked={data.family.financingSources.includes("relatives")} onChange={(checked) => toggleFinancing("relatives", checked)} disabled={readOnly} label="Relatives" />
              </div>
              <div className="flex justify-between max-w-[480px]">
                <FormCheckbox checked={data.family.financingSources.includes("brother_sister")} onChange={(checked) => toggleFinancing("brother_sister", checked)} disabled={readOnly} label="Brother/Sister" />
                <FormCheckbox checked={data.family.financingSources.includes("scholarship")} onChange={(checked) => toggleFinancing("scholarship", checked)} disabled={readOnly} label="Scholarship" />
                <FormCheckbox checked={data.family.financingSources.includes("self_supporting")} onChange={(checked) => toggleFinancing("self_supporting", checked)} disabled={readOnly} label="Self-supporting/working" />
              </div>
              <div className="flex items-end gap-1 h-[18px]">
                <FormCheckbox checked={data.family.financingSources.includes("other")} onChange={(checked) => toggleFinancing("other", checked)} disabled={readOnly} label="Others, please specify:" />
                <LineInput value={data.family.financingOther} onChange={(v) => updateSection("family", { financingOther: v })} disabled={readOnly || !data.family.financingSources.includes("other")} className="flex-grow min-w-0" maxLength={50} />
              </div>
            </div>
          </div>

          {/* SECTION IV. HEALTH INFORMATION */}
          <SectionHeader number="IV">HEALTH INFORMATION</SectionHeader>
          <div className="text-[10px] font-semibold select-none">1. Do you have problems with (Please Check)</div>
          
          {/* Health Problems grid */}
          <div className="grid grid-cols-5 gap-2 mt-1">
            {[
              { key: "vision", label: "Vision" },
              { key: "speech", label: "Speech" },
              { key: "hearing", label: "Hearing" },
              { key: "generalHealth", label: "General Health" },
              { key: "physicalDisability", label: "Physical Disability" },
            ].map(({ key, label }) => (
              <div key={key} className="flex flex-col text-[10px]">
                <FormCheckbox
                  checked={!!data.health.problems[key]}
                  onChange={(checked) => updateNested("health", "problems", { [key]: checked })}
                  disabled={readOnly}
                  label={label}
                />
                <span className="text-[8px] text-gray-500 italic mt-0.5 leading-none select-none">If yes, please specify:</span>
                <input
                  type="text"
                  value={data.health.problems[`${key}Detail`] || ""}
                  onChange={(e) => updateNested("health", "problems", { [`${key}Detail`]: e.target.value })}
                  disabled={readOnly || !data.health.problems[key]}
                  maxLength={30}
                  className="w-full border-b border-black outline-none bg-transparent h-[16px] text-[10px] text-black mt-0.5 px-0.5"
                />
              </div>
            ))}
          </div>

          {/* Diagnosed Illnesses */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-2">
            <span className="font-semibold whitespace-nowrap select-none">2. Have you been diagnosed of certain illnesses before? If yes, please specify:</span>
            <LineInput value={data.health.diagnosedIllnessesNote} onChange={(v) => updateSection("health", { diagnosedIllnessesNote: v })} disabled={readOnly} className="flex-grow min-w-0" maxLength={80} />
          </div>

          {/* Psychological Tests */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-1 select-none">
            <span className="font-semibold whitespace-nowrap">3. Have you taken any psychological tests before?</span>
            <div className="flex gap-4 ml-4">
              <FormCheckbox checked={data.health.psychologicalTestsTaken === true} onChange={(c) => c && updateSection("health", { psychologicalTestsTaken: true })} disabled={readOnly} label="Yes" />
              <FormCheckbox checked={data.health.psychologicalTestsTaken === false} onChange={(c) => c && updateSection("health", { psychologicalTestsTaken: false })} disabled={readOnly} label="No" />
            </div>
          </div>

        </div>

        {/* ================= PAGE 2 ================= */}
        <div className="page-sheet" id="page-2">
          {/* Test Record header and table */}
          <div className="text-center font-bold text-[11px] uppercase tracking-wider select-none">TEST RECORD</div>
          <table className="w-full border-collapse text-[10px] mt-1.5 font-sans">
            <thead>
              <tr className="select-none">
                <th className="border-b border-black text-left font-semibold pb-1 w-[120px]">Date</th>
                <th className="border-b border-black text-left font-semibold pb-1">Kind of Test</th>
                <th className="border-b border-black text-left font-semibold pb-1 w-[120px]">Score</th>
                <th className="border-b border-black text-left font-semibold pb-1 w-[120px]">Rank</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((idx) => {
                const row = data.testRecord[idx] || { date: "", kindOfTest: "", score: "", rank: "" };
                return (
                  <tr key={idx} className="h-[22px]">
                    <td className="border-b border-black p-0">
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD"
                        value={row.date || ""}
                        onChange={(e) => handleUpdateTestRecord(idx, "date", e.target.value)}
                        disabled={readOnly}
                        className="w-full h-full border-none outline-none bg-transparent text-[10px] text-black px-1"
                      />
                    </td>
                    <td className="border-b border-black p-0">
                      <input
                        type="text"
                        value={row.kindOfTest || ""}
                        onChange={(e) => handleUpdateTestRecord(idx, "kindOfTest", e.target.value)}
                        disabled={readOnly}
                        maxLength={40}
                        className="w-full h-full border-none outline-none bg-transparent text-[10px] text-black px-1"
                      />
                    </td>
                    <td className="border-b border-black p-0">
                      <input
                        type="text"
                        value={row.score || ""}
                        onChange={(e) => handleUpdateTestRecord(idx, "score", e.target.value)}
                        disabled={readOnly}
                        maxLength={15}
                        className="w-full h-full border-none outline-none bg-transparent text-[10px] text-black px-1"
                      />
                    </td>
                    <td className="border-b border-black p-0">
                      <input
                        type="text"
                        value={row.rank || ""}
                        onChange={(e) => handleUpdateTestRecord(idx, "rank", e.target.value)}
                        disabled={readOnly}
                        maxLength={15}
                        className="w-full h-full border-none outline-none bg-transparent text-[10px] text-black px-1"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* SECTION V. OTHER INFORMATION */}
          <SectionHeader number="V">OTHER INFORMATION</SectionHeader>
          
          {/* Interest Groups */}
          <div className="text-[10px] mt-1 select-none">
            <span className="font-semibold block">1. Indicate the interest group to which you are more inclined to. (Please Check)</span>
            <div className="grid grid-cols-3 gap-y-1 mt-1 pl-2">
              <FormCheckbox checked={data.other.interestGroups.includes("sports")} onChange={(c) => toggleInterest("sports", c)} disabled={readOnly} label="Sports" />
              <FormCheckbox checked={data.other.interestGroups.includes("science")} onChange={(c) => toggleInterest("science", c)} disabled={readOnly} label="Science" />
              <FormCheckbox checked={data.other.interestGroups.includes("civic")} onChange={(c) => toggleInterest("civic", c)} disabled={readOnly} label="Civic Awareness/Service" />
              
              <FormCheckbox checked={data.other.interestGroups.includes("arts")} onChange={(c) => toggleInterest("arts", c)} disabled={readOnly} label="Arts" />
              <FormCheckbox checked={data.other.interestGroups.includes("social_studies")} onChange={(c) => toggleInterest("social_studies", c)} disabled={readOnly} label="Social Studies" />
              <div className="flex items-end gap-1 h-[18px]">
                <FormCheckbox checked={data.other.interestGroups.includes("other")} onChange={(c) => toggleInterest("other", c)} disabled={readOnly} label="Others" />
                <LineInput value={data.other.interestGroupsOther} onChange={(v) => updateSection("other", { interestGroupsOther: v })} disabled={readOnly || !data.other.interestGroups.includes("other")} className="flex-grow min-w-0" maxLength={40} />
              </div>
              
              <FormCheckbox checked={data.other.interestGroups.includes("religious")} onChange={(c) => toggleInterest("religious", c)} disabled={readOnly} label="Religious" />
            </div>
          </div>

          {/* Consulted Guidance Counselor */}
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-2 select-none">
            <span className="font-semibold whitespace-nowrap">2. Have you consulted/been sent to see the Guidance Counselor before?</span>
            <div className="flex gap-4 ml-4">
              <FormCheckbox checked={data.other.consultedBefore === true} onChange={(c) => c && updateSection("other", { consultedBefore: true })} disabled={readOnly} label="Yes" />
              <FormCheckbox checked={data.other.consultedBefore === false} onChange={(c) => c && updateSection("other", { consultedBefore: false })} disabled={readOnly} label="No" />
            </div>
          </div>
          <div className="flex items-end text-[10px] gap-1 h-[20px] mt-0.5">
            <span className="font-semibold whitespace-nowrap select-none">If yes, what was/were the reason(s)?</span>
            <LineInput value={data.other.consultedReason} onChange={(v) => updateSection("other", { consultedReason: v })} disabled={readOnly || !data.other.consultedBefore} className="flex-grow min-w-0" maxLength={100} />
          </div>

          {/* Counselor Help Needed */}
          <div className="text-[10px] mt-1.5 select-none">
            <span className="font-semibold block">3. How may your Guidance Counselor help you? Please Check</span>
            <div className="grid grid-cols-3 gap-x-6 gap-y-1 mt-1 pl-2">
              <div className="flex flex-col gap-1">
                <FormCheckbox checked={data.other.helpNeeded.includes("family")} onChange={(c) => toggleHelp("family", c)} disabled={readOnly} label="Family matters" />
                <FormCheckbox checked={data.other.helpNeeded.includes("relationship")} onChange={(c) => toggleHelp("relationship", c)} disabled={readOnly} label="Relationship problems" />
                <FormCheckbox checked={data.other.helpNeeded.includes("teachers")} onChange={(c) => toggleHelp("teachers", c)} disabled={readOnly} label="Concerns with teachers" />
                <FormCheckbox checked={data.other.helpNeeded.includes("academic")} onChange={(c) => toggleHelp("academic", c)} disabled={readOnly} label="Academic concerns" />
              </div>
              <div className="flex flex-col gap-1">
                <FormCheckbox checked={data.other.helpNeeded.includes("career")} onChange={(c) => toggleHelp("career", c)} disabled={readOnly} label="Career concerns" />
                <FormCheckbox checked={data.other.helpNeeded.includes("self")} onChange={(c) => toggleHelp("self", c)} disabled={readOnly} label="Self" />
                <FormCheckbox checked={data.other.helpNeeded.includes("financial")} onChange={(c) => toggleHelp("financial", c)} disabled={readOnly} label="Financial matters" />
                <FormCheckbox checked={data.other.helpNeeded.includes("health")} onChange={(c) => toggleHelp("health", c)} disabled={readOnly} label="Health concerns" />
              </div>
              <div className="flex flex-col gap-1 self-start">
                <div className="flex items-end gap-1 h-[18px]">
                  <FormCheckbox checked={data.other.helpNeeded.includes("other")} onChange={(c) => toggleHelp("other", c)} disabled={readOnly} label="Others, please specify:" />
                </div>
                <LineInput value={data.other.helpNeededOther} onChange={(v) => updateSection("other", { helpNeededOther: v })} disabled={readOnly || !data.other.helpNeeded.includes("other")} className="w-full mt-1" maxLength={45} />
              </div>
            </div>
          </div>

          {/* Disclaimer Block */}
          <div className="text-[9px] mt-3 leading-tight text-justify">
            <span className="font-bold text-red-600 select-none">DISCLAIMER:</span> I hereby authorize the Guidance and Counseling Section of Division of Student Affairs to collect data indicated herein for Individual Inventory and documentation purposes only. I understand that my personal information is protected by RA 10173, Data Privacy Act of 2012 and that the data collected will not be shared to other entities other than the purpose stated.
          </div>

          {/* Disclaimer Signature block */}
          <div className="flex justify-between mt-5 px-12">
            <div className="flex flex-col items-center w-[230px]">
              <LineInput value={data.acknowledgment.studentPrintedName} onChange={(v) => updateSection("acknowledgment", { studentPrintedName: v })} disabled={readOnly} className="w-full text-center" placeholder="Printed Name" maxLength={50} />
              <span className="text-[8px] font-semibold mt-1 select-none">Student's Printed Name</span>
            </div>
            <div className="flex flex-col items-center w-[180px] relative">
              {studentSigUrl ? (
                <img src={studentSigUrl} alt="Student Signature" className="absolute -top-7 h-[28px] object-contain pointer-events-none select-none" />
              ) : (
                <div className="absolute -top-4 text-[8px] text-gray-400 italic select-none">No signature</div>
              )}
              <div className="w-full border-b border-black h-4" />
              <span className="text-[8px] font-semibold mt-1 select-none">Student's Signature</span>
            </div>
          </div>

          {/* Dashed Divider Line */}
          <div className="border-t border-dashed border-black my-3.5 select-none" />

          {/* Informed Consent Notice */}
          <div className="text-center text-[9px] font-bold text-blue-600 italic select-none">
            (Important notice: Proceed to this section only if you intend to undergo counseling and listening session with a Guidance Services Specialist)
          </div>

          {/* INFORMED CONSENT */}
          <div className="text-center font-bold text-[10.5px] uppercase tracking-wider mt-1 select-none">INFORMED CONSENT</div>
          <div className="text-[8.5px] leading-tight text-justify mt-1">
            Counseling is a confidential process designed to help you address your concerns, come to a greater understanding of yourself, and learn effective personal and interpersonal coping strategies. It involves a relationship between you and a trained counselor who has the desire and willingness to help you accomplish your individual goals. Counseling involves sharing sensitive, personal, and private information that may at times be distressing. During the course of counseling, there may be periods of increased anxiety or confusion. The outcome of counseling is often positive; however, the level of satisfaction for any individual is not predictable. Your counselor is available to support you throughout the counseling process.
          </div>
          <div className="text-[8.5px] leading-tight text-justify mt-1">
            <span className="font-bold select-none">CONFIDENTIALITY:</span> All interactions with Counseling Services, including scheduling of or attendance at appointments, content of your sessions, progress in counseling, and your records are confidential. No record of counseling is contained in any academic, educational, or job placement file. You may request in writing to release specific information about your counseling to persons you designate.
          </div>
          <div className="text-[8.5px] font-bold mt-1 select-none">EXCEPTIONS TO CONFIDENTIALITY:</div>
          <ul className="list-disc pl-4 text-[8.5px] leading-tight text-justify space-y-0.5">
            <li>The counseling staff works as a team. Your counselor may consult with other counseling staff to provide the best possible care. These consultations are for professional and training purposes.</li>
            <li>If there is evidence of clear and imminent danger of harm to self and/or others, a counselor is legally required to report this information to the authorities responsible for ensuring safety.</li>
            <li>Philippine law requires that staff of Counseling Services who learn of, or strongly suspect, physical or sexual abuse or neglect of any person under 18 years of age must report this information to county child protection services.</li>
            <li>A court order, issued by a judge, may require the Counseling Services staff to release information contained in records and/or require a counselor to testify in a court hearing.</li>
          </ul>
          <div className="text-[8.5px] leading-tight text-justify mt-1">
            There is no fee for counseling services. If you are referred off campus to health, mental health, or substance abuse professionals you are responsible for their charges.
          </div>

          {/* ACKNOWLEDGMENT */}
          <div className="text-left font-bold text-[10px] uppercase mt-1 select-none">ACKNOWLEDGMENT</div>
          <div className="text-[8.5px] leading-tight text-justify">
            I acknowledge having been informed of my rights and responsibilities as a student receiving counseling services at Division of Student Affairs, Guidance and Counseling Section, Mindanao State University, Marawi City. I understand the risks and benefits of guidance and counseling services, the nature, and limits of confidentiality. By signing below, I agree to the terms and conditions of counseling.
          </div>

          {/* Acknowledgment Signature Box */}
          <div className="border border-black p-2 mt-1.5">
            <div className="flex justify-between items-end px-4">
              <div className="flex flex-col items-center w-[210px]">
                <LineInput value={data.acknowledgment.studentPrintedName} onChange={(v) => updateSection("acknowledgment", { studentPrintedName: v })} disabled={readOnly} className="w-full text-center font-bold" placeholder="Printed Name" maxLength={50} />
                <span className="text-[8px] font-semibold mt-1 select-none">Student's Printed Name</span>
              </div>
              <div className="flex flex-col items-center w-[170px] relative">
                {studentSigUrl ? (
                  <img src={studentSigUrl} alt="Student Signature" className="absolute -top-7 h-[28px] object-contain pointer-events-none select-none" />
                ) : (
                  <div className="absolute -top-4 text-[8px] text-gray-400 italic select-none">No signature</div>
                )}
                <div className="w-full border-b border-black h-4" />
                <span className="text-[8px] font-semibold mt-1 select-none">Student's Signature</span>
              </div>
              <div className="flex flex-col items-center w-[130px]">
                <LineInput type="date" value={data.acknowledgment.dateAcknowledged} onChange={(v) => updateSection("acknowledgment", { dateAcknowledged: v })} disabled={readOnly} className="w-full text-center" />
                <span className="text-[8px] font-semibold mt-1 select-none">Date Signed</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ================= EDITING & OPERATIONS PANEL (ON SCREEN ONLY) ================= */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 no-print space-y-4 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">
          Manage Test Records & Uploads
        </h4>
        
        {/* Dynamic Test Record Rows manager */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700">
            Edit/Manage Test Record Entries ({data.testRecord?.length || 0} entered)
          </label>
          <div className="overflow-x-auto">
            <table className="w-full border text-xs text-gray-600">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">Date</th>
                  <th className="border px-2 py-1 text-left">Kind of Test</th>
                  <th className="border px-2 py-1 text-left">Score</th>
                  <th className="border px-2 py-1 text-left">Rank</th>
                  <th className="border px-2 py-1 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {(!data.testRecord || data.testRecord.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-3 italic">
                      No test entries. Click "Add test entry" below to add records.
                    </td>
                  </tr>
                ) : (
                  data.testRecord.map((row, idx) => (
                    <tr key={idx} className={idx >= 3 ? "bg-red-50/50" : ""}>
                      <td className="border p-1">
                        <input
                          type="date"
                          disabled={readOnly}
                          className="w-full text-xs px-1.5 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-maroon-600 bg-white"
                          value={row.date || ""}
                          onChange={(e) => handleUpdateTestRecord(idx, "date", e.target.value)}
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="Kind of test"
                          className="w-full text-xs px-1.5 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-maroon-600 bg-white"
                          value={row.kindOfTest || ""}
                          onChange={(e) => handleUpdateTestRecord(idx, "kindOfTest", e.target.value)}
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="Score"
                          className="w-full text-xs px-1.5 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-maroon-600 bg-white"
                          value={row.score || ""}
                          onChange={(e) => handleUpdateTestRecord(idx, "score", e.target.value)}
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="Rank"
                          className="w-full text-xs px-1.5 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-maroon-600 bg-white"
                          value={row.rank || ""}
                          onChange={(e) => handleUpdateTestRecord(idx, "rank", e.target.value)}
                        />
                      </td>
                      <td className="border p-1 text-center">
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTestRow(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove row"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddTestRow}
              className="text-xs text-green-700 font-semibold hover:underline mt-1 flex items-center gap-1"
            >
              + Add test entry row
            </button>
          )}
        </div>

        {/* Signed Inventory Scan Upload (Optional) */}
        <div className="border-t border-gray-100 pt-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Signed Inventory Scan (Optional)
          </label>
          <p className="text-[11px] text-gray-500 mb-3">
            If you have a scanned paper copy (PDF / JPG / PNG, max 5 MB), you may attach it below for archiving.
          </p>
          {inventory?.scanUrl ? (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs">
              <FileUp size={16} className="text-blue-600" />
              <a href={scanHref} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline flex items-center gap-1 font-semibold">
                {inventory.scanFilename || "Inventory scan"} <ExternalLink size={12} />
              </a>
              {!readOnly && (
                <div className="ml-auto flex items-center gap-2">
                  <label className="cursor-pointer px-2.5 py-1.5 rounded-lg border text-[11px] hover:bg-white bg-gray-50 select-none">
                    Replace
                    <input key={scanInputKey} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleScanChange} />
                  </label>
                  <button type="button" onClick={() => setConfirmRemoveScan(true)} className="px-2.5 py-1.5 rounded-lg border text-[11px] text-red-600 hover:bg-red-50 bg-white">
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : (
            !readOnly && (
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-xs font-semibold text-gray-700 bg-white select-none">
                <FileUp size={14} /> Upload scan file
                <input key={scanInputKey} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleScanChange} />
              </label>
            )
          )}
        </div>
      </div>

      {/* STICKY ACTION BUTTON BAR (ON SCREEN ONLY) */}
      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-white border-t border-gray-200 mt-4 flex items-center justify-end gap-2 no-print z-50">
        <button type="button" onClick={handlePrint} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50 text-gray-700 disabled:opacity-50 text-sm font-semibold select-none">
          <Printer size={16} /> Print Form
        </button>
        <button type="button" onClick={handleDownloadDocx} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50 text-gray-700 disabled:opacity-50 text-sm font-semibold select-none">
          <FileText size={16} /> Download Word
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={isStudentView && (!hasFeedback || !hasSignature) ? undefined : handleSave}
            disabled={busy || (isStudentView && (!hasFeedback || !hasSignature))}
            title={
              isStudentView && !hasFeedback
                ? "Submit a Client Feedback Form first to enable saving"
                : isStudentView && !hasSignature
                ? "Upload your signature on your Profile page to enable saving"
                : undefined
            }
            className={`flex items-center gap-2 px-4 py-2 rounded text-white disabled:opacity-50 text-sm font-semibold select-none ${isStudentView && (!hasFeedback || !hasSignature) ? "bg-gray-400 cursor-not-allowed" : "bg-[#0B6623] hover:bg-[#074317]"}`}
          >
            <Save size={16} /> {busy ? "Saving..." : "Save inventory"}
          </button>
        )}
      </div>

      {/* MODALS */}
      <Modal
        open={confirmRemoveScan}
        onClose={() => setConfirmRemoveScan(false)}
        title="Remove inventory scan?"
        subtitle="Detach the uploaded file from this student's inventory."
        danger
        footer={
          <>
            <button onClick={() => setConfirmRemoveScan(false)} className={BTN.secondary}>
              Cancel
            </button>
            <button onClick={handleScanDelete} className={BTN.danger}>
              Remove
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-700 leading-relaxed">
          The digital form data will not be affected. Only the uploaded scan file will be detached.
        </p>
      </Modal>

      <Modal
        open={showSaveSuccess}
        onClose={() => setShowSaveSuccess(false)}
        title="Inventory Saved"
        size="sm"
        footer={
          <button onClick={() => setShowSaveSuccess(false)} className={BTN.primary}>
            Continue
          </button>
        }
      >
        <div className="flex flex-col items-center justify-center text-center p-4">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-sm text-gray-700 font-medium leading-relaxed">
            Your individual inventory record has been successfully saved and synchronized.
          </p>
        </div>
      </Modal>
    </div>
  );
}
