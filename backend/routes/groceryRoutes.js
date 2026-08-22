import express from "express";
import { generateGrocery } from "../controllers/groceryController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/generate", generateGrocery);

export default router;
