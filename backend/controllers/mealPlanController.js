import MealPlan from "../models/MealPlan.js";

// normalize any incoming date string/Date to a UTC midnight Date,
// so "2025-06-02" always maps to the same slot regardless of time-of-day.
const toDayStart = (value) => {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// GET /api/mealplan?start=YYYY-MM-DD&end=YYYY-MM-DD
export const getMealPlan = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ message: "start and end query params are required" });
    }

    const entries = await MealPlan.find({
      user: req.user._id,
      date: { $gte: toDayStart(start), $lte: toDayStart(end) },
    })
      .populate("recipe", "title tags")
      .sort({ date: 1 });

    res.json(entries);
  } catch (err) {
    next(err);
  }
};

// POST /api/mealplan  { date, mealType, recipeId }
// Adds a recipe to the slot. A slot can hold several recipes (e.g. a main + a
// side); adding the same recipe to the same slot twice is a no-op (upsert on
// the user+date+mealType+recipe key) rather than an error.
export const setMealSlot = async (req, res, next) => {
  try {
    const { date, mealType, recipeId } = req.body;
    if (!date || !mealType || !recipeId) {
      return res.status(400).json({ message: "date, mealType, and recipeId are required" });
    }

    const entry = await MealPlan.findOneAndUpdate(
      { user: req.user._id, date: toDayStart(date), mealType, recipe: recipeId },
      { user: req.user._id, date: toDayStart(date), mealType, recipe: recipeId },
      { new: true, upsert: true, runValidators: true }
    ).populate("recipe", "title tags");

    res.status(200).json(entry);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/mealplan/:id
export const clearMealSlot = async (req, res, next) => {
  try {
    const entry = await MealPlan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: "Meal plan entry not found" });
    res.json({ message: "Slot cleared" });
  } catch (err) {
    next(err);
  }
};
