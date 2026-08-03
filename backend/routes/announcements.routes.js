import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  createAnnouncement,
  listAnnouncements,
  listPublicAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcements.controller.js";

const router = Router();

router.get("/public", listPublicAnnouncements);

router.use(auth, requireRole("admin"));

router.post("/", createAnnouncement);
router.get("/", listAnnouncements);
router.put("/:id", updateAnnouncement);
router.delete("/:id", deleteAnnouncement);

export default router;
