import React, { useRef, useState } from "react";
import { PenLine, Upload, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SectionCard, BTN } from "./ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// Digital signature manager shown on the counselor and student profiles.
// Uploads a signature image (reusing the /api/uploads/signature endpoint) and
// stores its URL on the user via updateProfile, so document generators can
// stamp it onto printed forms automatically.
export default function SignatureUploadCard({ className = "", subtitle }) {
  const { currentUser, updateProfile, token } = useAuth();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const sigUrl = currentUser?.signatureUrl ? `${API_BASE}${currentUser.signatureUrl}` : null;
  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleFile = async (file) => {
    if (!file || !token) return;
    const okTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!okTypes.includes(file.type)) return flash("error", "Upload a PNG, JPG, or WEBP image.");
    if (file.size > 2 * 1024 * 1024) return flash("error", "File size must be under 2MB.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("signature", file);
      const res = await fetch(`${API_BASE}/api/uploads/signature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      await updateProfile({
        signatureUrl: data.signatureUrl,
        signatureFileName: data.signatureFileName,
        signatureFileType: data.signatureFileType,
      });
      flash("success", "Signature saved.");
    } catch (err) {
      flash("error", err.message || "Unable to upload signature");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await updateProfile({ signatureUrl: null, signatureFileName: null, signatureFileType: null });
      flash("success", "Signature removed.");
    } catch (err) {
      flash("error", err.message || "Unable to remove signature");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Digital signature"
      subtitle={subtitle || "Applied automatically to documents you print or generate"}
      className={className}
    >
      {msg && (
        <div
          className={`mb-3 px-3 py-2 rounded-md border text-sm ${
            msg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-56 h-24 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
          {sigUrl ? (
            <img src={sigUrl} alt="Your signature" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400 inline-flex items-center gap-1.5">
              <PenLine size={14} /> No signature yet
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={BTN.primary}>
            <Upload size={14} /> {busy ? "Working…" : sigUrl ? "Replace signature" : "Upload signature"}
          </button>
          {sigUrl && (
            <button type="button" disabled={busy} onClick={handleRemove} className={BTN.secondary}>
              <Trash2 size={14} /> Remove
            </button>
          )}
          <p className="text-xs text-gray-500 max-w-[220px]">
            A PNG with a transparent background works best. Max 2MB.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
