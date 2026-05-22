import { Router } from "express";
import {
  login,
  registerStudent,
  requestPasswordReset,
  resetPassword,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", login);
router.post("/register", registerStudent);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
