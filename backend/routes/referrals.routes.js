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

router.get("/", requireRole("counselor", "college_rep", "admin"), listReferrals);
router.get("/:id", requireRole("counselor", "college_rep", "admin"), getReferral);
router.post("/", requireRole("college_rep"), createReferral);
router.put("/:id/decide", requireRole("counselor"), decideReferral);
router.delete("/:id", requireRole("college_rep"), cancelReferral);

export default router;
