import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { listConversations, listConversationMessages, sendMessage, markConversationRead } from "../controllers/messages.controller.js";

const router = Router();

router.use(auth);

router.get("/conversations", listConversations);
router.get("/conversations/:userId", listConversationMessages);
router.post("/", sendMessage);
router.put("/conversations/:userId/read", markConversationRead);

export default router;
