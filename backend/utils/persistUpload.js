import fs from "fs";
import path from "path";
import { query } from "../config/db.js";
import { getUploadsDir } from "../middleware/upload.js";

// Ephemeral hosts wipe ./uploads on redeploy. Keep a database copy of every
// upload (the fallback announcements already used) so avatars, CORs, scans and
// test results survive. The disk copy is still written and served first.
export const persistUploadedFile = async (file) => {
  if (!file?.path) return;
  const relative = path.relative(getUploadsDir(), file.path).split(path.sep).join("/");
  const url = `/uploads/${relative}`;
  try {
    await query(
      `INSERT INTO upload_blobs (url, mime_type, data) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), data = VALUES(data)`,
      [url, file.mimetype, fs.readFileSync(file.path)]
    );
  } catch (err) {
    // The disk copy exists, so the upload itself still succeeded.
    console.error(`Failed to persist ${url} to database:`, err.message);
  }
};

export const persistUpload = async (req, _res, next) => {
  await persistUploadedFile(req.file);
  next();
};
