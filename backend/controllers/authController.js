import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "30d" });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  notifications: {
    enabled: user.notifications?.enabled ?? false,
    daysBefore: user.notifications?.daysBefore ?? 2,
  },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/signup  { name, email, password }
export const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required" });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login  { email, password }
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
    if (!user || !user.passwordHash) {
      // Same message whether the account doesn't exist or is Google-only —
      // avoids leaking which emails are registered, and avoids implying a
      // Google-only account "has no password" (which invites enumeration).
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/google  { credential }
// `credential` is the ID token returned by Google Identity Services on the frontend.
export const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "credential is required" });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google sign-in isn't configured on this server" });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: "Invalid Google credential" });
    }

    const { sub: googleId, email, name, picture } = payload;
    if (!email) {
      return res.status(400).json({ message: "Google account has no email" });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        googleId,
        avatarUrl: picture || null,
      });
    } else if (!user.googleId) {
      // An account with this email already exists via password signup —
      // link the Google identity to it rather than creating a duplicate.
      user.googleId = googleId;
      if (!user.avatarUrl) user.avatarUrl = picture || null;
      await user.save();
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  res.json(publicUser(req.user));
};

// PATCH /api/auth/notifications  { enabled?, daysBefore? }
export const updateNotificationSettings = async (req, res, next) => {
  try {
    const { enabled, daysBefore } = req.body;

    if (enabled !== undefined) {
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be true or false" });
      }
      req.user.notifications.enabled = enabled;
    }

    if (daysBefore !== undefined) {
      const days = Number(daysBefore);
      if (!Number.isFinite(days) || days < 0 || days > 14) {
        return res.status(400).json({ message: "daysBefore must be a number between 0 and 14" });
      }
      req.user.notifications.daysBefore = days;
    }

    await req.user.save();
    res.json(publicUser(req.user));
  } catch (err) {
    next(err);
  }
};
