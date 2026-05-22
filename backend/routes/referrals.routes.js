import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  createReferral,
  listReferrals,
  getReferral,
  decideReferral,
  cancelReferral,
} from "../controllers/referrals.controller.js";

const router = Router();

router.use(auth);

router.get("/", requireRole("counselor", "admin"), listReferrals);
router.get("/:id", requireRole("counselor", "admin"), getReferral);
router.post("/", requireRole("counselor"), createReferral);
router.put("/:id/decide", requireRole("counselor"), decideReferral);
router.delete("/:id", requireRole("counselor"), cancelReferral);

export default router;
