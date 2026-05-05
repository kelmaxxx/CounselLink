// src/pages/Login.jsx
import React, { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { COLLEGES } from "../data/mockData";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, CheckCircle, Eye, EyeOff } from "lucide-react";

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
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

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
    setLoginErrors((prev) => ({
      ...prev,
      form: "Password reset is not available yet. Please contact the DSA office.",
    }));
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
          <h1 className="text-3xl font-bold text-maroon-700 mb-2">CounseLink</h1>
          <p className="text-gray-600 mb-6">MSU-Marawi City Division of Student Affairs</p>

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
              <div className="relative">
                <input
                  name="password"
                  type={showSignupPassword ? "text" : "password"}
                  value={signupForm.password}
                  onChange={handleSignupChange}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {signupErrors.password && <p className="text-xs text-red-600 mt-1">{signupErrors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showSignupConfirmPassword ? "text" : "password"}
                  value={signupForm.confirmPassword}
                  onChange={handleSignupChange}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showSignupConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Role</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "student", label: "Student" },
              { value: "counselor", label: "Counselor" },
              { value: "college_rep", label: "College Rep" },
              { value: "admin", label: "Admin" },
            ].map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => {
                  setSelectedRole(role.value);
                  resetLoginErrors();
                }}
                className={`py-2 px-3 rounded-lg font-medium transition ${
                  selectedRole === role.value
                    ? "bg-maroon-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
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
            <div className="relative">
              <input
                name="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                type={showLoginPassword ? "text" : "password"}
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
    </div>
  );
}
