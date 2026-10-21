import { Router } from "express";
import fs from "fs";
import { corUpload, avatarUpload, pubmatUpload, signatureUpload } from "../middleware/upload.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
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

router.post("/signature", auth, signatureUpload.single("signature"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileUrl = `/uploads/signatures/${req.file.filename}`;

  return res.status(201).json({
    message: "Upload successful",
    signatureUrl: fileUrl,
    signatureFileName: req.file.originalname,
    signatureFileType: req.file.mimetype,
  });
});

router.post(
  "/pubmat",
  auth,
  requireRole("admin"),
  (req, res, next) => {
    pubmatUpload.single("pubmat")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File is too large. Maximum file size allowed is 25MB." });
        }
        return res.status(400).json({ message: err.message || "File upload failed" });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/pubmats/${req.file.filename}`;

    // Durable copy: /uploads is ephemeral on many hosts, so the DB keeps the
    // bytes and server.js serves them when the disk file is gone.
    try {
      await query(
        `INSERT INTO upload_blobs (url, mime_type, data) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), data = VALUES(data)`,
        [fileUrl, req.file.mimetype, fs.readFileSync(req.file.path)]
      );
    } catch (err) {
      // The file is still on disk, so the upload itself succeeded.
      console.error("Failed to persist pubmat to database:", err.message);
    }

    return res.status(201).json({
      message: "Upload successful",
      pubmatUrl: fileUrl,
      pubmatFileName: req.file.originalname,
      pubmatFileType: req.file.mimetype,
    });
  }
);

export default router;
