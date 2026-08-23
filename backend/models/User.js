import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    // Not required — a Google-only account has no local password.
    passwordHash: {
      type: String,
      default: null,
      select: false, // never returned unless explicitly requested
    },
    googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true, // allows many docs with googleId: null
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    notifications: {
      enabled: { type: Boolean, default: false },
      // How many days before an item's expiry date to remind the person.
      daysBefore: { type: Number, default: 2, min: 0, max: 14 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
