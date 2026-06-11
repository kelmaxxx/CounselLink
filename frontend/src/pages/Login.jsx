// src/pages/Login.jsx
import React, { useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { COLLEGES } from "../data/mockData";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Hash,
  UserRound,
  Phone,
  ArrowLeft,
} from "lucide-react";
import { Modal, BTN, INPUT, LABEL } from "../components/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "counselor", label: "Counselor" },
  { value: "college_rep", label: "Rep" },
  { value: "admin", label: "Admin" },
];

// Mirrors the backend password policy (backend/utils/password.js)
const isStrongPassword = (pw) =>
  typeof pw === "string" && pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);

const emptyLoginErrors = { identifier: "", password: "", form: "" };
const emptySignupErrors = {
  name: "",
  email: "",
  studentId: "",
  phone: "",
  password: "",
  confirmPassword: "",
  cor: "",
  form: "",
};

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [selectedRole, setSelectedRole] = useState("student");
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    college: COLLEGES[0],
    studentId: "",
    phone: "",
    corImage: null,
    corFile: null,
  });

  const [loginErrors, setLoginErrors] = useState(emptyLoginErrors);
  const [signupErrors, setSignupErrors] = useState(emptySignupErrors);
  const [corPreview, setCorPreview] = useState(null);

  const identifierLabel = useMemo(
    () => (selectedRole === "student" ? "Student ID" : "Email address"),
    [selectedRole]
  );

  const resetLoginErrors = () => setLoginErrors(emptyLoginErrors);
  const resetSignupErrors = () => setSignupErrors(emptySignupErrors);

  const handleLoginChange = (e) => {
    resetLoginErrors();
    setLoginForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSignupChange = (e) => {
    resetSignupErrors();
    setSignupForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleCorUpload = (e) => {
    resetSignupErrors();
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setSignupErrors((prev) => ({ ...prev, cor: "Upload a JPG, PNG, or PDF file." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSignupErrors((prev) => ({ ...prev, cor: "File size must be under 5MB." }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignupForm((p) => ({ ...p, corImage: reader.result, corFile: file }));
      setCorPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const validateLogin = () => {
    const nextErrors = { ...emptyLoginErrors };
    if (!loginForm.identifier.trim()) {
      nextErrors.identifier = `${identifierLabel} is required.`;
    }
    if (!loginForm.password) {
      nextErrors.password = "Password is required.";
    }
    return nextErrors;
  };

  const validateSignup = () => {
    const nextErrors = { ...emptySignupErrors };
    if (!signupForm.name.trim()) nextErrors.name = "Full name is required.";
    if (!signupForm.email.trim()) nextErrors.email = "Email is required.";
    if (!signupForm.studentId.trim()) nextErrors.studentId = "Student ID is required.";
    if (!signupForm.password) nextErrors.password = "Password is required.";
    if (signupForm.password && !isStrongPassword(signupForm.password)) {
      nextErrors.password = "Use at least 8 characters with a letter and a number.";
    }
    if (!signupForm.confirmPassword) nextErrors.confirmPassword = "Confirm your password.";
    if (
      signupForm.password &&
      signupForm.confirmPassword &&
      signupForm.password !== signupForm.confirmPassword
    ) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!signupForm.corImage) {
      nextErrors.cor = "Please upload your Certificate of Registration (COR).";
    }
    const emailLower = signupForm.email.toLowerCase();
    const allowedDomains = ["@msu.edu.ph", "@s.msumain.edu.ph", "@msumain.edu.ph"];
    if (signupForm.email && !allowedDomains.some((d) => emailLower.endsWith(d))) {
      nextErrors.email = "Use your MSU institutional email (e.g., name@s.msumain.edu.ph).";
    }
    return nextErrors;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    resetLoginErrors();
    const validation = validateLogin();
    if (Object.values(validation).some(Boolean)) {
      setLoginErrors(validation);
      return;
    }
    setLoginLoading(true);
    const res = await login({
      identifier: loginForm.identifier,
      password: loginForm.password,
      role: selectedRole,
    });
    if (!res.success) {
      setLoginErrors((prev) => ({ ...prev, form: res.message || "Invalid credentials." }));
    } else {
      navigate("/", { replace: true });
    }
    setLoginLoading(false);
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    resetSignupErrors();
    const validation = validateSignup();
    if (Object.values(validation).some(Boolean)) {
      setSignupErrors(validation);
      return;
    }
    setSignupLoading(true);
    const res = await signup({
      name: signupForm.name,
      email: signupForm.email,
      password: signupForm.password,
      role: signupForm.role,
      college: signupForm.college,
      studentId: signupForm.studentId,
      phone: signupForm.phone,
      corImage: signupForm.corImage,
      corFile: signupForm.corFile,
    });
    if (!res.success) {
      setSignupErrors((prev) => ({ ...prev, form: res.message || "Signup failed." }));
    } else {
      setShowSignupSuccess(true);
      setIsSignup(false);
    }
    setSignupLoading(false);
  };

  if (showSignupSuccess) {
    return (
      <AuthShell>
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-gray-950/5 w-full max-w-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-4">
            <CheckCircle2 size={26} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1.5 tracking-tight">
            Registration submitted
          </h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            We&apos;ll email you once an administrator approves your account.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowSignupSuccess(false);
              setIsSignup(false);
            }}
            className={`${BTN.primary} w-full`}
          >
            Back to login
          </button>
        </div>
      </AuthShell>
    );
  }

  if (isSignup) {
    return (
      <AuthShell>
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-gray-950/5 w-full max-w-md p-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-6">
            Create your account
          </h1>

          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <FieldRow label="Full name *" error={signupErrors.name}>
              <input
                name="name"
                value={signupForm.name}
                onChange={handleSignupChange}
                className={INPUT}
                placeholder="Juan Dela Cruz"
                required
              />
            </FieldRow>

            <FieldRow
              label="Institutional email *"
              hint="@s.msumain.edu.ph"
              error={signupErrors.email}
            >
              <InputWithIcon icon={Mail}>
                <input
                  name="email"
                  type="email"
                  value={signupForm.email}
                  onChange={handleSignupChange}
                  className={`${INPUT} pl-9`}
                  placeholder="name@s.msumain.edu.ph"
                  required
                />
              </InputWithIcon>
            </FieldRow>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow label="Student ID *" error={signupErrors.studentId}>
                <InputWithIcon icon={Hash}>
                  <input
                    name="studentId"
                    value={signupForm.studentId}
                    onChange={handleSignupChange}
                    className={`${INPUT} pl-9`}
                    placeholder="202329207"
                    required
                  />
                </InputWithIcon>
              </FieldRow>
              <FieldRow label="Phone (optional)">
                <InputWithIcon icon={Phone}>
                  <input
                    name="phone"
                    type="tel"
                    value={signupForm.phone}
                    onChange={handleSignupChange}
                    className={`${INPUT} pl-9`}
                    placeholder="09XX XXX XXXX"
                  />
                </InputWithIcon>
              </FieldRow>
            </div>

            <FieldRow label="College *">
              <select
                name="college"
                value={signupForm.college}
                onChange={handleSignupChange}
                className={INPUT}
              >
                {COLLEGES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FieldRow>

            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-gray-800">
                  Certificate of Registration *
                </p>
                <p className="text-xs text-gray-400">JPG, PNG or PDF · max 5 MB</p>
              </div>

              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleCorUpload}
                className="hidden"
                id="cor-upload"
              />

              {!corPreview ? (
                <label
                  htmlFor="cor-upload"
                  className={`${BTN.secondary} w-full cursor-pointer`}
                >
                  <Upload size={14} /> Choose file
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-medium">
                    <CheckCircle2 size={14} /> File uploaded
                  </div>
                  {signupForm.corImage?.startsWith("data:image") && (
                    <img
                      src={corPreview}
                      alt="COR preview"
                      className="w-full h-32 object-contain border border-gray-200 rounded-md bg-white"
                    />
                  )}
                  {signupForm.corImage?.startsWith("data:application/pdf") && (
                    <div className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-md">
                      <FileText size={18} className="text-red-500" />
                      <span className="text-xs text-gray-700">PDF file uploaded</span>
                    </div>
                  )}
                  <label
                    htmlFor="cor-upload"
                    className="inline-block text-xs text-maroon-700 hover:text-maroon-800 cursor-pointer font-medium"
                  >
                    Change file
                  </label>
                </div>
              )}
              {signupErrors.cor && (
                <p className="text-xs text-red-600 mt-2">{signupErrors.cor}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow label="Password *" error={signupErrors.password}>
                <InputWithIcon icon={Lock} trailing={
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((s) => !s)}
                    className="text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showSignupPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }>
                  <input
                    name="password"
                    type={showSignupPassword ? "text" : "password"}
                    value={signupForm.password}
                    onChange={handleSignupChange}
                    className={`${INPUT} pl-9 pr-9`}
                    placeholder="At least 8 characters"
                    required
                  />
                </InputWithIcon>
              </FieldRow>
              <FieldRow label="Confirm password *" error={signupErrors.confirmPassword}>
                <InputWithIcon icon={Lock}>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={signupForm.confirmPassword}
                    onChange={handleSignupChange}
                    className={`${INPUT} pl-9`}
                    placeholder="Repeat password"
                    required
                  />
                </InputWithIcon>
              </FieldRow>
            </div>

            {signupErrors.form && (
              <div className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
                {signupErrors.form}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsSignup(false)}
                className="text-sm text-maroon-700 hover:text-maroon-800 font-medium inline-flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Back to login
              </button>
              <button type="submit" disabled={signupLoading} className={BTN.primary}>
                {signupLoading ? "Creating account…" : "Create account"}
              </button>
            </div>
          </form>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="bg-white rounded-2xl shadow-xl ring-1 ring-gray-950/5 w-full max-w-sm p-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-6">
          CounselLink
        </h1>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <RoleSelector
            value={selectedRole}
            onChange={(value) => {
              setSelectedRole(value);
              resetLoginErrors();
            }}
          />

          <FieldRow label={identifierLabel} error={loginErrors.identifier}>
            <InputWithIcon icon={selectedRole === "student" ? UserRound : Mail}>
              <input
                name="identifier"
                value={loginForm.identifier}
                onChange={handleLoginChange}
                type={selectedRole === "student" ? "text" : "email"}
                required
                className={`${INPUT} pl-9`}
                placeholder={
                  selectedRole === "student" ? "" : `${selectedRole}@msu.edu.ph`
                }
              />
            </InputWithIcon>
          </FieldRow>

          <FieldRow label="Password" error={loginErrors.password}>
            <InputWithIcon
              icon={Lock}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((s) => !s)}
                  className="text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            >
              <input
                name="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                type={showLoginPassword ? "text" : "password"}
                required
                className={`${INPUT} pl-9 pr-9`}
                placeholder="••••••••"
              />
            </InputWithIcon>
          </FieldRow>

          {loginErrors.form && (
            <div className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
              {loginErrors.form}
            </div>
          )}

          {(selectedRole === "counselor" || selectedRole === "college_rep") && (
            <p className="text-xs text-gray-500 -mt-1 text-center">
              Accounts are created by the DSA admin.
            </p>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                resetLoginErrors();
                setForgotOpen(true);
              }}
              className="text-sm text-maroon-700 hover:text-maroon-800 font-medium"
            >
              Forgot password?
            </button>
            {selectedRole === "student" && (
              <button
                type="button"
                onClick={() => {
                  setIsSignup(true);
                  resetSignupErrors();
                }}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Create an account
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className={`${BTN.primary} w-full`}
          >
            {loginLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      {forgotOpen && (
        <ForgotPasswordModal onClose={() => setForgotOpen(false)} />
      )}
    </AuthShell>
  );
}

function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-600 via-maroon-700 to-maroon-800 flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center">
        <img
          src="/counselink-round.png"
          alt="CounselLink"
          className="h-24 w-24 object-contain mb-3"
        />
        <p className="text-sm text-white/80 mb-6">Student counseling at MSU-Marawi</p>
        {children}
        <p className="mt-6 text-center text-xs text-white/60">
          © {new Date().getFullYear()} MSU-Marawi · Division of Student Affairs
        </p>
      </div>
    </div>
  );
}

function RoleSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl" role="tablist">
      {ROLE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={`py-2 rounded-lg text-xs font-medium transition-colors ${
            opt.value === value
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FieldRow({ label, hint, error, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className={LABEL}>{label}</label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function InputWithIcon({ icon: Icon, trailing, children }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      )}
      {children}
      {trailing && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
      )}
    </div>
  );
}

function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitRequest = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Unable to request reset.");
      } else {
        setMessage(data.message || "Check your email for a 6-digit code.");
        setStep("otp");
      }
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid code.");
      } else {
        setToken(data.token);
        setStep("reset");
      }
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Unable to resend code.");
      } else {
        setMessage("A new code has been sent.");
      }
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!isStrongPassword(password)) {
      setError("Use at least 8 characters with a letter and a number.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Unable to reset password.");
      } else {
        setMessage(data.message || "Password updated.");
        setStep("done");
      }
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const subtitleByStep = {
    request: "Enter your registered email. We'll send you a 6-digit verification code.",
    otp: `Enter the 6-digit code we sent to ${email || "your email"}. Expires in 10 minutes.`,
    reset: "Choose a new password to finish.",
    done: "All set.",
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Forgot password"
      subtitle={subtitleByStep[step]}
      size="md"
      footer={
        step === "done" ? (
          <button type="button" onClick={onClose} className={BTN.primary}>
            Back to login
          </button>
        ) : step === "request" ? (
          <>
            <button type="button" onClick={onClose} className={BTN.secondary}>
              Cancel
            </button>
            <button
              type="submit"
              form="forgot-request-form"
              disabled={loading}
              className={BTN.primary}
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </>
        ) : step === "otp" ? (
          <>
            <button
              type="button"
              onClick={() => {
                setStep("request");
                setOtp("");
                setError("");
                setMessage("");
              }}
              className={BTN.secondary}
            >
              Back
            </button>
            <button
              type="submit"
              form="forgot-otp-form"
              disabled={loading}
              className={BTN.primary}
            >
              {loading ? "Verifying…" : "Verify code"}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className={BTN.secondary}>
              Cancel
            </button>
            <button
              type="submit"
              form="forgot-reset-form"
              disabled={loading}
              className={BTN.primary}
            >
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </>
        )
      }
    >
      {step === "request" && (
        <form id="forgot-request-form" onSubmit={submitRequest} className="space-y-3">
          <div>
            <label className={LABEL}>Email</label>
            <InputWithIcon icon={Mail}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${INPUT} pl-9`}
                placeholder="you@s.msumain.edu.ph"
                required
                autoFocus
              />
            </InputWithIcon>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      {step === "otp" && (
        <form id="forgot-otp-form" onSubmit={submitOtp} className="space-y-3">
          {message && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              {message}
            </div>
          )}
          <OtpInput value={otp} onChange={setOtp} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-gray-500">
            Didn't receive it?{" "}
            <button
              type="button"
              onClick={resendOtp}
              disabled={loading}
              className="text-maroon-700 hover:text-maroon-800 font-medium disabled:opacity-60"
            >
              Resend code
            </button>
          </p>
        </form>
      )}

      {step === "reset" && (
        <form id="forgot-reset-form" onSubmit={submitReset} className="space-y-3">
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle2 size={14} /> Code verified. Set a new password.
          </div>
          <div>
            <label className={LABEL}>New password</label>
            <InputWithIcon icon={Lock}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT} pl-9`}
                placeholder="At least 8 characters"
                required
                autoFocus
              />
            </InputWithIcon>
          </div>
          <div>
            <label className={LABEL}>Confirm password</label>
            <InputWithIcon icon={Lock}>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`${INPUT} pl-9`}
                required
              />
            </InputWithIcon>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      {step === "done" && (
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 size={20} />
          <span className="font-medium">{message}</span>
        </div>
      )}
    </Modal>
  );
}

function OtpInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  const handleChange = (idx, raw) => {
    const ch = raw.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[idx] = ch || " ";
    const joined = next.join("").replace(/\s+$/g, "");
    onChange(joined);
    if (ch && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx].trim() && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (inputs.current[idx] = el)}
          inputMode="numeric"
          maxLength={1}
          value={digits[idx].trim()}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          className="w-10 h-12 text-center text-lg font-semibold tabular-nums border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-maroon-500/25 focus:border-maroon-500"
          aria-label={`Digit ${idx + 1}`}
        />
      ))}
    </div>
  );
}
