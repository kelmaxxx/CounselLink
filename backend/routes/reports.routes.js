import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  getOverviewReport,
  getAdminReport,
  getCollegeReport,
  getCollegeTotals,
  createCollegeSummary,
  sendReportToRecipient,
  listReceivedReports,
  listSentReports,
  getReport,
} from "../controllers/reports.controller.js";

const router = Router();

router.use(auth);

router.get("/overview", getOverviewReport);
router.get("/admin", requireRole("admin"), getAdminReport);
router.get("/college", requireRole("college_rep"), getCollegeReport);
router.get("/college-totals", requireRole("counselor", "admin"), getCollegeTotals);
router.post("/college-summary", requireRole("counselor"), createCollegeSummary);
router.post("/send", requireRole("counselor"), sendReportToRecipient);
router.get("/sent", requireRole("counselor"), listSentReports);
router.get("/received", requireRole("college_rep"), listReceivedReports);
router.get("/:id", getReport);

export default router;
