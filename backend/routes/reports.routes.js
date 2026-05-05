import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { getOverviewReport, getAdminReport, getCollegeReport } from "../controllers/reports.controller.js";

const router = Router();

router.use(auth);

router.get("/overview", getOverviewReport);
router.get("/admin", requireRole("admin"), getAdminReport);
router.get("/college", requireRole("college_rep"), getCollegeReport);

export default router;
