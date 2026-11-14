import React, { useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Modal, BTN, LABEL } from "./ui";
import PasswordField from "./PasswordField";
import { isStrongPassword } from "../utils/password";

export default function ChangePasswordModal({ open, onClose }) {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setForm({ current: "", next: "", confirm: "" });
    setError(null);
    setSuccess(false);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.current || !form.next || !form.confirm) {
      setError("All fields are required.");
      return;
    }
    if (!isStrongPassword(form.next)) {
      setError(
        "New password must be at least 8 characters with uppercase, lowercase, a number, and a symbol."
      );
      return;
    }
    if (form.next !== form.confirm) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    const res = await changePassword({ currentPassword: form.current, newPassword: form.next });
    setSaving(false);
    if (!res.success) {
      setError(res.message || "Failed to change password.");
      return;
    }
    setSuccess(true);
    setTimeout(handleClose, 1800);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Change password"
      subtitle="Enter your current password then choose a new one."
      footer={
        success ? null : (
          <>
            <button type="button" onClick={handleClose} className={BTN.secondary} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="change-pw-form" className={BTN.primary} disabled={saving}>
              <Lock size={14} /> {saving ? "Saving…" : "Save password"}
            </button>
          </>
        )
      }
    >
      {success ? (
        <div className="py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <Lock size={20} className="text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Password changed!</p>
          <p className="text-xs text-gray-500 mt-1">Closing…</p>
        </div>
      ) : (
        <form id="change-pw-form" onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className={LABEL}>Current password</label>
            <PasswordField
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className={LABEL}>New password</label>
            <PasswordField
              value={form.next}
              onChange={(e) => setForm({ ...form, next: e.target.value })}
              autoComplete="new-password"
              showMeter
            />
          </div>
          <div>
            <label className={LABEL}>Confirm new password</label>
            <PasswordField
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              autoComplete="new-password"
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
