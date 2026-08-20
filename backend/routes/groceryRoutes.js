import express from "express";
import { generateGrocery } from "../controllers/groceryController.js";

const router = express.Router();

router.post("/generate", generateGrocery);

export default router;
