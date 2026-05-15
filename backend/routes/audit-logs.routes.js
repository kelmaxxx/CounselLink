import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { listAuditLogs, listAuditActions } from "../controllers/audit-logs.controller.js";

const router = Router();

router.use(auth, requireRole("admin"));

router.get("/", listAuditLogs);
router.get("/actions", listAuditActions);

export default router;
