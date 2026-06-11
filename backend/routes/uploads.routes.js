import { Router } from "express";
import { corUpload, avatarUpload } from "../middleware/upload.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/cor", corUpload.single("cor"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  return res.status(201).json({
    message: "Upload successful",
    corUrl: fileUrl,
    corFileName: req.file.originalname,
    corFileType: req.file.mimetype,
  });
});

router.post("/avatar", avatarUpload.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileUrl = `/uploads/avatars/${req.file.filename}`;

  return res.status(201).json({
    message: "Upload successful",
    avatarUrl: fileUrl,
    avatarFileName: req.file.originalname,
    avatarFileType: req.file.mimetype,
  });
});

export default router;
