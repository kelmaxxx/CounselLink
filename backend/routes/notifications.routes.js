import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { listNotifications, markNotificationRead, markAllRead } from "../controllers/notifications.controller.js";

const router = Router();

router.use(auth);
router.get("/", listNotifications);
router.put("/:id/read", markNotificationRead);
router.put("/read-all", markAllRead);

export default router;
