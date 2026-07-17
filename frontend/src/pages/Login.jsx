// src/pages/Login.jsx
import React, { useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { COLLEGES } from "../data/mockData";
import { getDepartments, getPrograms, getCollegeName } from "../data/msuColleges";
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
  AlertTriangle,
} from "lucide-react";
import { Modal, BTN, INPUT, LABEL } from "../components/ui";
import { sanitizePhoneDigits, isValidPhMobile, PHONE_HINT } from "../utils/phone";
import { compressImage } from "../utils/compressImage";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";


// Mirrors the backend password policy (backend/utils/password.js)
const isStrongPassword = (pw) =>
  typeof pw === "string" && pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);

// Mirrors the backend student-email allowlist (backend/controllers/auth.controller.js)
const STUDENT_EMAIL_DOMAINS = ["@s.msumain.edu.ph"];
const isAllowedStudentEmail = (email) => {
  const lower = String(email || "").trim().toLowerCase();
  return STUDENT_EMAIL_DOMAINS.some((d) => lower.endsWith(d));
};

const emptyLoginErrors = { identifier: "", password: "", form: "" };
const emptySignupErrors = {
  name: "",
  email: "",
  studentId: "",
  phone: "",
  department: "",
  program: "",
  password: "",
  confirmPassword: "",
  cor: "",
  avatar: "",
  form: "",
};

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
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
    department: "",
    program: "",
    studentId: "",
    phone: "",
    corImage: null,
    corFile: null,
    avatarImage: null,
    avatarFile: null,
  });

  const [loginErrors, setLoginErrors] = useState(emptyLoginErrors);
  const [signupErrors, setSignupErrors] = useState(emptySignupErrors);
  const [corPreview, setCorPreview] = useState(null);

  // Email-mailbox verification (student signup).
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [emailVerifyMsg, setEmailVerifyMsg] = useState("");

  const canSendCode = isAllowedStudentEmail(signupForm.email);
  const resetLoginErrors = () => setLoginErrors(emptyLoginErrors);
  const resetSignupErrors = () => setSignupErrors(emptySignupErrors);

  const handleLoginChange = (e) => {
    resetLoginErrors();
    setLoginForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSignupChange = (e) => {
    resetSignupErrors();
    const { name, value } = e.target;
    // Changing college invalidates the current department selection — reset it so
    // the cascading dropdown only ever holds a department that belongs to the college.
    if (name === "college") {
      setSignupForm((p) => ({ ...p, college: value, department: "", program: "" }));
      return;
    }
    // Changing department invalidates the chosen program — reset it so the
    // program dropdown only ever holds a program that belongs to the department.
    if (name === "department") {
      setSignupForm((p) => ({ ...p, department: value, program: "" }));
      return;
    }
    if (name === "email") {
      setEmailVerified(false);
      setEmailCodeSent(false);
      setEmailOtp("");
      setEmailVerifyMsg("");
    }
    setSignupForm((p) => ({
      ...p,
      [name]:
        name === "phone" ? sanitizePhoneDigits(value) :
          name === "studentId" ? value.replace(/\D/g, "").slice(0, 9) :
            value,
    }));
  };

  const handleSendSignupCode = async () => {
    if (!canSendCode) {
      setSignupErrors((prev) => ({
        ...prev,
        email: "Use your MSU institutional email (e.g., name@s.msumain.edu.ph).",
      }));
      return;
    }
    setSignupErrors((prev) => ({ ...prev, email: "" }));
    setEmailVerifyMsg("");
    setSendingCode(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupForm.email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSignupErrors((prev) => ({ ...prev, email: data.message || "Unable to send code." }));
        return;
      }
      setEmailCodeSent(true);
      setEmailOtp("");
      setEmailVerifyMsg(data.message || "A 6-digit code has been sent to your email.");
    } catch {
      setSignupErrors((prev) => ({ ...prev, email: "Network error. Please try again." }));
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifySignupCode = async () => {
    const code = emailOtp.replace(/\D/g, "");
    if (code.length !== 6) {
      setSignupErrors((prev) => ({ ...prev, email: "Enter the 6-digit code from your email." }));
      return;
    }
    setSignupErrors((prev) => ({ ...prev, email: "" }));
    setEmailVerifyMsg("");
    setVerifyingCode(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupForm.email.trim(), code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSignupErrors((prev) => ({ ...prev, email: data.message || "Invalid code." }));
        return;
      }
      setEmailVerified(true);
      setEmailCodeSent(false);
      setEmailOtp("");
      setEmailVerifyMsg("");
    } catch {
      setSignupErrors((prev) => ({ ...prev, email: "Network error. Please try again." }));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleCorUpload = async (e) => {
    resetSignupErrors();
    const original = e.target.files[0];
    if (!original) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(original.type)) {
      setSignupErrors((prev) => ({ ...prev, cor: "Upload a JPG, PNG, or PDF file." }));
      return;
    }

    // Shrink oversized phone photos (PDFs pass through) *before* the size check,
    // so a large HD scan can still fit under the 5MB limit.
    const file = await compressImage(original, { maxDimension: 2200, quality: 0.82 });

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

  const handleAvatarUpload = async (e) => {
    resetSignupErrors();
    const original = e.target.files[0];
    if (!original) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(original.type)) {
      setSignupErrors((prev) => ({ ...prev, avatar: "Upload a JPG or PNG file." }));
      return;
    }

    // A 2x2 photo only needs to be ~1000px; compress the HD original down first.
    const file = await compressImage(original, { maxDimension: 1000, quality: 0.85 });

    if (file.size > 2 * 1024 * 1024) {
      setSignupErrors((prev) => ({ ...prev, avatar: "File size must be under 2MB." }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignupForm((p) => ({ ...p, avatarImage: reader.result, avatarFile: file }));
    };
    reader.readAsDataURL(file);
  };

  const validateLogin = () => {
    const nextErrors = { ...emptyLoginErrors };
    if (!loginForm.identifier.trim()) {
      nextErrors.identifier = "Student ID or email is required.";
    }
    if (!loginForm.password) {
      nextErrors.password = "Password is required.";
    }
    return nextErrors;
  };


  const validateStep = (step) => {
    const next = { ...emptySignupErrors };
    if (step === 1) {
      if (!signupForm.name.trim()) next.name = "Full name is required.";
      if (!/^\d{9}$/.test(signupForm.studentId)) next.studentId = "Student ID must be exactly 9 digits.";
      if (!signupForm.email.trim()) next.email = "Email is required.";
      else {
        const emailLower = signupForm.email.toLowerCase();
        const allowed = ["@s.msumain.edu.ph"];
        if (!allowed.some((d) => emailLower.endsWith(d)))
          next.email = "Use your MSU institutional email (e.g., name@s.msumain.edu.ph).";
      }
      if (signupForm.phone && !isValidPhMobile(signupForm.phone)) next.phone = PHONE_HINT;
      if (!next.email && !emailVerified)
        next.email = "Please verify your email address first.";
    }
    if (step === 2) {
      if (!signupForm.department) next.department = "Please select your department.";
      if (!signupForm.program) next.program = "Please select your program / course.";
    }
    if (step === 3) {
      if (!signupForm.corImage) next.cor = "Please upload your Certificate of Registration (COR).";
    }
    if (step === 4) {
      if (!signupForm.password) next.password = "Password is required.";
      else if (!isStrongPassword(signupForm.password))
        next.password = "Use at least 8 characters with a letter and a number.";
      if (!signupForm.confirmPassword) next.confirmPassword = "Confirm your password.";
      else if (signupForm.password !== signupForm.confirmPassword)
        next.confirmPassword = "Passwords do not match.";
    }
    return next;
  };

  const handleNextStep = () => {
    resetSignupErrors();
    const errors = validateStep(signupStep);
    if (Object.values(errors).some(Boolean)) {
      setSignupErrors(errors);
      return;
    }
    setSignupStep((s) => s + 1);
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
    const validation = validateStep(4);
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
      department: signupForm.department,
      program: signupForm.program,
      studentId: signupForm.studentId,
      phone: signupForm.phone,
      corImage: signupForm.corImage,
      corFile: signupForm.corFile,
      avatarFile: signupForm.avatarFile,
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
    const stepTitles = ["Create your account", "Academic information", "Upload documents", "Set your password"];

    return (
      <AuthShell>
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-gray-950/5 w-full max-w-md p-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-6">
            {stepTitles[signupStep - 1]}
          </h1>

          {/* Step 1 — Personal info */}
          {signupStep === 1 && (
            <div className="space-y-4">
              <FieldRow label="Full name" error={signupErrors.name}>
                <input
                  name="name"
                  value={signupForm.name}
                  onChange={handleSignupChange}
                  className={INPUT}
                  placeholder="Juan Dela Cruz"
                  autoFocus
                />
              </FieldRow>

              <FieldRow label="Student ID" error={signupErrors.studentId}>
                <InputWithIcon icon={Hash}>
                  <input
                    name="studentId"
                    value={signupForm.studentId}
                    onChange={handleSignupChange}
                    className={`${INPUT} pl-9`}
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="9-digit ID"
                  />
                </InputWithIcon>
              </FieldRow>

              <FieldRow label="Institutional email" error={signupErrors.email}>
                <InputWithIcon
                  icon={Mail}
                  trailing={
                    emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle2 size={14} /> Verified
                      </span>
                    ) : null
                  }
                >
                  <input
                    name="email"
                    type="email"
                    value={signupForm.email}
                    onChange={handleSignupChange}
                    readOnly={emailVerified}
                    className={`${INPUT} pl-9 ${emailVerified ? "pr-24 bg-gray-50 text-gray-600" : ""}`}
                    placeholder="name@s.msumain.edu.ph"
                  />
                </InputWithIcon>
                {!emailVerified && !emailCodeSent && (
                  <button
                    type="button"
                    onClick={handleSendSignupCode}
                    disabled={!canSendCode || sendingCode}
                    className={`${BTN.secondary} mt-2 w-full`}
                  >
                    {sendingCode ? "Sending code…" : "Send verification code"}
                  </button>
                )}
                {!emailVerified && emailCodeSent && (
                  <div className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                    {emailVerifyMsg && (
                      <p className="text-xs text-emerald-700">{emailVerifyMsg}</p>
                    )}
                    <OtpInput value={emailOtp} onChange={setEmailOtp} />
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleSendSignupCode}
                        disabled={sendingCode}
                        className="text-xs text-maroon-700 hover:text-maroon-800 font-medium disabled:opacity-60"
                      >
                        {sendingCode ? "Resending…" : "Resend code"}
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifySignupCode}
                        disabled={verifyingCode}
                        className={BTN.primary}
                      >
                        {verifyingCode ? "Verifying…" : "Verify email"}
                      </button>
                    </div>
                  </div>
                )}
              </FieldRow>

              <FieldRow label="Phone number" error={signupErrors.phone}>
                <InputWithIcon icon={Phone}>
                  <input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={signupForm.phone}
                    onChange={handleSignupChange}
                    className={`${INPUT} pl-9`}
                    placeholder="09XX XXX XXXX"
                  />
                </InputWithIcon>
              </FieldRow>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setIsSignup(false); resetSignupErrors(); }}
                  className="text-sm text-maroon-700 hover:text-maroon-800 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> Back to login
                </button>
                <button type="button" onClick={handleNextStep} className={BTN.primary}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Academic info */}
          {signupStep === 2 && (
            <div className="space-y-4">
              <FieldRow label="College">
                <select
                  name="college"
                  value={signupForm.college}
                  onChange={handleSignupChange}
                  className={INPUT}
                >
                  {COLLEGES.map((c) => (
                    <option key={c} value={c}>
                      {c} — {getCollegeName(c)}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="Department" error={signupErrors.department}>
                <select
                  name="department"
                  value={signupForm.department}
                  onChange={handleSignupChange}
                  className={INPUT}
                >
                  <option value="">Select department</option>
                  {getDepartments(signupForm.college).map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="Program / Course" error={signupErrors.program}>
                <select
                  name="program"
                  value={signupForm.program}
                  onChange={handleSignupChange}
                  className={INPUT}
                  disabled={!signupForm.department}
                >
                  <option value="">
                    {signupForm.department ? "Select program / course" : "Select a department first"}
                  </option>
                  {getPrograms(signupForm.college, signupForm.department).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setSignupStep(1); resetSignupErrors(); }}
                  className="text-sm text-maroon-700 hover:text-maroon-800 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" onClick={handleNextStep} className={BTN.primary}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Documents */}
          {signupStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-gray-800">Certificate of Registration</p>
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
                  <label htmlFor="cor-upload" className={`${BTN.secondary} w-full cursor-pointer`}>
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

              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-gray-800">1x1 Picture</p>
                  <p className="text-xs text-gray-400">JPG or PNG · max 2 MB</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                {!signupForm.avatarImage ? (
                  <label htmlFor="avatar-upload" className={`${BTN.secondary} w-full cursor-pointer`}>
                    <Upload size={14} /> Choose 1x1 picture
                  </label>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-medium">
                      <CheckCircle2 size={14} /> Picture uploaded
                    </div>
                    <img
                      src={signupForm.avatarImage}
                      alt="1x1 preview"
                      className="w-24 h-24 object-cover border border-gray-200 rounded-md bg-white mx-auto"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="block text-center text-xs text-maroon-700 hover:text-maroon-800 cursor-pointer font-medium"
                    >
                      Change picture
                    </label>
                  </div>
                )}
                {signupErrors.avatar && (
                  <p className="text-xs text-red-600 mt-2">{signupErrors.avatar}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setSignupStep(2); resetSignupErrors(); }}
                  className="text-sm text-maroon-700 hover:text-maroon-800 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" onClick={handleNextStep} className={BTN.primary}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Password */}
          {signupStep === 4 && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <FieldRow label="Password" error={signupErrors.password}>
                <InputWithIcon
                  icon={Lock}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((s) => !s)}
                      className="text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                      aria-label="Toggle password visibility"
                    >
                      {showSignupPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                >
                  <input
                    name="password"
                    type={showSignupPassword ? "text" : "password"}
                    value={signupForm.password}
                    onChange={handleSignupChange}
                    className={`${INPUT} pl-9 pr-9`}
                    placeholder="At least 8 characters"
                    autoFocus
                  />
                </InputWithIcon>
              </FieldRow>

              <FieldRow label="Confirm password" error={signupErrors.confirmPassword}>
                <InputWithIcon icon={Lock}>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={signupForm.confirmPassword}
                    onChange={handleSignupChange}
                    className={`${INPUT} pl-9`}
                    placeholder="Repeat password"
                  />
                </InputWithIcon>
              </FieldRow>

              {signupErrors.form && (
                <div className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
                  {signupErrors.form}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setSignupStep(3); resetSignupErrors(); }}
                  className="text-sm text-maroon-700 hover:text-maroon-800 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="submit" disabled={signupLoading} className={BTN.primary}>
                  {signupLoading ? "Creating account…" : "Create account"}
                </button>
              </div>
            </form>
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="bg-white rounded-2xl shadow-xl ring-1 ring-gray-950/5 w-full max-w-sm p-8">
        <div className="flex justify-center mb-6">
          <img
            src="/counselink-logo.png"
            alt="CounseLink"
            className="h-24 object-contain"
          />
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <FieldRow label="Student ID/Institutional Email" error={loginErrors.identifier}>
            <InputWithIcon icon={UserRound}>
              <input
                name="identifier"
                value={loginForm.identifier}
                onChange={handleLoginChange}
                type="text"
                required
                className={`${INPUT} pl-9`}
                placeholder="name@s.msumain.edu.ph"
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
            <button
              type="button"
              onClick={() => {
                setIsSignup(true);
                setSignupStep(1);
                resetSignupErrors();
                setEmailVerified(false);
                setEmailCodeSent(false);
                setEmailOtp("");
                setEmailVerifyMsg("");
              }}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Create an account
            </button>
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

const EMPTY_URGENT_FORM = {
  fullName: "",
  studentIdNumber: "",
  description: "",
};

function AuthShell({ children }) {
  const [urgentModal, setUrgentModal] = useState(null); // null | "notice" | "form" | "confirm" | "success" | "duplicate"
  const [urgentForm, setUrgentForm] = useState(EMPTY_URGENT_FORM);
  const [urgentFormErrors, setUrgentFormErrors] = useState({});
  const [urgentLoading, setUrgentLoading] = useState(false);
  const [urgentError, setUrgentError] = useState("");
  const [urgentQueueNumber, setUrgentQueueNumber] = useState(null);
  const [urgentSubmittedAt, setUrgentSubmittedAt] = useState(null);

  const openUrgentFlow = () => {
    setUrgentForm(EMPTY_URGENT_FORM);
    setUrgentFormErrors({});
    setUrgentError("");
    setUrgentQueueNumber(null);
    setUrgentSubmittedAt(null);
    setUrgentModal("notice");
  };

  const updateUrgentForm = (field, value) => {
    setUrgentForm((f) => ({ ...f, [field]: value }));
    setUrgentFormErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const validateUrgentForm = () => {
    const errors = {};
    if (!urgentForm.fullName.trim()) errors.fullName = "Required";
    if (!/^\d{9}$/.test(urgentForm.studentIdNumber)) errors.studentIdNumber = "Must be exactly 9 digits.";
    if (!urgentForm.description.trim()) errors.description = "Required";
    return errors;
  };

  const goToUrgentForm = () => {
    const errors = validateUrgentForm();
    if (Object.keys(errors).length > 0) {
      setUrgentFormErrors(errors);
      return;
    }
    setUrgentFormErrors({});
    setUrgentModal("confirm");
  };

  const submitUrgentRequest = async () => {
    setUrgentLoading(true);
    setUrgentError("");
    try {
      const res = await fetch(`${API_BASE}/api/urgent-counseling-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: urgentForm.fullName,
          studentIdNumber: urgentForm.studentIdNumber,
          description: urgentForm.description,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUrgentError(data.message || "Unable to submit request. Please try again.");
        return;
      }
      if (data.alreadyPending) {
        setUrgentModal("duplicate");
      } else {
        setUrgentQueueNumber(data.queueNumber ?? null);
        setUrgentSubmittedAt(new Date());
        setUrgentModal("success");
      }
    } catch {
      setUrgentError("Network error. Please try again or visit the office directly.");
    } finally {
      setUrgentLoading(false);
    }
  };

  const handleLogoLoad = (e) => {
    const img = e.currentTarget;
    if (img.dataset.processed) return;
    img.dataset.processed = "true";
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width;
      const h = canvas.height;

      // --- Pass 1: Remove white / near-white background ---
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx === 0 ? 0 : (mx - mn) / mx;
        if (lum > 170 && sat < 0.18) {
          data[i + 3] = 0;
        } else if (lum > 150 && sat < 0.22) {
          const fade = Math.max(0, (lum - 150) / 20);
          data[i + 3] = Math.round(a * (1 - fade));
        }
      }

      // --- Pass 2: Recolor "DIVISION OF STUDENT AFFAIRS" text to yellow ---
      // This text sits roughly between 60-78% of the image height
      const yStart = Math.floor(h * 0.60);
      const yEnd = Math.floor(h * 0.78);
      for (let y = yStart; y < yEnd; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 50) continue; // skip transparent
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          const sat = mx === 0 ? 0 : (mx - mn) / mx;
          // Target dark, low-saturation pixels (the dark text)
          if (lum < 80 && sat < 0.35) {
            data[i] = 255;     // R
            data[i + 1] = 215; // G
            data[i + 2] = 0;   // B → yellow
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      img.src = canvas.toDataURL();
    } catch (err) {
      console.error("Error processing logo background:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-600 via-maroon-700 to-maroon-800 flex items-center justify-center p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={openUrgentFlow}
        className="fixed top-4 right-4 z-40 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-lg transition-colors"
      >
        <AlertTriangle size={16} />
      </button>

      <div className="w-full max-w-xl flex flex-col items-center">
        <img
          src="/login-header.png"
          alt="Guidance and Counseling Section"
          className="w-full max-h-48 object-contain mb-3"
          onLoad={handleLogoLoad}
        />
        {children}
        <p className="mt-6 text-center text-xs text-white/60">
          © {new Date().getFullYear()} MSU-Marawi · Division of Student Affairs
        </p>
      </div>

      {urgentModal && (
        <UrgentCounselingModal
          step={urgentModal}
          onClose={() => setUrgentModal(null)}
          onProceedNotice={() => setUrgentModal("form")}
          form={urgentForm}
          formErrors={urgentFormErrors}
          onFormChange={updateUrgentForm}
          goToStep={setUrgentModal}
          onNext={goToUrgentForm}
          onConfirm={submitUrgentRequest}
          loading={urgentLoading}
          error={urgentError}
          queueNumber={urgentQueueNumber}
          submittedAt={urgentSubmittedAt}
        />
      )}
    </div>
  );
}

function UrgentCounselingModal({
  step,
  onClose,
  onProceedNotice,
  form,
  formErrors,
  onFormChange,
  goToStep,
  onNext,
  onConfirm,
  loading,
  error,
  queueNumber,
  submittedAt,
}) {
  if (step === "notice") {
    return (
      <Modal open onClose={onClose} title="URGENT COUNSELING NOTICE" danger size="md">
        <p className="text-sm text-gray-700 leading-relaxed">
          This feature is intended only for students experiencing an
          urgent concern that requires immediate counseling assistance.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mt-3">
          Regular counseling concerns should be scheduled through the appointment system.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mt-3">
          Counseling services are available only from Monday to Friday. No counseling
          appointments are conducted during Saturdays and Sundays.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mt-3">
          Click "Proceed" if you require immediate counseling assistance.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className={BTN.secondary}>Cancel</button>
          <button type="button" onClick={onProceedNotice} className={BTN.danger}>Proceed</button>
        </div>
      </Modal>
    );
  }

  if (step === "form") {
    return (
      <Modal
        open
        onClose={onClose}
        title="Urgent Counseling Request"
        subtitle="Please provide the following information."
        size="md"
      >
        <div className="space-y-4">
          <FieldRow label="Full Name" error={formErrors.fullName}>
            <InputWithIcon icon={UserRound}>
              <input
                className={`${INPUT} pl-9`}
                value={form.fullName}
                placeholder="Juan Dela Cruz"
                onChange={(e) => onFormChange("fullName", e.target.value)}
              />
            </InputWithIcon>
          </FieldRow>

          <FieldRow label="Student ID Number" error={formErrors.studentIdNumber}>
            <InputWithIcon icon={Hash}>
              <input
                className={`${INPUT} pl-9`}
                inputMode="numeric"
                maxLength={9}
                placeholder="202647532"
                value={form.studentIdNumber}
                onChange={(e) => onFormChange("studentIdNumber", e.target.value.replace(/\D/g, "").slice(0, 9))}
              />
            </InputWithIcon>
          </FieldRow>



          <FieldRow label="Description of Emergency" error={formErrors.description}>
            <textarea
              rows={4}
              className={INPUT}
              value={form.description}
              onChange={(e) => onFormChange("description", e.target.value)}
              placeholder="Briefly describe your emergency or concern"
            />
          </FieldRow>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={() => goToStep("notice")} className={BTN.secondary}>Back</button>
          <button type="button" onClick={onClose} className={BTN.secondary}>Cancel</button>
          <button type="button" onClick={onNext} className={BTN.danger}>Next</button>
        </div>
      </Modal>
    );
  }

  if (step === "confirm") {
    return (
      <Modal open onClose={onClose} title="CONFIRMATION" danger size="md">
        <p className="text-sm text-gray-700 leading-relaxed">
          By submitting this request, you confirm that your concern requires
          immediate attention.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mt-3">
          Please proceed directly to the Division of Student Affairs Office – Guidance
          and Counseling Unit for immediate assistance.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mt-3">
          False or misleading submissions may be subject to disciplinary action under
          university policies.
        </p>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={() => goToStep("form")} className={BTN.secondary} disabled={loading}>Back</button>
          <button type="button" onClick={onClose} className={BTN.secondary} disabled={loading}>Cancel</button>
          <button type="button" onClick={onConfirm} className={BTN.danger} disabled={loading}>
            {loading ? "Submitting…" : "Submit Urgent Request"}
          </button>
        </div>
      </Modal>
    );
  }

  if (step === "duplicate") {
    return (
      <Modal open onClose={onClose} title="Request Already Pending" size="md">
        <p className="text-sm text-gray-700 leading-relaxed">
          Your urgent counseling request has already been submitted and is awaiting
          counselor assistance. Please proceed to the Division of Student Affairs Office.
        </p>
        <div className="flex justify-end mt-5">
          <button type="button" onClick={onClose} className={BTN.primary}>Close</button>
        </div>
      </Modal>
    );
  }

  // step === "success"
  return (
    <Modal open onClose={onClose} title="Request Submitted" size="md">
      {queueNumber != null && (
        <div className="flex flex-col items-center py-4 mb-4 bg-red-50 rounded-xl border border-red-100">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Your Queue Number</p>
          <span className="text-5xl font-bold text-red-700 tabular-nums">{queueNumber}</span>
          {submittedAt && (
            <p className="text-xs text-red-500 mt-1">
              {submittedAt.toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          )}
        </div>
      )}
      <p className="text-sm text-gray-700 leading-relaxed">
        Your urgent counseling request has been recorded and all available counselors
        have been notified. Please proceed to the Division of Student Affairs Office –
        Guidance and Counseling Unit now.
      </p>
      <div className="flex justify-end mt-5">
        <button type="button" onClick={onClose} className={BTN.primary}>Close</button>
      </div>
    </Modal>
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


const RESET_STORAGE_KEY = "cl_pwreset_pending";
const RESET_TTL_MS = 10 * 60 * 1000;

const loadPendingReset = () => {
  try {
    const data = JSON.parse(sessionStorage.getItem(RESET_STORAGE_KEY) || "null");
    if (!data?.email || !data?.sentAt) return null;
    if (Date.now() - data.sentAt > RESET_TTL_MS) {
      sessionStorage.removeItem(RESET_STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const savePendingReset = (email) => {
  try {
    sessionStorage.setItem(
      RESET_STORAGE_KEY,
      JSON.stringify({ email, sentAt: Date.now() })
    );
  } catch {
    /* sessionStorage unavailable — resume just won't persist */
  }
};

const clearPendingReset = () => {
  try {
    sessionStorage.removeItem(RESET_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

function ForgotPasswordModal({ onClose }) {
  const pending = useMemo(() => loadPendingReset(), []);
  const [step, setStep] = useState(pending ? "otp" : "request");
  const [email, setEmail] = useState(pending?.email || "");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(
    pending
      ? `We already sent a code to ${pending.email}. Enter it below, or resend.`
      : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Drop back to the start and forget the in-progress code entirely.
  const startOver = () => {
    clearPendingReset();
    setStep("request");
    setOtp("");
    setToken("");
    setError("");
    setMessage("");
  };

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
        savePendingReset(email.trim());
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
        savePendingReset(email.trim());
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
        clearPendingReset();
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
              onClick={startOver}
              className={BTN.secondary}
            >
              Use another email
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
