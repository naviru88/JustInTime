import express from "express";
import { signup, login, googleAuth, getMe, updateNotificationSettings } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", protect, getMe);
router.patch("/notifications", protect, updateNotificationSettings);

export default router;
