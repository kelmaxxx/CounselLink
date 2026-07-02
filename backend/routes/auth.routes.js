import { Router } from "express";
import {
  login,
  registerStudent,
  sendSignupCode,
  verifySignupCode,
  requestPasswordReset,
  verifyResetOtp,
  resetPassword,
} from "../controllers/auth.controller.js";
import {
  loginLimiter,
  registerLimiter,
  forgotLimiter,
  otpLimiter,
  signupCodeLimiter,
} from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/register", registerLimiter, registerStudent);
router.post("/signup/send-code", signupCodeLimiter, sendSignupCode);
router.post("/signup/verify-code", otpLimiter, verifySignupCode);
router.post("/forgot-password", forgotLimiter, requestPasswordReset);
router.post("/verify-otp", otpLimiter, verifyResetOtp);
router.post("/reset-password", otpLimiter, resetPassword);

export default router;
