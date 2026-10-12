import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { createTestRequest, listTestsForUser, acceptTest, rejectTest, rescheduleTest, requestRescheduleTest } from "../controllers/tests.controller.js";

const router = Router();

router.use(auth);

router.post("/", requireRole("student"), createTestRequest);
router.get("/", listTestsForUser);
router.put("/:id/accept", requireRole("counselor"), acceptTest);
router.put("/:id/reject", requireRole("counselor"), rejectTest);
router.put("/:id/reschedule", requireRole("counselor"), rescheduleTest);
router.put("/:id/request-reschedule", requireRole("student"), requestRescheduleTest);

export default router;
