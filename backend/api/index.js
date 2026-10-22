import dotenv from "dotenv";
dotenv.config();

// backend/api/index.js
import app from "../app.js";
import connectDB from "../config/db.js";

// Connect to DB before handling the request (with caching)
connectDB();

export default app;
