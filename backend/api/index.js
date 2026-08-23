import dotenv from "dotenv";
dotenv.config();

import app from "../app.js";

// Vercel invokes this file's default export as (req, res) for every request
// matched by vercel.json's rewrite — Express apps already implement that
// same (req, res) => {} signature, so we can export it directly with no
// adapter needed.
export default app;
