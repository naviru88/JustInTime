import mongoose from "mongoose";

const pantryItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    unit: {
      type: String,
      default: "",
      trim: true,
    },
    // UPC/EAN code from a barcode scan, if the item was added that way.
    // Not unique — the same product can be added in separate batches.
    barcode: {
      type: String,
      default: null,
      trim: true,
    },
    expiryDate: {
      type: Date,
      default: null, // null = no known expiry
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Virtual: days left until expiry (negative = already expired)
pantryItemSchema.virtual("daysUntilExpiry").get(function () {
  if (!this.expiryDate) return null;
  const diffMs = this.expiryDate.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
});

pantryItemSchema.set("toJSON", { virtuals: true });
pantryItemSchema.set("toObject", { virtuals: true });

export default mongoose.model("PantryItem", pantryItemSchema);
