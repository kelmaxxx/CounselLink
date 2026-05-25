// src/pages/Login.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { COLLEGES } from "../data/mockData";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, CheckCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const readResetTokenFromUrl = () => {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("reset") || "";
};

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
  const [resetTokenFromUrl, setResetTokenFromUrl] = useState(readResetTokenFromUrl);
  const [forgotOpen, setForgotOpen] = useState(() => Boolean(readResetTokenFromUrl()));

  useEffect(() => {
    if (resetTokenFromUrl) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [resetTokenFromUrl]);

  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: "",
  });

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
    () => (selectedRole === "student" ? "ID Number" : "Email"),
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
    if (!signupForm.name.trim()) {
      nextErrors.name = "Full name is required.";
    }
    if (!signupForm.email.trim()) {
      nextErrors.email = "Email is required.";
    }
    if (!signupForm.studentId.trim()) {
      nextErrors.studentId = "Student ID is required.";
    }
    if (!signupForm.password) {
      nextErrors.password = "Password is required.";
    }
    if (signupForm.password && signupForm.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }
    if (!signupForm.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    }
    if (signupForm.password && signupForm.confirmPassword && signupForm.password !== signupForm.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!signupForm.corImage) {
      nextErrors.cor = "Please upload your Certificate of Registration (COR).";
    }
    const emailLower = signupForm.email.toLowerCase();
    const allowedDomains = ["@msu.edu.ph", "@s.msumain.edu.ph", "@msumain.edu.ph"]; 
    if (signupForm.email && !allowedDomains.some((domain) => emailLower.endsWith(domain))) {
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

  const handleForgotPassword = () => {
    resetLoginErrors();
    setForgotOpen(true);
  };

  const loginButtonLabel = loginLoading ? "Signing in..." : "Login";
  const signupButtonLabel = signupLoading ? "Creating account..." : "Create Account";

  if (showSignupSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-maroon-500 to-maroon-700 px-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-maroon-700 mb-2">Registration Submitted</h1>
          <p className="text-gray-600 mb-6">
            Your registration is now pending approval. We will email you once the admin approves your account.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowSignupSuccess(false);
              setIsSignup(false);
            }}
            className="w-full bg-maroon-500 text-white py-3 rounded-lg hover:bg-maroon-600 font-medium transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (isSignup) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-maroon-500 to-maroon-700 px-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
          <h1 className="text-3xl font-bold text-maroon-700 mb-2">CounselLink MSU-Marawi</h1>
          <p className="text-gray-600 mb-6">Division of Student Affairs</p>

          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                name="name"
                value={signupForm.name}
                onChange={handleSignupChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              />
              {signupErrors.name && <p className="text-xs text-red-600 mt-1">{signupErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institutional Email (@s.msumain.edu.ph) *
              </label>
              <input
                name="email"
                type="email"
                value={signupForm.email}
                onChange={handleSignupChange}
                required
                placeholder="gampong.am207@s.msumain.edu.ph"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              />
              {signupErrors.email && <p className="text-xs text-red-600 mt-1">{signupErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
              <input
                name="studentId"
                value={signupForm.studentId}
                onChange={handleSignupChange}
                required
                placeholder="e.g., 202329207"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              />
              {signupErrors.studentId && <p className="text-xs text-red-600 mt-1">{signupErrors.studentId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
              <input
                name="phone"
                type="tel"
                value={signupForm.phone}
                onChange={handleSignupChange}
                placeholder="09XX XXX XXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">College *</label>
              <select
                name="college"
                value={signupForm.college}
                onChange={handleSignupChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              >
                {COLLEGES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText size={18} className="text-maroon-600" />
                Certificate of Registration (COR) *
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Upload a clear photo/scan of your COR. This will be reviewed by admin for verification.
                (JPG, PNG, or PDF • Max 5MB)
              </p>

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
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-maroon-300 text-maroon-600 rounded-lg hover:bg-maroon-50 cursor-pointer transition font-medium"
                >
                  <Upload size={20} />
                  Choose File
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle size={18} />
                    File uploaded successfully!
                  </div>
                  {signupForm.corImage?.startsWith("data:image") && (
                    <img
                      src={corPreview}
                      alt="COR Preview"
                      className="w-full h-40 object-contain border border-gray-200 rounded-lg bg-white"
                    />
                  )}
                  {signupForm.corImage?.startsWith("data:application/pdf") && (
                    <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                      <FileText size={24} className="text-red-500" />
                      <span className="text-sm text-gray-700">PDF file uploaded</span>
                    </div>
                  )}
                  <label
                    htmlFor="cor-upload"
                    className="inline-block text-sm text-maroon-600 hover:text-maroon-700 cursor-pointer font-medium"
                  >
                    Change file
                  </label>
                </div>
              )}
              {signupErrors.cor && <p className="text-xs text-red-600 mt-2">{signupErrors.cor}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                name="password"
                type="password"
                value={signupForm.password}
                onChange={handleSignupChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              />
              {signupErrors.password && <p className="text-xs text-red-600 mt-1">{signupErrors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                name="confirmPassword"
                type="password"
                value={signupForm.confirmPassword}
                onChange={handleSignupChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              />
              {signupErrors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{signupErrors.confirmPassword}</p>
              )}
            </div>

            {signupErrors.form && <p className="text-sm text-red-600">{signupErrors.form}</p>}

            <button
              type="submit"
              disabled={signupLoading}
              className="w-full bg-maroon-500 text-white py-3 rounded-lg hover:bg-maroon-600 font-medium transition disabled:opacity-70"
            >
              {signupButtonLabel}
            </button>

            <button
              type="button"
              onClick={() => setIsSignup(false)}
              className="w-full mt-3 text-maroon-600 hover:text-maroon-700 font-medium"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-maroon-500 to-maroon-700 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-maroon-700 mb-2">CounseLink</h1>
        <p className="text-gray-600 mb-6">MSU-Marawi City Division of Student Affairs</p>

        <div className="mb-6">
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
            Select Role
          </label>
          <select
            id="role"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              resetLoginErrors();
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
          >
            <option value="student">Student</option>
            <option value="counselor">Counselor</option>
            <option value="college_rep">College Dean</option>
            <option value="admin">Admin</option>
          </select>
          {selectedRole !== "student" && (
            <p className="text-xs text-gray-500 mt-2">
              Staff accounts are created by the admin. Please contact the DSA office if you need access.
            </p>
          )}
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{identifierLabel}</label>
            <input
              name="identifier"
              value={loginForm.identifier}
              onChange={handleLoginChange}
              type={selectedRole === "student" ? "text" : "email"}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              placeholder={selectedRole === "student" ? "e.g., 202329207" : `${selectedRole}@msu.edu.ph`}
            />
            {loginErrors.identifier && <p className="text-xs text-red-600 mt-1">{loginErrors.identifier}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              name="password"
              value={loginForm.password}
              onChange={handleLoginChange}
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
            />
            {loginErrors.password && <p className="text-xs text-red-600 mt-1">{loginErrors.password}</p>}
          </div>

          {loginErrors.form && <p className="text-sm text-red-600">{loginErrors.form}</p>}

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-maroon-600 hover:text-maroon-700 font-medium"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-maroon-500 text-white py-3 rounded-lg hover:bg-maroon-600 font-medium transition disabled:opacity-70"
          >
            {loginButtonLabel}
          </button>
        </form>

        {selectedRole === "student" && (
          <button
            type="button"
            onClick={() => {
              setIsSignup(true);
              resetSignupErrors();
            }}
            className="w-full mt-4 text-maroon-600 hover:text-maroon-700 font-medium"
          >
            Don&apos;t have an account? Sign up
          </button>
        )}
      </div>

      {forgotOpen && (
        <ForgotPasswordModal
          onClose={() => {
            setForgotOpen(false);
            setResetTokenFromUrl("");
          }}
          initialToken={resetTokenFromUrl}
        />
      )}
    </div>
  );
}

function ForgotPasswordModal({ onClose, initialToken = "" }) {
  const [step, setStep] = useState(initialToken ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken);
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
        setMessage(data.message || "If that email is registered, a reset token was generated.");
        if (data.devToken) {
          setToken(data.devToken);
        }
        setStep("reset");
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
    if (!token.trim()) {
      setError("Reset token is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
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
        body: JSON.stringify({ token: token.trim(), password }),
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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-maroon-700 mb-1">Forgot password</h2>
        <p className="text-sm text-gray-600 mb-4">
          {step === "request" && "Enter your registered email. We'll send you a reset link."}
          {step === "reset" && (initialToken
            ? "Choose a new password to finish resetting your account."
            : "Paste the token from the email and choose a new password.")}
          {step === "done" && "All set."}
        </p>

        {step === "request" && (
          <form onSubmit={submitRequest} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
                placeholder="you@s.msumain.edu.ph"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-maroon-500 text-white hover:bg-maroon-600 font-medium disabled:opacity-70"
              >
                {loading ? "Sending..." : "Send token"}
              </button>
            </div>
            <p className="text-xs text-gray-500 pt-1">
              No OSA approval needed. Reset is self-service.
            </p>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={submitReset} className="space-y-3">
            {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reset token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-maroon-500"
                placeholder="paste the token from your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep("request")}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-maroon-500 text-white hover:bg-maroon-600 font-medium disabled:opacity-70"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={20} />
              <span className="font-medium">{message}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-maroon-500 text-white hover:bg-maroon-600 font-medium"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
