import { Router } from "express";
import { createUrgentCounselingRequest } from "../controllers/urgent-counseling.controller.js";
import { urgentCounselingLimiter } from "../middleware/rateLimit.js";

const router = Router();

// Public — reachable from the login page without authentication.
router.post("/", urgentCounselingLimiter, createUrgentCounselingRequest);

export default router;
