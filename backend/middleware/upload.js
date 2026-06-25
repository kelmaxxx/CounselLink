import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
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

const avatarsDir = path.join(uploadsDir, "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
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

const pubmatsDir = path.join(uploadsDir, "pubmats");
if (!fs.existsSync(pubmatsDir)) {
  fs.mkdirSync(pubmatsDir, { recursive: true });
}

const pubmatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pubmatsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const adminId = req.user?.id || "anon";
    cb(null, `pubmat-${adminId}-${Date.now()}${ext}`);
  },
});

export const pubmatUpload = multer({
  storage: pubmatStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const testResultsDir = path.join(uploadsDir, "test-results");
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

const testResultStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, testResultsDir),
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
