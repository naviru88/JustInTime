import express from "express";
import {
  getMealPlan,
  setMealSlot,
  clearMealSlot,
} from "../controllers/mealPlanController.js";

const router = express.Router();

router.route("/").get(getMealPlan).post(setMealSlot);
router.route("/:id").delete(clearMealSlot);

export default router;
