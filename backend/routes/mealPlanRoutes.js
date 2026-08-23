import express from "express";
import {
  getMealPlan,
  setMealSlot,
  clearMealSlot,
} from "../controllers/mealPlanController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getMealPlan).post(setMealSlot);
router.route("/:id").delete(clearMealSlot);

export default router;
