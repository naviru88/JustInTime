import express from "express";
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  lookupBarcode,
  uploadPantryPhoto,
} from "../controllers/pantryController.js";
import { uploadPhoto } from "../middleware/upload.js";

const router = express.Router();

router.route("/").get(getPantryItems).post(addPantryItem);
// Above "/:id" — "/lookup/:barcode" has two segments so it can't collide,
// but keeping the more specific route first is the safer habit.
router.get("/lookup/:barcode", lookupBarcode);
router.put("/:id/photo", uploadPhoto.single("photo"), uploadPantryPhoto);
router.route("/:id").put(updatePantryItem).delete(deletePantryItem);

export default router;
