import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verifies the Bearer token and attaches the user (minus passwordHash) to req.user.
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Not authorized — no token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Not authorized — invalid or expired token" });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ message: "Not authorized — user no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
