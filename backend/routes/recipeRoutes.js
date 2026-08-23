import express from "express";
import {
  getAllRecipes,
  getRecipeById,
  getMatchedRecipes,
  createRecipe,
  generateRecipes,
  deleteRecipe,
} from "../controllers/recipeController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// IMPORTANT: /matches and /generate must be declared before /:id, otherwise
// Express will treat them as an :id param and hit getRecipeById instead.
router.get("/matches", getMatchedRecipes);
router.post("/generate", generateRecipes);

router.route("/").get(getAllRecipes).post(createRecipe);
router.route("/:id").get(getRecipeById).delete(deleteRecipe);

export default router;
