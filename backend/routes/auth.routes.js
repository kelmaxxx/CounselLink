import { Router } from "express";
import {
  login,
  registerStudent,
  requestPasswordReset,
  verifyResetOtp,
  resetPassword,
  changePassword,
} from "../controllers/auth.controller.js";
import {
  loginLimiter,
  registerLimiter,
  forgotLimiter,
  otpLimiter,
} from "../middleware/rateLimit.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/register", registerLimiter, registerStudent);
router.post("/forgot-password", forgotLimiter, requestPasswordReset);
router.post("/verify-otp", otpLimiter, verifyResetOtp);
router.post("/reset-password", otpLimiter, resetPassword);
router.post("/change-password", auth, changePassword);

export default router;
