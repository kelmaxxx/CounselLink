import { Router } from "express";
import { createAppointment, listAppointmentsForUser, getAppointmentStats } from "../controllers/appointments.controller.js";
import { acceptAppointment, rejectAppointment, rescheduleAppointment, completeAppointment, removeNoShows } from "../controllers/appointments.actions.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

router.use(auth);

router.get("/stats", requireRole("admin"), getAppointmentStats);
router.post("/", requireRole("student", "counselor"), createAppointment);
router.get("/", listAppointmentsForUser);
router.put("/no-shows", requireRole("counselor"), removeNoShows);
router.put("/:id/accept", requireRole("counselor"), acceptAppointment);
router.put("/:id/reject", requireRole("counselor"), rejectAppointment);
router.put("/:id/reschedule", requireRole("counselor"), rescheduleAppointment);
router.put("/:id/complete", requireRole("counselor"), completeAppointment);

export default router;
