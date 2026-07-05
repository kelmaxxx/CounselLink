import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  Mail,
  Phone,
  Shield,
  Edit2,
  Save,
  X,
  Hash,
  Building2,
  Lock,
  ChevronDown,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";
import ProfileHero from "../../components/ProfileHero";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import { sanitizePhoneDigits, isValidPhMobile, PHONE_HINT } from "../../utils/phone";

const DSA_OFFICE = "Division of Student Affairs";
const DSA_UNIT = "DSA - Office of the Director · System Administration";

const STAFF_EMAIL_DOMAINS = ["@s.msumain.edu.ph"];
const isInstitutionalEmail = (email) => {
  const lower = String(email || "").trim().toLowerCase();
  return STAFF_EMAIL_DOMAINS.some((d) => lower.endsWith(d));
};


const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function AdminProfile() {
  const { currentUser, refreshCurrentUser, updateProfile, token } = useAuth();
  const myRecord = currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);
  const [formData, setFormData] = useState({
    name: myRecord?.name || "",
    email: myRecord?.email || "",
    phone: myRecord?.phone || "",
    employeeId: myRecord?.employeeId || "",
  });
  const emailHint = `Must end with ${STAFF_EMAIL_DOMAINS.join(" or ")}`;
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
      setFormData((f) => ({
        ...f,
        name: fresh.name || "",
        email: fresh.email || "",
        phone: fresh.phone || "",
        employeeId: fresh.employeeId || "",
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      setMessage({ type: "error", text: "Name and institutional email are required" });
      return;
    }
    if (!isInstitutionalEmail(formData.email)) {
      setMessage({ type: "error", text: emailHint });
      return;
    }
    if (formData.phone && !isValidPhMobile(formData.phone)) {
      setMessage({ type: "error", text: `Phone number: ${PHONE_HINT}` });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employeeId,
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
      employeeId: myRecord?.employeeId || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Administrator"
        title="My profile"
        subtitle="Manage your administrator account."
        actions={
          !isEditing ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen((o) => !o)}
                className={BTN.secondary}
              >
                <Edit2 size={15} /> Manage <ChevronDown size={13} className={`transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg ring-1 ring-gray-950/10 z-30 py-1 overflow-hidden">
                  <button
                    onClick={() => { setIsEditing(true); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                  >
                    <Edit2 size={14} className="text-gray-400" /> Edit profile
                  </button>
                  <button
                    onClick={() => { setChangePwOpen(true); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                  >
                    <Lock size={14} className="text-gray-400" /> Change password
                  </button>
                </div>
              )}
            </div>
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
          className={`mb-4 px-3 py-2 rounded-md border text-sm ${message.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700"
            }`}
        >
          {message.text}
        </div>
      )}

      <ProfileHero
        theme="admin"
        name={myRecord?.name}
        subtitle={`${DSA_OFFICE} · ${DSA_UNIT}`}
        email={myRecord?.email}
        phone={myRecord?.phone}
        identifier={myRecord?.employeeId}
        identifierIcon={Hash}
        avatarUrl={myRecord?.avatarUrl}
        onChangePhoto={handleChangePhoto}
        uploading={uploadingAvatar}
        chips={[{ label: "Full system access", icon: Shield }]}
      />

      <ChangePasswordModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />

      <div className="mb-6">
        <SectionCard title="Administrator information" subtitle="Contact and identity">
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
              <Field icon={Mail} label="Institutional Email *">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={INPUT}
                  placeholder={`username@msu.edu.ph`}
                />
                <p className="text-xs text-gray-400 mt-1">{emailHint}</p>
              </Field>
              <Field icon={Phone} label="Phone number">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: sanitizePhoneDigits(e.target.value) })}
                  className={INPUT}
                  placeholder="09XXXXXXXXX"
                />
              </Field>
              <Field icon={Hash} label="Employee ID">
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className={INPUT}
                  placeholder="e.g. EMP-00123"
                />
              </Field>
            </div>
          ) : (
            <dl className="space-y-2.5 text-sm">
              <Readout icon={User} label="Name" value={myRecord?.name} />
              <Readout icon={Mail} label="Institutional Email" value={myRecord?.email} />
              <Readout icon={Phone} label="Phone" value={myRecord?.phone || "Not provided"} />
              <Readout icon={Hash} label="Employee ID" value={myRecord?.employeeId || "Not assigned"} />
              <Readout icon={Shield} label="Role" value="System Administrator" />
              <Readout icon={Building2} label="Office" value={DSA_OFFICE} />
            </dl>
          )}
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
      <dt className="text-xs uppercase tracking-wider text-gray-500 font-medium inline-flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-gray-400" />}
        {label}
      </dt>
      <dd className="text-sm text-gray-900 font-medium mt-0.5">{value || "—"}</dd>
    </div>
  );
}
