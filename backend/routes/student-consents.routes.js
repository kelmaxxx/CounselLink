import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { recordScanUpload } from "../middleware/upload.js";
import {
  getConsent,
  eSignConsent,
  uploadConsentScan,
  deleteConsentScan,
  revokeConsent,
} from "../controllers/student-consents.controller.js";

const router = Router();

router.use(auth);

router.get("/:studentId", getConsent);
router.post("/:studentId/e-sign", requireRole("student"), eSignConsent);
router.post(
  "/:studentId/scan",
  requireRole("counselor"),
  recordScanUpload.single("scan"),
  uploadConsentScan
);
router.delete("/:studentId/scan", requireRole("counselor"), deleteConsentScan);
router.post("/:studentId/revoke", requireRole("counselor"), revokeConsent);

export default router;
