import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  createReportRequest,
  listReportRequests,
  respondReportRequest,
  cancelReportRequest,
} from "../controllers/report-requests.controller.js";

const router = Router();

router.use(auth);

router.get("/", requireRole("counselor", "college_rep", "admin"), listReportRequests);
router.post("/", requireRole("college_rep"), createReportRequest);
router.put("/:id/respond", requireRole("counselor"), respondReportRequest);
router.delete("/:id", requireRole("college_rep"), cancelReportRequest);

export default router;
