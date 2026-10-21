import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { listWarnings, reviewWarning, updateWarningSettings } from "../controllers/warnings.controller.js";

const router = Router();

router.use(auth, requireRole("admin"));

router.get("/", listWarnings);
router.put("/settings", updateWarningSettings);
router.put("/:id/review", reviewWarning);

export default router;
