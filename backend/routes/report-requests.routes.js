import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  createReportRequest,
  listReportRequests,
  getReportRequest,
  respondReportRequest,
  cancelReportRequest,
  sendIndividualReport,
} from "../controllers/report-requests.controller.js";

const router = Router();

router.use(auth);

router.get("/", requireRole("counselor", "college_rep", "admin"), listReportRequests);
router.post("/", requireRole("college_rep"), createReportRequest);
router.get("/:id", requireRole("counselor", "college_rep", "admin"), getReportRequest);
router.put("/:id/respond", requireRole("counselor"), respondReportRequest);
router.post("/:id/send", requireRole("counselor"), sendIndividualReport);
router.delete("/:id", requireRole("college_rep"), cancelReportRequest);

export default router;
