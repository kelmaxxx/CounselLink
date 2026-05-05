import { Router } from "express";
import { pendingRegistrations, approveRegistration, rejectRegistration } from "../controllers/admin.controller.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

router.use(auth, requireRole("admin"));

router.get("/pending-registrations", pendingRegistrations);
router.put("/pending-registrations/:id/approve", approveRegistration);
router.put("/pending-registrations/:id/reject", rejectRegistration);

export default router;
