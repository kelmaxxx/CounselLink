import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  submitSystemEvaluation,
  getSystemEvaluationsTally,
} from "../controllers/system-evaluations.controller.js";

const router = Router();

const ACCEPTED_PASSCODES = ["counselink2026", "1234", "cics2026"];

// Middleware for optional auth on submissions
const optionalAuth = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.split(" ")[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
};

// Middleware to authorize tally access via researcher passcode OR counselor/admin JWT
const authorizeTallyAccess = (req, res, next) => {
  const passcode = req.headers["x-researcher-passcode"];
  if (passcode && ACCEPTED_PASSCODES.includes(String(passcode).trim())) {
    return next();
  }

  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
      req.user = user;
      if (user.role === "counselor" || user.role === "admin") {
        return next();
      }
    } catch {
      // Token verification failed
    }
  }

  return res.status(403).json({ message: "Forbidden: Access restricted to authorized researchers." });
};

// Public/Logged-in survey submission route
router.post("/", optionalAuth, submitSystemEvaluation);

// Tally summary route (authorized via passcode or counselor/admin role)
router.get("/tally", authorizeTallyAccess, getSystemEvaluationsTally);

export default router;
