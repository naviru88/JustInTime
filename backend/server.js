import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import pantryRoutes from "./routes/pantryRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";
import groceryRoutes from "./routes/groceryRoutes.js";
import mealPlanRoutes from "./routes/mealPlanRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { UPLOAD_DIR } from "./middleware/upload.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/pantry", pantryRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/grocery", groceryRoutes);
app.use("/api/mealplan", mealPlanRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
