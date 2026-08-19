import express from "express";
import {
  getAllRecipes,
  getRecipeById,
  getMatchedRecipes,
  createRecipe,
} from "../controllers/recipeController.js";

const router = express.Router();

// IMPORTANT: /matches must be declared before /:id, otherwise Express
// will treat "matches" as an :id param and hit getRecipeById instead.
router.get("/matches", getMatchedRecipes);

router.route("/").get(getAllRecipes).post(createRecipe);
router.route("/:id").get(getRecipeById);

export default router;
