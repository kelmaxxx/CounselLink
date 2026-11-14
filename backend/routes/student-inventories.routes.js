import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { recordScanUpload } from "../middleware/upload.js";
import { persistUpload } from "../utils/persistUpload.js";
import {
  getInventory,
  listInventories,
  upsertInventory,
  uploadInventoryScan,
  deleteInventoryScan,
  downloadInventoryDocx,
  downloadInventoryPdf,
  downloadCompiledProfilesPdf,
} from "../controllers/student-inventories.controller.js";

const router = Router();

router.use(auth);

router.get("/", requireRole("counselor", "admin"), listInventories);
router.get(
  "/compiled/profiles-pdf",
  requireRole("counselor", "admin"),
  downloadCompiledProfilesPdf
);
router.get("/:studentId", getInventory);
router.get("/:studentId/docx", downloadInventoryDocx);
router.get("/:studentId/pdf", downloadInventoryPdf);
router.put("/:studentId", upsertInventory);
router.post(
  "/:studentId/scan",
  recordScanUpload.single("scan"),
  persistUpload,
  uploadInventoryScan
);
router.delete("/:studentId/scan", deleteInventoryScan);

export default router;
