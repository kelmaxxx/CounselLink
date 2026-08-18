import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building,
  Briefcase,
  Mail,
  User,
  ArrowRight,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const isStrongPassword = (pw) =>
  typeof pw === "string" && pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided. Please check your email link.");
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/verify-invitation?token=${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Invalid or expired invitation link.");
        } else {
          setUserInfo(data.user);
        }
      } catch (err) {
        setError("Unable to connect to server. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const isValidPassword = isStrongPassword(password);
  const isMatch = Boolean(password && password === confirmPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidPassword) {
      setSubmitError("Password must be at least 8 characters with a letter and a number.");
      return;
    }
    if (!isMatch) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/accept-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.message || "Failed to set up account.");
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel =
    userInfo?.role === "counselor"
      ? "Guidance Counselor"
      : userInfo?.role === "college_rep"
      ? "College Representative"
      : userInfo?.role || "Staff Account";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-maroon-600 text-white shadow-lg shadow-maroon-600/30 mb-4">
          <ShieldCheck size={28} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">CounselLink</h2>
        <p className="text-sm text-gray-500 mt-1">Institutional Account Setup</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100 sm:px-8">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-maroon-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-600">Verifying invitation link...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Invitation Error</h3>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{error}</p>
              </div>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Account Ready!</h3>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                  Your password has been configured successfully. You can now log in to access your CounselLink dashboard.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-maroon-600 hover:bg-maroon-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-maroon-600/20 transition"
                >
                  Proceed to Login <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Account summary card */}
              <div className="mb-6 p-4 bg-maroon-50/60 rounded-xl border border-maroon-100">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-maroon-100 text-maroon-800 uppercase tracking-wider mb-2">
                  {roleLabel}
                </span>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <User size={16} className="text-maroon-700 flex-shrink-0" />
                  {userInfo.name}
                </h3>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  {userInfo.email}
                </p>
                {userInfo.college && (
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                    <Building size={14} className="text-gray-400 flex-shrink-0" />
                    {userInfo.college} {userInfo.department ? `(${userInfo.department})` : ""}
                  </p>
                )}
                {userInfo.position && (
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                    <Briefcase size={14} className="text-gray-400 flex-shrink-0" />
                    {userInfo.position}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">Set Your Password</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create a secure password to protect your account. Admin does not have access to your password.
                </p>
              </div>

              {submitError && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-600" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password requirements */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 space-y-1.5">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Password criteria
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={`flex items-center gap-1.5 ${password.length >= 8 ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                      <CheckCircle2 size={13} /> 8+ characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[A-Za-z]/.test(password) ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                      <CheckCircle2 size={13} /> At least 1 letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${/\d/.test(password) ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                      <CheckCircle2 size={13} /> At least 1 number
                    </div>
                    <div className={`flex items-center gap-1.5 ${isMatch ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                      <CheckCircle2 size={13} /> Passwords match
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isValidPassword || !isMatch}
                  className="w-full py-3 px-4 bg-maroon-600 hover:bg-maroon-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-md shadow-maroon-600/20 transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Setting Password...
                    </>
                  ) : (
                    <>
                      <Lock size={16} /> Complete Account Setup
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
