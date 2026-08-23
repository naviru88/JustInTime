import mongoose from "mongoose";

const mealPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner"],
      required: true,
    },
    recipe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      required: true,
    },
  },
  { timestamps: true }
);

// A date+mealType slot can hold multiple recipes (e.g. a main + a side),
// but the same recipe can't be added twice to the same slot, per user.
mealPlanSchema.index({ user: 1, date: 1, mealType: 1, recipe: 1 }, { unique: true });

export default mongoose.model("MealPlan", mealPlanSchema);
