import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { recordScanUpload } from "../middleware/upload.js";
import {
  getInventory,
  upsertInventory,
  uploadInventoryScan,
  deleteInventoryScan,
} from "../controllers/student-inventories.controller.js";

const router = Router();

router.use(auth);

router.get("/:studentId", getInventory);
router.put("/:studentId", requireRole("counselor"), upsertInventory);
router.post(
  "/:studentId/scan",
  requireRole("counselor"),
  recordScanUpload.single("scan"),
  uploadInventoryScan
);
router.delete("/:studentId/scan", requireRole("counselor"), deleteInventoryScan);

export default router;
