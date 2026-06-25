import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  getMe,
  updateMe,
  listUsers,
  lookupUser,
  getCounselorStats,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
} from "../controllers/users.controller.js";

const router = Router();

router.use(auth);

router.get("/me", getMe);
router.put("/me", updateMe);
router.get("/lookup/:id", lookupUser);
router.get("/:id/counselor-stats", getCounselorStats);

router.get("/", listUsers);
router.post("/", requireRole("admin"), adminCreateUser);
router.put("/:id", requireRole("admin"), adminUpdateUser);
router.delete("/:id", requireRole("admin"), adminDeleteUser);

export default router;
