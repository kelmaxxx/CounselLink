import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  getMe,
  updateMe,
  checkEmailExists,
  listUsers,
  lookupUser,
  getCounselorStats,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  banUser,
  unbanUser,
  resendInvitation,
  requestAdminEmailChange,
  verifyAdminEmailChange,
} from "../controllers/users.controller.js";

const router = Router();

router.use(auth);

router.get("/check-email", checkEmailExists);
router.get("/me", getMe);
router.put("/me", updateMe);
router.post("/me/email-change/request", requireRole("admin"), requestAdminEmailChange);
router.post("/me/email-change/verify", requireRole("admin"), verifyAdminEmailChange);
router.get("/lookup/:id", lookupUser);
router.get("/:id/counselor-stats", getCounselorStats);

router.get("/", listUsers);
router.post("/", requireRole("admin"), adminCreateUser);
router.post("/:id/resend-invite", requireRole("admin"), resendInvitation);
router.put("/:id", requireRole("admin"), adminUpdateUser);
router.delete("/:id", requireRole("admin"), adminDeleteUser);
router.patch("/:id/ban", requireRole("admin"), banUser);
router.patch("/:id/unban", requireRole("admin"), unbanUser);

export default router;
