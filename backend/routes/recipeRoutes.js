import express from "express";
import {
  getAllRecipes,
  getRecipeById,
  getMatchedRecipes,
  createRecipe,
  uploadRecipePhoto,
} from "../controllers/recipeController.js";
import { uploadPhoto } from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// IMPORTANT: /matches must be declared before /:id, otherwise Express
// will treat "matches" as an :id param and hit getRecipeById instead.
router.get("/matches", getMatchedRecipes);

router.route("/").get(getAllRecipes).post(createRecipe);
router.put("/:id/photo", uploadPhoto.single("photo"), uploadRecipePhoto);
router.route("/:id").get(getRecipeById);

export default router;
