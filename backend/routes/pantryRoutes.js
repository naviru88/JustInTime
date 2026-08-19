import express from "express";
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
} from "../controllers/pantryController.js";

const router = express.Router();

router.route("/").get(getPantryItems).post(addPantryItem);
router.route("/:id").put(updatePantryItem).delete(deletePantryItem);

export default router;
