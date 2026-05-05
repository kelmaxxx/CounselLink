import { Router } from "express";
import { createAppointment, listAppointmentsForUser } from "../controllers/appointments.controller.js";
import { acceptAppointment, rejectAppointment, rescheduleAppointment } from "../controllers/appointments.actions.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

router.use(auth);

router.post("/", requireRole("student"), createAppointment);
router.get("/", listAppointmentsForUser);
router.put("/:id/accept", requireRole("counselor"), acceptAppointment);
router.put("/:id/reject", requireRole("counselor"), rejectAppointment);
router.put("/:id/reschedule", requireRole("counselor"), rescheduleAppointment);

export default router;
