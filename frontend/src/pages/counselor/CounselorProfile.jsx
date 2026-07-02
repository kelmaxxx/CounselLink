import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ClipboardCheck,
  ThumbsUp,
  ClipboardList,
  Lock,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";
import ProfileHero from "../../components/ProfileHero";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import { CounselorRatingBadge } from "../../components/RatingStars";
import { sanitizePhoneDigits, isValidPhMobile, PHONE_HINT } from "../../utils/phone";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const DSA_OFFICE = "Division of Student Affairs (DSA)";

export default function CounselorProfile() {
  const { currentUser, refreshCurrentUser, updateProfile, token } = useAuth();
  const navigate = useNavigate();
  const myRecord = currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
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
          <>
            <button
              onClick={() => navigate("/counselor/feedback-tally")}
              className={BTN.secondary}
            >
              <ClipboardCheck size={15} />
              Feedback Summary
            </button>
            {!isEditing ? (
              <>
                <button onClick={() => setChangePwOpen(true)} className={BTN.secondary}>
                  <Lock size={15} /> Change password
                </button>
                <button onClick={() => setIsEditing(true)} className={BTN.primary}>
                  <Edit2 size={15} />
                  Edit profile
                </button>
              </>
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
            )}
          </>
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
        topRightSlot={
          myRecord?.id ? <CounselorRatingBadge counselorId={myRecord.id} size={16} /> : null
        }
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
              <Field icon={Phone} label="Contact number">
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
            </div>
          ) : (
            <dl className="space-y-2.5 text-sm">
              <Readout icon={User} label="Name" value={myRecord?.name} />
              <Readout icon={Mail} label="Email" value={myRecord?.email} />
              <Readout icon={Phone} label="Contact number" value={myRecord?.phone || "Not provided"} />
            </dl>
          )}
        </SectionCard>

        {/* Professional information */}
        <SectionCard title="Professional information" subtitle="Your office, specialization, and employee ID">
          {isEditing ? (
            <div className="space-y-3">
              <Field icon={Building2} label="Office">
                <input type="text" value={DSA_OFFICE} disabled className={INPUT} />
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
              <Readout icon={Building2} label="Office" value={DSA_OFFICE} />
              <Readout
                icon={Award}
                label="Specialization"
                value={myRecord?.specialization || "Not provided"}
              />
              <Readout icon={Hash} label="Employee ID" value={myRecord?.employeeId || "Not assigned"} />
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

      <FeedbackTallyBar />
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

function FeedbackTallyBar() {
  const { token } = useAuth();
  const emptyTally = {
    count: 0,
    rating: { average: null },
    overallSatisfaction: { average: null },
    recommend: { yes: 0, no: 0, not_sure: 0 },
  };
  const [tally, setTally] = useState(emptyTally);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    fetch(`${API_BASE}/api/client-feedback/tally?counselorId=me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json().then((body) => ({ res, body })))
      .then(({ res, body }) => {
        if (!mounted) return;
        if (!res.ok) {
          setError(body.message || "Unable to load feedback tally");
          setTally(emptyTally);
        } else {
          setTally(body);
        }
      })
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const recommendTotal = tally.recommend.yes + tally.recommend.no + tally.recommend.not_sure;
  const recommendRate = recommendTotal ? (tally.recommend.yes / recommendTotal) * 100 : null;
  const fmt = (n) => (n === null || n === undefined ? "—" : n.toFixed(1));

  return (
    <SectionCard
      title="Student feedback"
      subtitle={
        tally.count > 0
          ? `${tally.count} response${tally.count === 1 ? "" : "s"} · Client Feedback Form (all time)`
          : "No feedback received yet"
      }
    >
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {loading ? (
        <div className="text-sm text-gray-500 text-center py-6">Loading…</div>
      ) : tally.count === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No feedback yet"
          hint="When students submit the Client Feedback Form, a summary appears here."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BarStat icon={ClipboardList} label="Responses" value={tally.count} />
          <BarStat icon={Star} label="Avg. rating" value={`${fmt(tally.rating.average)} / 5`} />
          <BarStat
            icon={ClipboardCheck}
            label="Avg. satisfaction"
            value={`${fmt(tally.overallSatisfaction.average)} / 5`}
          />
          <BarStat
            icon={ThumbsUp}
            label="Recommend rate"
            value={recommendRate === null ? "—" : `${recommendRate.toFixed(0)}%`}
          />
        </div>
      )}
    </SectionCard>
  );
}

function BarStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
        {Icon && <Icon size={13} />}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-semibold text-gray-900 tabular-nums">{value}</div>
    </div>
  );
}
