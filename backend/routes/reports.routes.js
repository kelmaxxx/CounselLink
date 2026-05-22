import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  getOverviewReport,
  getAdminReport,
  getCollegeReport,
  sendReportToRecipient,
  listReceivedReports,
} from "../controllers/reports.controller.js";

const router = Router();

router.use(auth);

router.get("/overview", getOverviewReport);
router.get("/admin", requireRole("admin"), getAdminReport);
router.get("/college", requireRole("college_rep"), getCollegeReport);
router.post("/send", requireRole("counselor"), sendReportToRecipient);
router.get("/received", requireRole("college_rep"), listReceivedReports);

export default router;
