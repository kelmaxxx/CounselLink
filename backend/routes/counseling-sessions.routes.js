import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  listSessions,
  getSession,
  getSessionByAppointment,
  createSession,
  updateSession,
  deleteSession,
  finalizeSession,
} from "../controllers/counseling-sessions.controller.js";

const router = Router();

router.use(auth);

router.get("/", listSessions);
router.get("/by-appointment/:appointmentId", getSessionByAppointment);
router.get("/:id", getSession);

router.post("/", requireRole("counselor"), createSession);
router.put("/:id", requireRole("counselor"), updateSession);
router.post("/:id/finalize", requireRole("counselor"), finalizeSession);
router.delete("/:id", requireRole("counselor"), deleteSession);

export default router;
