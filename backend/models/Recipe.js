import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, lowercase: true },
    quantity: { type: String, default: "" }, // free text, e.g. "2 cups"
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    ingredients: {
      type: [ingredientSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    steps: {
      type: [String],
      required: true,
    },
    tags: {
      type: [String], // e.g. "vegetarian", "vegan", "gluten-free"
      default: [],
    },
    source: {
      type: String,
      enum: ["seeded", "generated"],
      default: "seeded",
    },
    // Relative path served statically by Express, e.g. "/uploads/xyz.jpg"
    photoUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Recipe", recipeSchema);
