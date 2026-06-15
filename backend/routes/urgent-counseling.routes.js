import { Router } from "express";
import {
  createUrgentCounselingRequest,
  listUrgentCounselingRequests,
  resolveUrgentCounselingRequest,
} from "../controllers/urgent-counseling.controller.js";
import { urgentCounselingLimiter } from "../middleware/rateLimit.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

// Public — reachable from the login page without authentication.
router.post("/", urgentCounselingLimiter, createUrgentCounselingRequest);

router.get("/", auth, requireRole("counselor"), listUrgentCounselingRequests);
router.put("/:id/resolve", auth, requireRole("counselor"), resolveUrgentCounselingRequest);

export default router;
