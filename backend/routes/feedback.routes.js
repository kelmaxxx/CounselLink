import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { submitFeedback, listFeedback } from "../controllers/feedback.controller.js";

const router = Router();

router.use(auth);
router.post("/", requireRole("student"), submitFeedback);
router.get("/", requireRole("counselor", "admin"), listFeedback);

export default router;
