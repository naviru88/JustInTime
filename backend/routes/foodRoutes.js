import express from "express";
import { lookupBarcode } from "../controllers/pantryController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.post("/barcode", lookupBarcode);

export default router;