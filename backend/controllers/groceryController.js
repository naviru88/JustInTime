import Recipe from "../models/Recipe.js";
import PantryItem from "../models/PantryItem.js";
import { generateGroceryList } from "../services/groceryListService.js";

// POST /api/grocery/generate
// body: { recipeIds: ["...", "..."] }
export const generateGrocery = async (req, res, next) => {
  try {
    const { recipeIds } = req.body;
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ message: "recipeIds must be a non-empty array" });
    }

    const [recipes, pantryItems] = await Promise.all([
      Recipe.find({ _id: { $in: recipeIds } }),
      PantryItem.find(),
    ]);

    if (recipes.length === 0) {
      return res.status(404).json({ message: "No matching recipes found" });
    }

    const result = generateGroceryList(recipes, pantryItems);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
