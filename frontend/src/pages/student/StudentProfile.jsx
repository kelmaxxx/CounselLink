import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  Mail,
  GraduationCap,
  BookOpen,
  Calendar,
  Phone,
  Edit2,
  Save,
  X,
  Hash,
  Info,
  Lock,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
} from "../../components/ui";

export default function StudentProfile() {
  const { currentUser, refreshCurrentUser, updateProfile } = useAuth();
  const myRecord = currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: myRecord?.name || "",
    email: myRecord?.email || "",
    phone: myRecord?.phone || "",
    bio: myRecord?.bio || "",
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
        bio: fresh.bio || "",
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
        bio: formData.bio,
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
      bio: myRecord?.bio || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Student"
        title="My profile"
        subtitle="Manage your personal information and bio."
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
            <p className="text-sm text-gray-500 truncate">
              {myRecord?.program || "Student"}
              {myRecord?.yearLevel ? ` · ${myRecord.yearLevel}` : ""}
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
              {myRecord?.studentId && (
                <span className="inline-flex items-center gap-1">
                  <Hash size={12} className="text-gray-400" />
                  {myRecord.studentId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Personal info */}
        <SectionCard title="Personal information" subtitle="Update your contact details">
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

        {/* Academic info (read-only) */}
        <SectionCard
          title="Academic information"
          subtitle="Verified by the admin office"
          action={
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              <Lock size={10} /> Read-only
            </span>
          }
        >
          <dl className="space-y-2.5 text-sm">
            <Readout
              icon={GraduationCap}
              label="College"
              value={myRecord?.college || "Not set"}
            />
            <Readout
              icon={BookOpen}
              label="Program / course"
              value={myRecord?.program || "Not set"}
            />
            <Readout icon={Calendar} label="Year level" value={myRecord?.yearLevel || "Not set"} />
          </dl>
          <div className="mt-3 flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <p>
              Academic information is verified by the admin from your Certificate of Registration.
              Contact the admin office if it needs to be corrected.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* About */}
      <SectionCard
        title="About me"
        subtitle="A short bio your counselor can see"
        className="mb-6"
      >
        {isEditing ? (
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className={`${INPUT} resize-none`}
            rows={5}
            placeholder="Tell us a bit about yourself…"
          />
        ) : myRecord?.bio ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {myRecord.bio}
          </p>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No bio yet. Click <span className="font-medium">Edit profile</span> to add one.
          </p>
        )}
      </SectionCard>

      {/* Counseling history (placeholder; keep style aligned) */}
      <SectionCard title="Counseling history" subtitle="Your recent sessions" noBodyPadding>
        <ul className="divide-y divide-gray-100">
          <li className="px-4 py-3 hover:bg-gray-50/60 transition">
            <p className="text-sm font-medium text-gray-900">Academic guidance session</p>
            <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
              November 15, 2025 · with Dr. Maria Santos
            </p>
          </li>
          <li className="px-4 py-3 hover:bg-gray-50/60 transition">
            <p className="text-sm font-medium text-gray-900">Career planning consultation</p>
            <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
              October 8, 2025 · with Dr. Maria Santos
            </p>
          </li>
        </ul>
      </SectionCard>
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
