import { Router } from "express";
import {
  login,
  registerStudent,
  requestPasswordReset,
  verifyResetOtp,
  resetPassword,
} from "../controllers/auth.controller.js";
import {
  loginLimiter,
  registerLimiter,
  forgotLimiter,
  otpLimiter,
} from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/register", registerLimiter, registerStudent);
router.post("/forgot-password", forgotLimiter, requestPasswordReset);
router.post("/verify-otp", otpLimiter, verifyResetOtp);
router.post("/reset-password", otpLimiter, resetPassword);

export default router;
