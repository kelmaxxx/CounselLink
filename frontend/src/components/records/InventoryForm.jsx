// src/components/records/InventoryForm.jsx
// Digital version of the MSU DSA Student Individual Inventory Record Form
// (Doc Code: MSU DSA Inventory Individual Form No. 1.1, Revision No. 5).
//
// Field set mirrors the wet-paper form section by section. The whole form is
// stored as a JSON blob in student_inventories.form_data — the shape below is
// the contract; do not rename keys without a data migration.
import React, { useEffect, useMemo, useState } from "react";
import { Save, FileUp, Trash2, ExternalLink, Printer, FileDown, CheckCircle2 } from "lucide-react";
import { Modal, BTN } from "../ui";
import { downloadInventoryAsPdf } from "../../utils/inventoryReport";

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

export const blankInventory = () => ({
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
  },
});

// Merge stored form_data over the blank shape so old records still render even
// if we later add new fields.
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

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, type = "text", placeholder = "", disabled = false }) {
  return (
    <input
      type={type}
      className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

function CheckboxList({ options, values, onChange, disabled = false }) {
  const toggle = (val) => {
    if (disabled) return;
    if (values.includes(val)) onChange(values.filter((v) => v !== val));
    else onChange([...values, val]);
  };
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={values.includes(opt.value)}
            onChange={() => toggle(opt.value)}
            disabled={disabled}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function SectionHeader({ children }) {
  return <h4 className="text-sm font-semibold text-maroon-700 uppercase tracking-wide border-b border-gray-200 pb-1 mt-6 mb-3">{children}</h4>;
}

export default function InventoryForm({
  inventory,
  studentName,
  studentId,
  studentProfile = {},
  apiBase,
  onSave,
  onUploadScan,
  onDeleteScan,
  readOnly = false,
}) {
  const [data, setData] = useState(() => mergeInventory(inventory?.formData));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [scanInputKey, setScanInputKey] = useState(0); // forces file input remount after upload
  const [confirmRemoveScan, setConfirmRemoveScan] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    setData(mergeInventory(inventory?.formData));
  }, [inventory?.id, inventory?.updatedAt, inventory?.formData]);

  const updateSection = (section, patch) =>
    setData((d) => ({ ...d, [section]: { ...d[section], ...patch } }));

  const updateNested = (section, key, patch) =>
    setData((d) => ({ ...d, [section]: { ...d[section], [key]: { ...d[section][key], ...patch } } }));

  const updateBackgroundRow = (idx, patch) =>
    setData((d) => ({
      ...d,
      educational: {
        ...d.educational,
        background: d.educational.background.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
      },
    }));

  const updateTestRow = (idx, patch) =>
    setData((d) => ({
      ...d,
      testRecord: d.testRecord.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));

  const addTestRow = () =>
    setData((d) => ({ ...d, testRecord: [...d.testRecord, { date: "", kindOfTest: "", score: "", rank: "" }] }));

  const removeTestRow = (idx) =>
    setData((d) => ({ ...d, testRecord: d.testRecord.filter((_, i) => i !== idx) }));

  const showFeedback = (type, text, ms = 3000) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), ms);
  };

  const handleSave = async () => {
    setBusy(true);
    const res = await onSave(data);
    setBusy(false);
    if (res.success) {
      setShowSaveSuccess(true);
    } else {
      alert(res.message || "Failed to save");
    }
    showFeedback(res.success ? "success" : "error", res.success ? "Inventory saved" : (res.message || "Failed to save"));
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

  return (
    <div className="space-y-2">
      {feedback && (
        <div className={`p-2 rounded border text-sm ${feedback.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {feedback.text}
        </div>
      )}

      {/* Header strip */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div><span className="font-medium text-gray-700">Doc Code:</span> MSU DSA Inventory Individual Form No. 1.1</div>
        <div><span className="font-medium text-gray-700">Revision No.:</span> 5</div>
        <div><span className="font-medium text-gray-700">Page:</span> 1 of 2</div>
        <div><span className="font-medium text-gray-700">Issue Date:</span> 04/04/2024</div>
      </div>

      <p className="text-xs text-gray-600 italic">
        DIRECTION: Please complete this inventory as accurately and honestly as you can. The purpose of collecting this
        information is to be of assistance to you in making choices and decisions. All information which you provide
        about yourself will be treated with utmost confidentiality.
      </p>

      {/* I. PERSONAL INFORMATION */}
      <SectionHeader>I. Personal Information</SectionHeader>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="I.D. Number"><TextInput value={data.personal.idNumber} onChange={(v) => updateSection("personal", { idNumber: v })} disabled={readOnly} /></Field>
        <Field label="Sex">
          <select className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100" disabled={readOnly} value={data.personal.sex} onChange={(e) => updateSection("personal", { sex: e.target.value })}>
            <option value="">—</option><option value="male">Male</option><option value="female">Female</option>
          </select>
        </Field>
        <Field label="Age"><TextInput type="number" value={data.personal.age} onChange={(v) => updateSection("personal", { age: v })} disabled={readOnly} /></Field>
        <Field label="Date of Birth"><TextInput type="date" value={data.personal.dateOfBirth} onChange={(v) => updateSection("personal", { dateOfBirth: v })} disabled={readOnly} /></Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Surname"><TextInput value={data.personal.surname} onChange={(v) => updateSection("personal", { surname: v })} disabled={readOnly} /></Field>
        <Field label="First Name"><TextInput value={data.personal.firstName} onChange={(v) => updateSection("personal", { firstName: v })} disabled={readOnly} /></Field>
        <Field label="Middle Name"><TextInput value={data.personal.middleName} onChange={(v) => updateSection("personal", { middleName: v })} disabled={readOnly} /></Field>
      </div>
      <Field label="Civil Status">
        <select className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100" disabled={readOnly} value={data.personal.civilStatus} onChange={(e) => updateSection("personal", { civilStatus: e.target.value })}>
          <option value="">—</option>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="separated">Separated</option>
          <option value="widow">Widow</option>
          <option value="solo_parent">Solo Parent</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Course"><TextInput value={data.personal.course} onChange={(v) => updateSection("personal", { course: v })} disabled={readOnly} /></Field>
        <Field label="Year Level"><TextInput value={data.personal.yearLevel} onChange={(v) => updateSection("personal", { yearLevel: v })} disabled={readOnly} /></Field>
        <Field label="A.Y."><TextInput value={data.personal.academicYear} onChange={(v) => updateSection("personal", { academicYear: v })} placeholder="2025-2026" disabled={readOnly} /></Field>
        <Field label="GPA"><TextInput value={data.personal.gpa} onChange={(v) => updateSection("personal", { gpa: v })} disabled={readOnly} /></Field>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Height (m)"><TextInput value={data.personal.heightM} onChange={(v) => updateSection("personal", { heightM: v })} disabled={readOnly} /></Field>
        <Field label="Weight (kg)"><TextInput value={data.personal.weightKg} onChange={(v) => updateSection("personal", { weightKg: v })} disabled={readOnly} /></Field>
        <Field label="Place of Birth" className="col-span-2 md:col-span-2"><TextInput value={data.personal.placeOfBirth} onChange={(v) => updateSection("personal", { placeOfBirth: v })} disabled={readOnly} /></Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Present Address" className="md:col-span-2"><TextInput value={data.personal.presentAddress} onChange={(v) => updateSection("personal", { presentAddress: v })} disabled={readOnly} /></Field>
        <Field label="Address Type">
          <select className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100" disabled={readOnly} value={data.personal.presentAddressType} onChange={(e) => updateSection("personal", { presentAddressType: e.target.value })}>
            <option value="residential">Residential</option>
            <option value="boarding">Boarding House</option>
            <option value="dormitory">Dormitory</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Email Address"><TextInput type="email" value={data.personal.emailAddress} onChange={(v) => updateSection("personal", { emailAddress: v })} disabled={readOnly} /></Field>
        <Field label="Mobile No."><TextInput value={data.personal.mobileNo} onChange={(v) => updateSection("personal", { mobileNo: v })} disabled={readOnly} /></Field>
      </div>
      <Field label="Hometown Address"><TextInput value={data.personal.hometownAddress} onChange={(v) => updateSection("personal", { hometownAddress: v })} disabled={readOnly} /></Field>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Religion"><TextInput value={data.personal.religion} onChange={(v) => updateSection("personal", { religion: v })} disabled={readOnly} /></Field>
        <Field label="Citizenship"><TextInput value={data.personal.citizenship} onChange={(v) => updateSection("personal", { citizenship: v })} disabled={readOnly} /></Field>
        <Field label="Tribe"><TextInput value={data.personal.tribe} onChange={(v) => updateSection("personal", { tribe: v })} disabled={readOnly} /></Field>
      </div>
      <Field label="If working, name and address of employer">
        <TextInput value={data.personal.employerNameAddress} onChange={(v) => updateSection("personal", { employerNameAddress: v })} disabled={readOnly} />
      </Field>
      <div className="bg-gray-50 border border-gray-200 rounded p-3">
        <p className="text-xs font-medium text-gray-700 mb-2">Person to be contacted in case of emergency</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Name"><TextInput value={data.personal.emergencyName} onChange={(v) => updateSection("personal", { emergencyName: v })} disabled={readOnly} /></Field>
          <Field label="Contact No."><TextInput value={data.personal.emergencyContactNo} onChange={(v) => updateSection("personal", { emergencyContactNo: v })} disabled={readOnly} /></Field>
          <Field label="Address"><TextInput value={data.personal.emergencyAddress} onChange={(v) => updateSection("personal", { emergencyAddress: v })} disabled={readOnly} /></Field>
          <Field label="Relationship"><TextInput value={data.personal.emergencyRelationship} onChange={(v) => updateSection("personal", { emergencyRelationship: v })} disabled={readOnly} /></Field>
        </div>
      </div>

      {/* II. EDUCATIONAL BACKGROUND */}
      <SectionHeader>II. Educational Background</SectionHeader>
      <div className="overflow-x-auto">
        <table className="w-full border text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-2 py-1 text-left">Level</th>
              <th className="border px-2 py-1 text-left">School Graduated</th>
              <th className="border px-2 py-1 text-left">School Address</th>
              <th className="border px-2 py-1 text-left">Public/Private</th>
              <th className="border px-2 py-1 text-left">Year Graduated</th>
              <th className="border px-2 py-1 text-left">Honors / Special Awards</th>
            </tr>
          </thead>
          <tbody>
            {data.educational.background.map((row, idx) => (
              <tr key={row.level}>
                <td className="border px-2 py-1 font-medium text-gray-700">{row.level}</td>
                <td className="border p-1"><input className="w-full text-xs px-1 py-1 border-0 focus:outline-none" disabled={readOnly} value={row.schoolGraduated} onChange={(e) => updateBackgroundRow(idx, { schoolGraduated: e.target.value })} /></td>
                <td className="border p-1"><input className="w-full text-xs px-1 py-1 border-0 focus:outline-none" disabled={readOnly} value={row.schoolAddress} onChange={(e) => updateBackgroundRow(idx, { schoolAddress: e.target.value })} /></td>
                <td className="border p-1">
                  <select className="w-full text-xs px-1 py-1 border-0 focus:outline-none disabled:bg-gray-100" disabled={readOnly} value={row.publicPrivate} onChange={(e) => updateBackgroundRow(idx, { publicPrivate: e.target.value })}>
                    <option value="">—</option><option value="public">Public</option><option value="private">Private</option>
                  </select>
                </td>
                <td className="border p-1"><input className="w-full text-xs px-1 py-1 border-0 focus:outline-none" disabled={readOnly} value={row.yearGraduated} onChange={(e) => updateBackgroundRow(idx, { yearGraduated: e.target.value })} /></td>
                <td className="border p-1"><input className="w-full text-xs px-1 py-1 border-0 focus:outline-none" disabled={readOnly} value={row.honors} onChange={(e) => updateBackgroundRow(idx, { honors: e.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <Field label="Nature of Schooling">
          <select className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100" disabled={readOnly} value={data.educational.natureOfSchooling} onChange={(e) => updateSection("educational", { natureOfSchooling: e.target.value })}>
            <option value="continuous">Continuous</option>
            <option value="interrupted">Interrupted</option>
          </select>
        </Field>
        {data.educational.natureOfSchooling === "interrupted" && (
          <Field label="If interrupted, why?">
            <TextInput value={data.educational.interruptedReason} onChange={(v) => updateSection("educational", { interruptedReason: v })} disabled={readOnly} />
          </Field>
        )}
      </div>

      {/* III. HOME AND FAMILY BACKGROUND */}
      <SectionHeader>III. Home and Family Background</SectionHeader>
      {[
        { key: "father", label: "Father" },
        { key: "mother", label: "Mother" },
      ].map(({ key, label }) => (
        <div key={key} className="bg-gray-50 border border-gray-200 rounded p-3 mb-2">
          <p className="text-xs font-medium text-gray-700 mb-2">{label}</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Field label="Name" className="md:col-span-2"><TextInput value={data.family[key].name} onChange={(v) => updateNested("family", key, { name: v })} disabled={readOnly} /></Field>
            <Field label="Age"><TextInput type="number" value={data.family[key].age} onChange={(v) => updateNested("family", key, { age: v })} disabled={readOnly} /></Field>
            <Field label="Status">
              <select className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100" disabled={readOnly} value={data.family[key].livingStatus} onChange={(e) => updateNested("family", key, { livingStatus: e.target.value })}>
                <option value="living">Living</option>
                <option value="deceased">Deceased</option>
              </select>
            </Field>
            <Field label="Occupation"><TextInput value={data.family[key].occupation} onChange={(v) => updateNested("family", key, { occupation: v })} disabled={readOnly} /></Field>
          </div>
          <div className="mt-2">
            <Field label="Educational Attainment">
              <TextInput value={data.family[key].educationalAttainment} onChange={(v) => updateNested("family", key, { educationalAttainment: v })} disabled={readOnly} />
            </Field>
          </div>
        </div>
      ))}
      <div className="bg-gray-50 border border-gray-200 rounded p-3">
        <p className="text-xs font-medium text-gray-700 mb-2">Guardian (if any)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Name" className="md:col-span-2"><TextInput value={data.family.guardian.name} onChange={(v) => updateNested("family", "guardian", { name: v })} disabled={readOnly} /></Field>
          <Field label="Age"><TextInput type="number" value={data.family.guardian.age} onChange={(v) => updateNested("family", "guardian", { age: v })} disabled={readOnly} /></Field>
          <Field label="Occupation"><TextInput value={data.family.guardian.occupation} onChange={(v) => updateNested("family", "guardian", { occupation: v })} disabled={readOnly} /></Field>
        </div>
        <div className="mt-2">
          <Field label="Educational Attainment">
            <TextInput value={data.family.guardian.educationalAttainment} onChange={(v) => updateNested("family", "guardian", { educationalAttainment: v })} disabled={readOnly} />
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <Field label="Parents' Marital Relationship">
          <select className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100" disabled={readOnly} value={data.family.parentsMaritalStatus} onChange={(e) => updateSection("family", { parentsMaritalStatus: e.target.value })}>
            <option value="married_together">Married and staying together</option>
            <option value="married_separated">Married but separated</option>
            <option value="not_married_living_together">Not married but living together</option>
            <option value="single_parent">Single Parent</option>
            <option value="other">Other</option>
          </select>
        </Field>
        {data.family.parentsMaritalStatus === "other" && (
          <Field label="Please specify">
            <TextInput value={data.family.parentsMaritalOther} onChange={(v) => updateSection("family", { parentsMaritalOther: v })} disabled={readOnly} />
          </Field>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-2">
        <Field label="No. of children (incl. self)"><TextInput type="number" value={data.family.siblingsTotal} onChange={(v) => updateSection("family", { siblingsTotal: v })} disabled={readOnly} /></Field>
        <Field label="No. of brothers"><TextInput type="number" value={data.family.brothersCount} onChange={(v) => updateSection("family", { brothersCount: v })} disabled={readOnly} /></Field>
        <Field label="No. of sisters"><TextInput type="number" value={data.family.sistersCount} onChange={(v) => updateSection("family", { sistersCount: v })} disabled={readOnly} /></Field>
      </div>
      <Field label="Who finances your schooling?">
        <CheckboxList options={FINANCING_OPTIONS} values={data.family.financingSources} onChange={(vals) => updateSection("family", { financingSources: vals })} disabled={readOnly} />
      </Field>
      <Field label="Others (please specify)">
        <TextInput value={data.family.financingOther} onChange={(v) => updateSection("family", { financingOther: v })} disabled={readOnly} />
      </Field>

      {/* IV. HEALTH INFORMATION */}
      <SectionHeader>IV. Health Information</SectionHeader>
      <p className="text-xs text-gray-600 mb-2">1. Do you have problems with? (check and specify)</p>
      <div className="space-y-2">
        {[
          { key: "vision", label: "Vision" },
          { key: "speech", label: "Speech" },
          { key: "hearing", label: "Hearing" },
          { key: "generalHealth", label: "General Health" },
          { key: "physicalDisability", label: "Physical Disability" },
        ].map(({ key, label }) => (
          <div key={key} className="grid grid-cols-3 gap-3 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" disabled={readOnly} checked={!!data.health.problems[key]} onChange={(e) => updateNested("health", "problems", { [key]: e.target.checked })} />
              {label}
            </label>
            <div className="col-span-2">
              <TextInput placeholder="If yes, please specify" value={data.health.problems[`${key}Detail`]} onChange={(v) => updateNested("health", "problems", { [`${key}Detail`]: v })} disabled={readOnly || !data.health.problems[key]} />
            </div>
          </div>
        ))}
      </div>
      <Field label="2. Have you been diagnosed of certain illnesses before? If yes, please specify.">
        <textarea rows={2} className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100" disabled={readOnly} value={data.health.diagnosedIllnessesNote} onChange={(e) => updateSection("health", { diagnosedIllnessesNote: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" disabled={readOnly} checked={!!data.health.psychologicalTestsTaken} onChange={(e) => updateSection("health", { psychologicalTestsTaken: e.target.checked })} />
        3. Have you taken any psychological tests before?
      </label>

      {/* TEST RECORD */}
      <SectionHeader>Test Record</SectionHeader>
      <table className="w-full border text-xs">
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
          {data.testRecord.length === 0 ? (
            <tr><td colSpan={5} className="text-center text-gray-500 py-2 border">No test entries.</td></tr>
          ) : data.testRecord.map((row, idx) => (
            <tr key={idx}>
              <td className="border p-1"><input type="date" disabled={readOnly} className="w-full text-xs px-1 py-1 border-0 focus:outline-none" value={row.date} onChange={(e) => updateTestRow(idx, { date: e.target.value })} /></td>
              <td className="border p-1"><input disabled={readOnly} className="w-full text-xs px-1 py-1 border-0 focus:outline-none" value={row.kindOfTest} onChange={(e) => updateTestRow(idx, { kindOfTest: e.target.value })} /></td>
              <td className="border p-1"><input disabled={readOnly} className="w-full text-xs px-1 py-1 border-0 focus:outline-none" value={row.score} onChange={(e) => updateTestRow(idx, { score: e.target.value })} /></td>
              <td className="border p-1"><input disabled={readOnly} className="w-full text-xs px-1 py-1 border-0 focus:outline-none" value={row.rank} onChange={(e) => updateTestRow(idx, { rank: e.target.value })} /></td>
              <td className="border p-1 text-center">
                {!readOnly && (
                  <button type="button" onClick={() => removeTestRow(idx)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Remove row"><Trash2 size={12} /></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button type="button" onClick={addTestRow} className="text-xs text-maroon-600 hover:underline mt-1">+ Add test entry</button>
      )}

      {/* V. OTHER INFORMATION */}
      <SectionHeader>V. Other Information</SectionHeader>
      <Field label="1. Indicate the interest group(s) to which you are more inclined">
        <CheckboxList options={INTEREST_OPTIONS} values={data.other.interestGroups} onChange={(vals) => updateSection("other", { interestGroups: vals })} disabled={readOnly} />
      </Field>
      <Field label="Others (please specify)">
        <TextInput value={data.other.interestGroupsOther} onChange={(v) => updateSection("other", { interestGroupsOther: v })} disabled={readOnly} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
        <input type="checkbox" disabled={readOnly} checked={!!data.other.consultedBefore} onChange={(e) => updateSection("other", { consultedBefore: e.target.checked })} />
        2. Have you consulted/been sent to see the Guidance Counselor before?
      </label>
      {data.other.consultedBefore && (
        <Field label="If yes, what was/were the reason(s)?">
          <textarea rows={2} className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100" disabled={readOnly} value={data.other.consultedReason} onChange={(e) => updateSection("other", { consultedReason: e.target.value })} />
        </Field>
      )}
      <Field label="3. How may your Guidance Counselor help you?">
        <CheckboxList options={HELP_OPTIONS} values={data.other.helpNeeded} onChange={(vals) => updateSection("other", { helpNeeded: vals })} disabled={readOnly} />
      </Field>
      <Field label="Others (please specify)">
        <TextInput value={data.other.helpNeededOther} onChange={(v) => updateSection("other", { helpNeededOther: v })} disabled={readOnly} />
      </Field>

      {/* ACKNOWLEDGMENT */}
      <SectionHeader>Acknowledgment</SectionHeader>
      <p className="text-xs text-gray-600">
        I hereby authorize the Guidance and Counseling Section of Division of Student Affairs to collect data
        indicated herein for Individual Inventory and documentation purposes only. I understand that my personal
        information is protected by RA 10173, Data Privacy Act of 2012 and that the data collected will not be
        shared to other entities other than the purpose stated.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <Field label="Student's Printed Name"><TextInput value={data.acknowledgment.studentPrintedName} onChange={(v) => updateSection("acknowledgment", { studentPrintedName: v })} placeholder={studentName || ""} disabled={readOnly} /></Field>
        <Field label="Date Acknowledged"><TextInput type="date" value={data.acknowledgment.dateAcknowledged} onChange={(v) => updateSection("acknowledgment", { dateAcknowledged: v })} disabled={readOnly} /></Field>
      </div>
      <p className="text-xs text-gray-500 italic">Student's signature is captured separately on the uploaded scan or via the Informed Consent e-sign page.</p>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-white border-t border-gray-200 mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={() => downloadInventoryAsPdf(data, studentProfile)} className="flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50 text-gray-700">
          <Printer size={16} /> Print Form
        </button>
        <button type="button" onClick={() => downloadInventoryAsPdf(data, studentProfile)} className="flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50 text-gray-700">
          <FileDown size={16} /> Save as PDF
        </button>
        {!readOnly && (
          <button type="button" onClick={handleSave} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded bg-maroon-600 text-white hover:bg-maroon-700 disabled:opacity-50">
            <Save size={16} /> {busy ? "Saving..." : "Save inventory"}
          </button>
        )}
      </div>

      {/* Scan section */}
      <SectionHeader>Signed Inventory Scan (Optional)</SectionHeader>
      <p className="text-xs text-gray-600 mb-2">
        If the student also signed a paper copy, you may upload a scan (PDF / JPG / PNG, max 5 MB).
      </p>
      {inventory?.scanUrl ? (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <FileUp size={16} className="text-blue-600" />
          <a href={scanHref} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline flex items-center gap-1">
            {inventory.scanFilename || "Inventory scan"} <ExternalLink size={12} />
          </a>
          {!readOnly && (
            <div className="ml-auto flex items-center gap-2">
              <label className="cursor-pointer px-3 py-1.5 rounded border text-xs hover:bg-gray-50">
                Replace
                <input key={scanInputKey} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleScanChange} />
              </label>
              <button type="button" onClick={() => setConfirmRemoveScan(true)} className="px-3 py-1.5 rounded border text-xs text-red-600 hover:bg-red-50">Remove</button>
            </div>
          )}
        </div>
      ) : (
        !readOnly && (
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm hover:bg-gray-50">
            <FileUp size={14} /> Upload scan
            <input key={scanInputKey} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleScanChange} />
          </label>
        )
      )}

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
