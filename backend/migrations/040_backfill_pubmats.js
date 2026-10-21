// Migration 040: Copy pubmat files that already exist on disk into
// upload_blobs, so images uploaded before the DB fallback (migration 039)
// also survive a redeploy that wipes the uploads directory.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mimeFor = (file) => {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
};

export const up = async (connection) => {
  const dir = process.env.UPLOADS_DIR?.trim()
    ? path.resolve(process.env.UPLOADS_DIR.trim(), "pubmats")
    : path.join(__dirname, "..", "uploads", "pubmats");

  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (!fs.statSync(fullPath).isFile()) continue;
    await connection.query(
      `INSERT INTO upload_blobs (url, mime_type, data) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), data = VALUES(data)`,
      [`/uploads/pubmats/${file}`, mimeFor(file), fs.readFileSync(fullPath)]
    );
  }
  console.log(`Backfilled ${fs.readdirSync(dir).length} pubmat file(s).`);
};
