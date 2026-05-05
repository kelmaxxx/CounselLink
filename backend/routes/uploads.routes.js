import { Router } from "express";
import { corUpload } from "../middleware/upload.js";
import { query } from "../config/db.js";

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

export default router;
