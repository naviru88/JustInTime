import multer from "multer";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
  }
};

// Photos are only ever used transiently — e.g. barcode/fridge-photo scans
// that get analyzed and turned into text fields (name, quantity, expiry).
// Nothing is written to disk or any external storage, so memory storage is
// all that's needed; the buffer is discarded once the request completes.
export const uploadPhotoMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
