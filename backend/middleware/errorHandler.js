// Centralized error handler — every controller calls next(err) and lands here
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Multer surfaces upload problems (oversized file, bad mimetype from our
  // fileFilter, etc.) as errors rather than a normal response — translate
  // them into a friendly 400 instead of a generic 500.
  if (err.name === "MulterError" || /Only JPEG, PNG, WebP, or GIF/.test(err.message || "")) {
    return res.status(400).json({ message: err.message });
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};
