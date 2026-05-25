import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Edit2,
  Save,
  X,
  Hash,
  Dot,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
} from "../../components/ui";

const COLLEGES = [
  "CAS - College of Arts and Sciences",
  "COE - College of Engineering",
  "CICS - College of Information and Computing Sciences",
  "COB - College of Business",
  "CED - College of Education",
  "COL - College of Law",
  "COM - College of Medicine",
];

const RESPONSIBILITIES = [
  "Access and review open counseling data for your college",
  "Request detailed student counseling records from DSA",
  "Generate and export reports for your college",
  "Collaborate with counselors on student welfare",
];

export default function RepProfile() {
  const { currentUser, refreshCurrentUser, updateProfile } = useAuth();
  const myRecord = currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: myRecord?.name || "",
    email: myRecord?.email || "",
    phone: myRecord?.phone || "",
    college: myRecord?.college || "",
    employeeId: myRecord?.employeeId || "",
  });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshCurrentUser?.().then((fresh) => {
      if (!fresh) return;
      setFormData((f) => ({
        ...f,
        name: fresh.name || "",
        email: fresh.email || "",
        phone: fresh.phone || "",
        college: fresh.college || "",
        employeeId: fresh.employeeId || "",
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      setMessage({ type: "error", text: "Name and email are required" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        college: formData.college,
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
    setFormData({
      name: myRecord?.name || "",
      email: myRecord?.email || "",
      phone: myRecord?.phone || "",
      college: myRecord?.college || "",
      employeeId: myRecord?.employeeId || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="College Dean"
        title="My profile"
        subtitle="Manage your representative account."
        actions={
          !isEditing ? (
            <button onClick={() => setIsEditing(true)} className={BTN.primary}>
              <Edit2 size={15} /> Edit profile
            </button>
          ) : (
            <>
              <button onClick={handleCancel} className={BTN.secondary} disabled={saving}>
                <X size={15} /> Cancel
              </button>
              <button onClick={handleSave} className={BTN.primary} disabled={saving}>
                <Save size={15} /> {saving ? "Saving…" : "Save changes"}
              </button>
            </>
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

      {/* Hero card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-lg font-semibold flex-shrink-0">
            {initialsOf(myRecord?.name) || <User size={24} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {myRecord?.name || "—"}
            </h3>
            <p className="text-sm text-gray-500 truncate inline-flex items-center gap-1.5">
              <GraduationCap size={13} className="text-maroon-600" />
              College Dean
              {myRecord?.college ? ` · ${myRecord.college}` : ""}
            </p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1">
                <Mail size={12} className="text-gray-400" />
                {myRecord?.email || "—"}
              </span>
              {myRecord?.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={12} className="text-gray-400" />
                  {myRecord.phone}
                </span>
              )}
              {myRecord?.employeeId && (
                <span className="inline-flex items-center gap-1">
                  <Hash size={12} className="text-gray-400" />
                  {myRecord.employeeId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Personal information" subtitle="Contact and identity">
          {isEditing ? (
            <div className="space-y-3">
              <Field icon={User} label="Name *">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={INPUT}
                  placeholder="Enter your name"
                />
              </Field>
              <Field icon={Mail} label="Email *">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={INPUT}
                  placeholder="Enter your email"
                />
              </Field>
              <Field icon={Phone} label="Phone number">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={INPUT}
                  placeholder="Enter phone number"
                />
              </Field>
              <Field icon={GraduationCap} label="College">
                <select
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  className={INPUT}
                >
                  <option value="">Select college</option>
                  {COLLEGES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field icon={Hash} label="Employee ID">
                <input type="text" value={myRecord?.employeeId || ""} disabled className={INPUT} />
              </Field>
            </div>
          ) : (
            <dl className="space-y-2.5 text-sm">
              <Readout icon={User} label="Name" value={myRecord?.name} />
              <Readout icon={Mail} label="Email" value={myRecord?.email} />
              <Readout icon={Phone} label="Phone" value={myRecord?.phone || "Not provided"} />
              <Readout icon={GraduationCap} label="College" value={myRecord?.college || "Not assigned"} />
              <Readout icon={Hash} label="Employee ID" value={myRecord?.employeeId || "Not assigned"} />
            </dl>
          )}
        </SectionCard>

        <SectionCard
          title="Responsibilities"
          subtitle="Your role in CounseLink"
          noBodyPadding
        >
          <ul className="divide-y divide-gray-100">
            {RESPONSIBILITIES.map((r) => (
              <li key={r} className="px-4 py-2.5 text-sm text-gray-700 flex items-start gap-2">
                <Dot className="text-maroon-600 flex-shrink-0" size={20} />
                <span className="-ml-1">{r}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
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
      <dt className="text-[11px] uppercase tracking-wider text-gray-500 font-medium inline-flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-gray-400" />}
        {label}
      </dt>
      <dd className="text-sm text-gray-900 font-medium mt-0.5">{value || "—"}</dd>
    </div>
  );
}
