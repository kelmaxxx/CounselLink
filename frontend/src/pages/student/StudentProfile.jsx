import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  Mail,
  GraduationCap,
  Building2,
  BookOpen,
  Calendar,
  Phone,
  Edit2,
  Save,
  X,
  Hash,
  Lock,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  INPUT,
  LABEL,
  Modal,
} from "../../components/ui";
import { COLLEGES } from "../../data/mockData";
import { getDepartments, getPrograms, getCollegeName } from "../../data/msuColleges";
import { useStudentRecords } from "../../context/StudentRecordsContext";
import InventoryForm from "../../components/records/InventoryForm";
import ProfileHero from "../../components/ProfileHero";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import SignatureUploadCard from "../../components/SignatureUploadCard";
import { sanitizePhoneDigits, isValidPhMobile, PHONE_HINT } from "../../utils/phone";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const emptyForm = (u) => ({
  name: u?.name || "",
  email: u?.email || "",
  phone: u?.phone || "",
  bio: u?.bio || "",
  college: u?.college || "",
  department: u?.department || "",
  program: u?.program || "",
  yearLevel: u?.yearLevel || "",
});

export default function StudentProfile() {
  const { currentUser, refreshCurrentUser, updateProfile, token } = useAuth();
  const { getInventory, upsertInventory, uploadInventoryScan, deleteInventoryScan, getConsent } = useStudentRecords();
  const myRecord = currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [dropdownOpen]);
  const [formData, setFormData] = useState(emptyForm(myRecord));
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [inventory, setInventory] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [consent, setConsent] = useState(null);

  // Cascading dropdown options derived from current form state
  const departments = getDepartments(formData.college);
  const programs = getPrograms(formData.college, formData.department);

  const handleSaveInventory = async (fd) => {
    const res = await upsertInventory(currentUser?.id, fd);
    if (res.success) setInventory(res.inventory);
    return res;
  };

  const handleUploadInventoryScan = async (file) => {
    const res = await uploadInventoryScan(currentUser?.id, file);
    if (res.success) setInventory(res.inventory);
    return res;
  };

  const handleDeleteInventoryScan = async () => {
    const res = await deleteInventoryScan(currentUser?.id);
    if (res.success) {
      const fresh = await getInventory(currentUser?.id).catch(() => null);
      setInventory(fresh);
    }
    return res;
  };

  const handleChangePhoto = async (file) => {
    if (!file || !token) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch(`${API_BASE}/api/uploads/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      await updateProfile({
        avatarUrl: data.avatarUrl,
        avatarFileName: data.avatarFileName,
        avatarFileType: data.avatarFileType,
      });
      setMessage({ type: "success", text: "Profile photo updated" });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Unable to update photo" });
    } finally {
      setUploadingAvatar(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  useEffect(() => {
    refreshCurrentUser?.().then((fresh) => {
      if (!fresh) return;
      setFormData(emptyForm(fresh));
    });

    if (currentUser?.id) {
      getInventory(currentUser.id)
        .then((inv) => setInventory(inv))
        .catch((err) => console.error("Failed to load inventory:", err))
        .finally(() => setLoadingInventory(false));
      getConsent(currentUser.id)
        .then((c) => setConsent(c))
        .catch((err) => console.error("Failed to load consent:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      setMessage({ type: "error", text: "Name and email are required" });
      return;
    }
    if (formData.phone && !isValidPhMobile(formData.phone)) {
      setMessage({ type: "error", text: `Contact number: ${PHONE_HINT}` });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        college: formData.college,
        department: formData.department,
        program: formData.program,
        yearLevel: formData.yearLevel,
      });
      setIsEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update profile" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCancel = () => {
    setFormData(emptyForm(myRecord));
    setIsEditing(false);
  };

  const setField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Student"
        title="My profile"
        subtitle="Manage your personal information and bio."
        actions={
          isEditing ? (
            <>
              <button onClick={handleCancel} className={BTN.secondary} disabled={saving}>
                <X size={15} /> Cancel
              </button>
              <button onClick={handleSave} className={BTN.primary} disabled={saving}>
                <Save size={15} /> {saving ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className={`${BTN.secondary} gap-1.5`}
              >
                Profile actions
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden py-1">
                  <button
                    onClick={() => { setIsEditing(true); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                  >
                    <Edit2 size={14} className="text-maroon-600 flex-shrink-0" />
                    Edit profile
                  </button>
                  <button
                    onClick={() => { setChangePwOpen(true); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                  >
                    <Lock size={14} className="text-maroon-600 flex-shrink-0" />
                    Change password
                  </button>
                  <button
                    onClick={() => { setShowInventoryModal(true); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                  >
                    <ClipboardList size={14} className="text-maroon-600 flex-shrink-0" />
                    My Inventory
                  </button>
                </div>
              )}
            </div>
          )
        }
      />

      {message && (
        <div
          className={`mb-4 px-3 py-2 rounded-md border text-sm ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <ChangePasswordModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />

      <ProfileHero
        theme="student"
        name={myRecord?.name}
        subtitle={[myRecord?.program || "Student", myRecord?.yearLevel, myRecord?.college]
          .filter(Boolean)
          .join(" · ")}
        email={myRecord?.email}
        phone={myRecord?.phone}
        identifier={myRecord?.studentId}
        identifierIcon={Hash}
        avatarUrl={myRecord?.avatarUrl}
        onChangePhoto={handleChangePhoto}
        uploading={uploadingAvatar}
        chips={[
          myRecord?.college && { label: myRecord.college, icon: GraduationCap },
          myRecord?.yearLevel && { label: myRecord.yearLevel, icon: Calendar },
        ].filter(Boolean)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Personal info */}
        <SectionCard title="Personal information" subtitle="Update your contact details">
          {isEditing ? (
            <div className="space-y-3">
              <Field icon={User} label="Name *">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className={INPUT}
                  placeholder="Enter your name"
                />
              </Field>
              <Field icon={Mail} label="Email *">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className={INPUT}
                  placeholder="Enter your email"
                />
              </Field>
              <Field icon={Phone} label="Phone number">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={formData.phone}
                  onChange={(e) => setField("phone", sanitizePhoneDigits(e.target.value))}
                  className={INPUT}
                  placeholder="09XXXXXXXXX"
                />
              </Field>
              <Field icon={Hash} label="Student ID">
                <input type="text" value={myRecord?.studentId || ""} disabled className={INPUT} />
              </Field>
            </div>
          ) : (
            <dl className="space-y-2.5 text-sm">
              <Readout icon={User} label="Name" value={myRecord?.name} />
              <Readout icon={Mail} label="Email" value={myRecord?.email} />
              <Readout icon={Phone} label="Phone" value={myRecord?.phone || "Not provided"} />
              <Readout icon={Hash} label="Student ID" value={myRecord?.studentId || "Not assigned"} />
            </dl>
          )}
        </SectionCard>

        {/* Academic info */}
        <SectionCard title="Academic information" subtitle="Your college, course, and year level">
          {isEditing ? (
            <div className="space-y-3">
              <Field icon={GraduationCap} label="College">
                <select
                  className={INPUT}
                  value={formData.college}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    college: e.target.value,
                    department: "",
                    program: "",
                  }))}
                >
                  <option value="">Select college</option>
                  {COLLEGES.map((c) => (
                    <option key={c} value={c}>{c} — {getCollegeName(c)}</option>
                  ))}
                </select>
              </Field>
              <Field icon={Building2} label="Department">
                <select
                  className={INPUT}
                  value={formData.department}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    department: e.target.value,
                    program: "",
                  }))}
                  disabled={!formData.college}
                >
                  <option value="">
                    {formData.college ? "Select department" : "Select a college first"}
                  </option>
                  {formData.department && !departments.some((d) => d.name === formData.department) && (
                    <option value={formData.department}>{formData.department}</option>
                  )}
                  {departments.map((d) => (
                    <option key={d.code} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </Field>
              <Field icon={BookOpen} label="Program / course">
                <select
                  className={INPUT}
                  value={formData.program}
                  onChange={(e) => setField("program", e.target.value)}
                  disabled={!formData.department}
                >
                  <option value="">
                    {formData.department ? "Select program" : "Select a department first"}
                  </option>
                  {formData.program && !programs.includes(formData.program) && (
                    <option value={formData.program}>{formData.program}</option>
                  )}
                  {programs.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field icon={Calendar} label="Year level">
                <select
                  className={INPUT}
                  value={formData.yearLevel}
                  onChange={(e) => setField("yearLevel", e.target.value)}
                >
                  <option value="">Select year level</option>
                  {YEAR_LEVELS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </Field>
            </div>
          ) : (
            <dl className="space-y-2.5 text-sm">
              <Readout icon={GraduationCap} label="College" value={myRecord?.college || "Not set"} />
              <Readout icon={Building2} label="Department" value={myRecord?.department || "Not set"} />
              <Readout icon={BookOpen} label="Program / course" value={myRecord?.program || "Not set"} />
              <Readout icon={Calendar} label="Year level" value={myRecord?.yearLevel || "Not set"} />
            </dl>
          )}
        </SectionCard>
      </div>

      {/* About */}
      <SectionCard title="About me" subtitle="A short bio your counselor can see" className="mb-6">
        {isEditing ? (
          <textarea
            value={formData.bio}
            onChange={(e) => setField("bio", e.target.value)}
            className={`${INPUT} resize-none`}
            rows={5}
            placeholder="Tell us a bit about yourself…"
          />
        ) : myRecord?.bio ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{myRecord.bio}</p>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No bio yet. Click <span className="font-medium">Edit profile</span> to add one.
          </p>
        )}
      </SectionCard>

      <SignatureUploadCard
        className="mt-4"
        subtitle="Applied to your Inventory, Consent, and other forms when printed"
      />

      {showInventoryModal && (
        <Modal
          open
          onClose={() => setShowInventoryModal(false)}
          title="Student Individual Inventory Record"
          subtitle="MSU DSA Inventory Individual Form No. 1.1"
          size="5xl"
          align="top"
        >
          <div className="max-h-[75vh] overflow-y-auto pr-2">
            {loadingInventory ? (
              <div className="text-sm text-gray-500 py-8 text-center">Loading inventory form...</div>
            ) : (
              <InventoryForm
                inventory={inventory}
                studentName={currentUser?.name}
                studentId={currentUser?.id}
                studentProfile={currentUser}
                apiBase={API_BASE}
                consent={consent}
                onSave={handleSaveInventory}
                onUploadScan={handleUploadInventoryScan}
                onDeleteScan={handleDeleteInventoryScan}
                readOnly={false}
                isStudentView={true}
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <div>
      <label className={`${LABEL} inline-flex items-center gap-1.5`}>
        {Icon && <Icon size={12} className="text-gray-400" />}
        {label}
      </label>
      {children}
    </div>
  );
}

function Readout({ icon: Icon, label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500 font-medium inline-flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-gray-400" />}
        {label}
      </dt>
      <dd className="text-sm text-gray-900 font-medium mt-0.5">{value || "—"}</dd>
    </div>
  );
}
