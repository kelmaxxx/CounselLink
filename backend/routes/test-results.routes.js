import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { testResultUpload } from "../middleware/upload.js";
import { createTestResult, listTestResultsForUser } from "../controllers/test-results.controller.js";

const router = Router();

router.use(auth);

router.post("/", requireRole("counselor"), testResultUpload.single("resultFile"), createTestResult);
router.get("/", listTestResultsForUser);

export default router;
