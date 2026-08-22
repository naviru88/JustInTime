import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// All uploaded photos land in backend/uploads, served statically by server.js
// at /uploads/<filename>. Kept flat (no per-type subfolders) since filenames
// are already collision-proof.
export const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
  }
};

export const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Deletes a previously-uploaded photo when it's being replaced or the
// parent record is removed. Swallows errors — a missing/already-gone file
// shouldn't block the request.
export const deletePhotoFile = (photoUrl) => {
  if (!photoUrl) return;
  const filename = path.basename(photoUrl);
  fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
};
