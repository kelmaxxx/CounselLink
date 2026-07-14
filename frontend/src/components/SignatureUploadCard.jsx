import React, { useState } from "react";
import { PenLine, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SectionCard, BTN } from "./ui";
import SignaturePad from "./SignaturePad";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// Digital signature manager shown on the counselor and student profiles.
// Lets users draw their signature directly in the browser (mouse or touch),
// then saves it via /api/uploads/signature so document generators can
// stamp it onto printed forms automatically.
export default function SignatureUploadCard({ className = "", subtitle }) {
  const { currentUser, updateProfile, token } = useAuth();
  const [showPad, setShowPad] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const sigUrl = currentUser?.signatureUrl ? `${API_BASE}${currentUser.signatureUrl}` : null;

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleSaveDrawn = async (blob) => {
    if (!blob || !token) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("signature", blob, "signature.png");
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
      setShowPad(false);
      flash("success", "Signature saved.");
    } catch (err) {
      flash("error", err.message || "Unable to save signature");
    } finally {
      setBusy(false);
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
    <>
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
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowPad(true)}
              className={BTN.primary}
            >
              <PenLine size={14} /> {busy ? "Working…" : sigUrl ? "Redraw signature" : "Draw signature"}
            </button>
            {sigUrl && (
              <button type="button" disabled={busy} onClick={handleRemove} className={BTN.secondary}>
                <Trash2 size={14} /> Remove
              </button>
            )}
            <p className="text-xs text-gray-500 max-w-[220px]">
              Sign with your mouse or finger. Applied to all generated documents.
            </p>
          </div>
        </div>
      </SectionCard>

      {showPad && (
        <SignaturePad
          onSave={handleSaveDrawn}
          onClose={() => !busy && setShowPad(false)}
          busy={busy}
        />
      )}
    </>
  );
}
