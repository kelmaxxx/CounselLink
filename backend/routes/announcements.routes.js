import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { createAnnouncement, listAnnouncements } from "../controllers/announcements.controller.js";

const router = Router();

router.use(auth, requireRole("admin"));

router.post("/", createAnnouncement);
router.get("/", listAnnouncements);

export default router;
