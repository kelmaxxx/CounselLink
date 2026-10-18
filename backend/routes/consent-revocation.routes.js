import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  getRequest,
  listPendingRequests,
  submitRequest,
  decideRequest,
} from "../controllers/consent-revocation.controller.js";

const router = Router();

router.use(auth);

// Student: view their current request, or counselor: view any student's request
router.get("/:studentId/request", getRequest);

// Counselor: list all pending requests
router.get("/pending", requireRole("counselor", "admin"), listPendingRequests);

// Student: submit a revocation request
router.post("/:studentId/request", requireRole("student"), submitRequest);

// Counselor: approve or reject a pending request
router.post("/:requestId/decide", requireRole("counselor", "admin"), decideRequest);

export default router;
