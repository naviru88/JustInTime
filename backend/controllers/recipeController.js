import Recipe from "../models/Recipe.js";
import PantryItem from "../models/PantryItem.js";
import { rankRecipes } from "../services/matchingEngine.js";

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
    const pantryItems = await PantryItem.find();

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

// POST /api/recipes  (for manually adding/seeding recipes via API)
export const createRecipe = async (req, res, next) => {
  try {
    const recipe = await Recipe.create(req.body);
    res.status(201).json(recipe);
  } catch (err) {
    next(err);
  }
};
