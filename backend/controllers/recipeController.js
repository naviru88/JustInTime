import Recipe from "../models/Recipe.js";
import PantryItem from "../models/PantryItem.js";
import { rankRecipes } from "../services/matchingEngine.js";
import { deletePhotoFile } from "../middleware/upload.js";

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

// PUT /api/recipes/:id/photo  (multipart/form-data, field name "photo")
export const uploadRecipePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "A photo file is required" });
    }
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      deletePhotoFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ message: "Recipe not found" });
    }

    deletePhotoFile(recipe.photoUrl); // remove the old photo, if any
    recipe.photoUrl = `/uploads/${req.file.filename}`;
    await recipe.save();

    res.json(recipe);
  } catch (err) {
    next(err);
  }
};
