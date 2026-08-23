import express from "express";
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  lookupBarcode,
  recognizePantryPhotos,
} from "../controllers/pantryController.js";
import { uploadPhotoMemory } from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getPantryItems).post(addPantryItem);
// Above "/:id" — "/lookup/:barcode" has two segments so it can't collide,
// but keeping the more specific route first is the safer habit.
router.get("/lookup/:barcode", lookupBarcode);
router.post("/recognize-photos", uploadPhotoMemory.array("photos", 10), recognizePantryPhotos);
router.route("/:id").put(updatePantryItem).delete(deletePantryItem);

export default router;
