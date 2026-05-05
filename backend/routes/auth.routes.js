import { Router } from "express";
import { login, registerStudent } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", login);
router.post("/register", registerStudent);

export default router;
