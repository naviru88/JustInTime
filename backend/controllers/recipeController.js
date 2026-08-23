import Recipe from "../models/Recipe.js";
import PantryItem from "../models/PantryItem.js";
import MealPlan from "../models/MealPlan.js";
import { rankRecipes } from "../services/matchingEngine.js";
import { generateRecipesFromPantry } from "../services/openRouterService.js";

// GET /api/recipes
export const getAllRecipes = async (req, res, next) => {
  try {
    const recipes = await Recipe.find();
    res.json(recipes);
  } catch (err) {
    next(err);
  }
};

// GET /api/recipes/:id
export const getRecipeById = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    res.json(recipe);
  } catch (err) {
    next(err);
  }
};

// GET /api/recipes/matches
// Core feature: rank all recipes against the current pantry, factoring in expiry urgency.
// Optional query params: ?tags=vegetarian,vegan  to filter by dietary tags first
export const getMatchedRecipes = async (req, res, next) => {
  try {
    const pantryItems = await PantryItem.find({ user: req.user._id });

    let recipeQuery = {};
    if (req.query.tags) {
      const tags = req.query.tags.split(",").map((t) => t.trim().toLowerCase());
      recipeQuery.tags = { $all: tags };
    }

    const recipes = await Recipe.find(recipeQuery);
    const ranked = rankRecipes(pantryItems, recipes);

    res.json(ranked);
  } catch (err) {
    next(err);
  }
};

// POST /api/recipes/generate
// Generates real recipes from the user's own pantry via OpenRouter, prioritizing
// soon-to-expire ingredients, and saves them into the shared recipe catalog.
// Body (all optional): { count, tags: string[] }
export const generateRecipes = async (req, res, next) => {
  try {
    const pantryItems = await PantryItem.find({ user: req.user._id }).sort({ expiryDate: 1 });
    if (pantryItems.length === 0) {
      return res.status(400).json({
        message: "Add a few pantry items first — there's nothing to generate recipes from yet.",
      });
    }

    const { count, tags } = req.body || {};

    let generated;
    try {
      generated = await generateRecipesFromPantry(pantryItems, { count, tags });
    } catch (genErr) {
      if (genErr.code === "OPENROUTER_NOT_CONFIGURED") {
        return res.status(500).json({
          message: "Recipe generation isn't configured on this server yet (missing OPENROUTER_API_KEY).",
        });
      }
      if (genErr.code === "OPENROUTER_BAD_JSON" || genErr.code === "OPENROUTER_EMPTY_RESPONSE") {
        return res.status(502).json({
          message: "The model's response couldn't be understood. Try again.",
        });
      }
      if (genErr.name === "AbortError") {
        return res.status(504).json({ message: "Recipe generation timed out. Try again." });
      }
      throw genErr;
    }

    if (generated.length === 0) {
      return res.status(502).json({ message: "No usable recipes came back. Try again." });
    }

    const created = await Recipe.insertMany(
      generated.map((r) => ({ ...r, source: "generated" }))
    );

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// POST /api/recipes  (for manually adding/seeding recipes via API)
export const createRecipe = async (req, res, next) => {
  try {
    const recipe = await Recipe.create(req.body);
    res.status(201).json(recipe);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/recipes/:id
// Recipes are shared across users (not user-scoped), so deleting one also
// clears any meal-plan entries — belonging to any user — that reference it,
// otherwise the calendar would be left pointing at a recipe that's gone.
export const deleteRecipe = async (req, res, next) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    await MealPlan.deleteMany({ recipe: recipe._id });

    res.json({ message: "Recipe removed" });
  } catch (err) {
    next(err);
  }
};
