import { Router } from "express";
import { manilaNowPayload } from "../utils/scheduling.js";

const router = Router();

// Public on purpose: it carries no sensitive data, and booking calendars
// need the server clock even for the "device clock is wrong" case.
// This is what the UI gates on; the booking endpoints enforce it.
router.get("/time", (_req, res) => {
  res.json(manilaNowPayload());
});

export default router;
