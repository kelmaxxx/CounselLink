import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  submitClientFeedback,
  getClientFeedbackTally,
  getCounselorRating,
} from "../controllers/client-feedback.controller.js";

const router = Router();

router.use(auth);
router.get("/rating", getCounselorRating);
router.post("/", requireRole("student"), submitClientFeedback);
router.get("/tally", requireRole("counselor", "admin"), getClientFeedbackTally);

export default router;
