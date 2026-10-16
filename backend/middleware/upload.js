import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads live on local disk. On ephemeral hosting (e.g. Render free tier)
// the deploy directory is wiped on every redeploy/restart, which silently
// deletes avatars, CORs, scans and test-result files. Point UPLOADS_DIR at a
// persistent volume (e.g. a Render Disk mounted at /var/data/uploads) so
// uploaded files survive restarts. Defaults to backend/uploads for local dev.
export function getUploadsDir() {
  const configured = process.env.UPLOADS_DIR;
  const dir = configured && configured.trim()
    ? path.resolve(configured.trim())
    : path.join(__dirname, "..", "uploads");
  return dir;
}

// mkdir -p helper. Called lazily (per upload request) instead of at import
// time, because dotenv loads AFTER module imports — resolving the directory
// at import time would ignore a UPLOADS_DIR set in .env.
export function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const subdir = (name) => path.join(getUploadsDir(), name);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ensureDir(getUploadsDir())),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.fieldname + "-" + Date.now() + ext;
    cb(null, safeName);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, or PDF files are allowed"));
  }
  return cb(null, true);
};

export const corUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Used for student-inventory + consent scans. Same constraints as COR uploads
// (PDF/JPG/PNG, max 5 MB) — file is renamed on disk to <fieldname>-<timestamp>.<ext>.
export const recordScanUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ensureDir(subdir("avatars"))),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.user?.id || "anon";
    cb(null, `avatar-${userId}-${Date.now()}${ext}`);
  },
});

const avatarFileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, or WEBP images are allowed"));
  }
  return cb(null, true);
};

export const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

const signatureStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ensureDir(subdir("signatures"))),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.user?.id || "anon";
    cb(null, `signature-${userId}-${Date.now()}${ext}`);
  },
});

// Digital signatures are transparent PNGs (ideally) or JPGs — same image
// constraints as avatars, capped a little smaller since a signature is a
// simple line drawing.
export const signatureUpload = multer({
  storage: signatureStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

const pubmatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ensureDir(subdir("pubmats"))),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const adminId = req.user?.id || "anon";
    cb(null, `pubmat-${adminId}-${Date.now()}${ext}`);
  },
});

export const pubmatUpload = multer({
  storage: pubmatStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const testResultStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ensureDir(subdir("test-results"))),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const counselorId = req.user?.id || "anon";
    cb(null, `result-${counselorId}-${Date.now()}${ext}`);
  },
});

// Counselors attach a photo or scanned/typed document (e.g. an answer sheet)
// when releasing a test result, so PDFs and Word docs are allowed here in
// addition to images (unlike corUpload/avatarUpload/pubmatUpload).
const testResultFileFilter = (_req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, PDF, DOC, or DOCX files are allowed"));
  }
  return cb(null, true);
};

export const testResultUpload = multer({
  storage: testResultStorage,
  fileFilter: testResultFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
