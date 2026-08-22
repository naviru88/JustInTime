import express from "express";
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  lookupBarcode,
} from "../controllers/pantryController.js";

const router = express.Router();

router.route("/").get(getPantryItems).post(addPantryItem);
// Above "/:id" — "/lookup/:barcode" has two segments so it can't collide,
// but keeping the more specific route first is the safer habit.
router.get("/lookup/:barcode", lookupBarcode);
router.route("/:id").put(updatePantryItem).delete(deletePantryItem);

export default router;
