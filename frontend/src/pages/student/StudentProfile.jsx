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
  ClipboardList,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  BTN,
  INPUT,
  LABEL,
  formatDate,
  Modal,
} from "../../components/ui";
import { useAppointments } from "../../context/AppointmentsContext";
import { useStudentRecords } from "../../context/StudentRecordsContext";
import InventoryForm from "../../components/records/InventoryForm";
import ProfileHero from "../../components/ProfileHero";
import SignatureUploadCard from "../../components/SignatureUploadCard";
import { sanitizePhoneDigits, isValidPhMobile, PHONE_HINT } from "../../utils/phone";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function StudentProfile() {
  const { currentUser, refreshCurrentUser, updateProfile, token } = useAuth();
  const { appointments, fetchAppointments } = useAppointments();
  const { getInventory, upsertInventory, uploadInventoryScan, deleteInventoryScan, getConsent } = useStudentRecords();
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [inventory, setInventory] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [consent, setConsent] = useState(null);

  const handleSaveInventory = async (formData) => {
    const res = await upsertInventory(currentUser?.id, formData);
    if (res.success) {
      setInventory(res.inventory);
    }
    return res;
  };

  const handleUploadInventoryScan = async (file) => {
    const res = await uploadInventoryScan(currentUser?.id, file);
    if (res.success) {
      setInventory(res.inventory);
    }
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
      setFormData((f) => ({
        ...f,
        name: fresh.name || "",
        email: fresh.email || "",
        phone: fresh.phone || "",
        bio: fresh.bio || "",
      }));
    });
    fetchAppointments?.().catch(() => undefined);

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
            <div className="flex items-center gap-2">
              <button onClick={() => setShowInventoryModal(true)} className={BTN.secondary}>
                <ClipboardList size={15} /> My Inventory
              </button>
              <button onClick={() => setIsEditing(true)} className={BTN.primary}>
                <Edit2 size={15} /> Edit profile
              </button>
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
                  inputMode="numeric"
                  maxLength={11}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: sanitizePhoneDigits(e.target.value) })}
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

        {/* Academic info (read-only) */}
        <SectionCard
          title="Academic information"
          subtitle="Verified by the admin office"
          action={
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
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

      {/* Counseling history */}
      <SectionCard title="Counseling history" subtitle="Your recent sessions" noBodyPadding>
        {(() => {
          const completed = (appointments || []).filter((a) => a.status === "completed");
          if (completed.length === 0) {
            return (
              <div className="px-4 py-6 text-center text-sm text-gray-500 italic">
                No completed counseling sessions recorded yet.
              </div>
            );
          }
          return (
            <ul className="divide-y divide-gray-100">
              {completed.map((a) => (
                <li key={a.id} className="px-4 py-3 hover:bg-gray-50/60 transition">
                  <p className="text-sm font-medium text-gray-900">{a.reason || "Counseling Session"}</p>
                  <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                    {formatDate(a.scheduledDate || a.preferredDate)} · with {a.counselorName || "Counselor"}
                  </p>
                </li>
              ))}
            </ul>
          );
        })()}
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
