import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Award,
  FileText,
  Edit2,
  Save,
  X,
  Star,
  Hash,
  MessageSquare,
  Building2,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
} from "../../components/ui";
import ProfileHero from "../../components/ProfileHero";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const DSA_OFFICE = "Division of Student Affairs (DSA)";

const DSA_UNITS = [
  "DSA - Counseling & Guidance Services",
  "DSA - Psychological Services",
  "DSA - Wellness & Career Services",
  "DSA - Office of the Director",
];

export default function CounselorProfile() {
  const { currentUser, refreshCurrentUser, updateProfile, token } = useAuth();
  const myRecord = currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: myRecord?.name || "",
    email: myRecord?.email || "",
    phone: myRecord?.phone || "",
    employeeId: myRecord?.employeeId || "",
    department: myRecord?.department || "",
    specialization: myRecord?.specialization || "",
    bio: myRecord?.bio || "",
  });
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
        department: fresh.department || "",
        specialization: fresh.specialization || "",
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
        department: formData.department,
        specialization: formData.specialization,
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
      department: myRecord?.department || "",
      specialization: myRecord?.specialization || "",
      bio: myRecord?.bio || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Counselor"
        title="My profile"
        subtitle="Manage your professional information and what students see."
        actions={
          !isEditing ? (
            <button onClick={() => setIsEditing(true)} className={BTN.primary}>
              <Edit2 size={15} />
              Edit profile
            </button>
          ) : (
            <>
              <button onClick={handleCancel} className={BTN.secondary} disabled={saving}>
                <X size={15} />
                Cancel
              </button>
              <button onClick={handleSave} className={BTN.primary} disabled={saving}>
                <Save size={15} />
                {saving ? "Saving…" : "Save changes"}
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

      <ProfileHero
        theme="counselor"
        name={myRecord?.name}
        subtitle={DSA_OFFICE}
        email={myRecord?.email}
        phone={myRecord?.phone}
        identifier={myRecord?.employeeId}
        identifierIcon={Hash}
        avatarUrl={myRecord?.avatarUrl}
        onChangePhoto={handleChangePhoto}
        uploading={uploadingAvatar}
        chips={[
          myRecord?.department && { label: myRecord.department, icon: Briefcase },
          myRecord?.specialization && { label: myRecord.specialization, icon: Award },
        ].filter(Boolean)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Personal information */}
        <SectionCard title="Personal information" subtitle="Contact and identity details">
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
              <Field icon={Hash} label="Employee ID">
                <input
                  type="text"
                  value={myRecord?.employeeId || ""}
                  disabled
                  className={INPUT}
                />
              </Field>
            </div>
          ) : (
            <dl className="space-y-2.5 text-sm">
              <Readout icon={User} label="Name" value={myRecord?.name} />
              <Readout icon={Mail} label="Email" value={myRecord?.email} />
              <Readout icon={Phone} label="Phone" value={myRecord?.phone || "Not provided"} />
              <Readout icon={Hash} label="Employee ID" value={myRecord?.employeeId || "Not assigned"} />
              <Readout icon={User} label="Role" value="DSA Counselor" />
            </dl>
          )}
        </SectionCard>

        {/* DSA affiliation */}
        <SectionCard title="DSA affiliation" subtitle="Your office, unit, and expertise">
          {isEditing ? (
            <div className="space-y-3">
              <Field icon={Building2} label="Office">
                <input type="text" value={DSA_OFFICE} disabled className={INPUT} />
              </Field>
              <Field icon={Briefcase} label="DSA unit">
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className={INPUT}
                >
                  <option value="">Select DSA unit</option>
                  {DSA_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </Field>
              <Field icon={Award} label="Specialization">
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className={INPUT}
                  placeholder="e.g. Academic Counseling, Career Guidance"
                />
              </Field>
            </div>
          ) : (
            <dl className="space-y-2.5 text-sm">
              <Readout icon={Building2} label="Office" value={DSA_OFFICE} />
              <Readout
                icon={Briefcase}
                label="DSA unit"
                value={myRecord?.department || "Not provided"}
              />
              <Readout
                icon={Award}
                label="Specialization"
                value={myRecord?.specialization || "Not provided"}
              />
            </dl>
          )}
        </SectionCard>
      </div>

      {/* About */}
      <SectionCard
        title="About me"
        subtitle="A short bio shown on your public counselor profile"
        className="mb-6"
      >
        {isEditing ? (
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className={`${INPUT} resize-none`}
            rows={5}
            placeholder="Tell students about yourself and your counseling approach…"
          />
        ) : myRecord?.bio ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{myRecord.bio}</p>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No bio yet. Click <span className="font-medium">Edit profile</span> to add information
            about yourself and your counseling approach.
          </p>
        )}
      </SectionCard>

      <FeedbackPanel />
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

function FeedbackPanel() {
  const { token } = useAuth();
  const [data, setData] = useState({ items: [], count: 0, average: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    fetch(`${API_BASE}/api/feedback?counselorId=me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json().then((body) => ({ res, body })))
      .then(({ res, body }) => {
        if (!mounted) return;
        if (!res.ok) {
          setError(body.message || "Unable to load feedback");
          setData({ items: [], count: 0, average: null });
        } else {
          setData({
            items: Array.isArray(body.items) ? body.items : [],
            count: body.count || 0,
            average: body.average,
          });
        }
      })
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <SectionCard
      title="Student feedback"
      subtitle={
        data.count > 0
          ? `${data.count} response${data.count === 1 ? "" : "s"} · average ${
              data.average?.toFixed(1) ?? "—"
            } / 5`
          : "No feedback received yet"
      }
      noBodyPadding
      action={
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                fill={data.average && i < Math.round(data.average) ? "currentColor" : "none"}
                stroke="currentColor"
              />
            ))}
          </div>
          {data.average !== null && data.average !== undefined && (
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {data.average?.toFixed(1)}
            </span>
          )}
        </div>
      }
    >
      {error && (
        <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}
      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
      ) : data.items.length === 0 && !error ? (
        <EmptyState
          icon={MessageSquare}
          title="No feedback yet"
          hint="When students submit feedback after a session, it will appear here."
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {data.items.map((fb) => (
            <li key={fb.id} className="px-4 py-3 hover:bg-gray-50/60 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {initialsOf(fb.studentName) || "AN"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fb.studentName || "Anonymous"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {fb.created_at ? new Date(fb.created_at).toLocaleString() : ""}
                    </p>
                    {fb.comment && (
                      <p className="text-sm text-gray-700 mt-1 leading-relaxed">{fb.comment}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-amber-500 flex-shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={i < fb.rating ? "currentColor" : "none"}
                      stroke="currentColor"
                    />
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
