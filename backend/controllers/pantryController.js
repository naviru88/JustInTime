import PantryItem from "../models/PantryItem.js";
import { estimateShelfLifeDays, expiryDateFromToday } from "../services/shelfLifeEstimator.js";
import { identifyPantryItemsFromPhotos } from "../services/visionService.js";

const MAX_BATCH_ITEMS = 50;
const VALID_SOURCES = new Set(["manual", "barcode", "image"]);
const KNOWN_UNITS = ["kg", "g", "mg", "l", "ml", "cl", "lb", "lbs", "oz", "fl oz", "ct", "pcs"];

export const recognizePantryPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one photo file is required" });
    }
    if (req.files.reduce((total, file) => total + file.size, 0) > 4 * 1024 * 1024) {
      return res.status(413).json({ message: "Photo batch is too large. Choose fewer or smaller photos." });
    }

    const photos = req.files.map((f) => ({ data: f.buffer, mimeType: f.mimetype }));

    let detected;
    try {
      detected = await identifyPantryItemsFromPhotos(photos);
    } catch (visionErr) {
      // FORCE THE EXACT ERROR TO THE FRONTEND
      console.error("VISION ERROR:", visionErr);
      return res.status(502).json({ 
        message: `Vision Error: ${visionErr.message || "Unknown error"}` 
      });
    }

    const items = detected.map((item) => {
      const hasVisibleExpiryDate = Boolean(item.expiryDate);
      const shelfLifeDays = estimateShelfLifeDays(item.category, item.name);
      return {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate || expiryDateFromToday(shelfLifeDays, req.body?.today),
        expiryDateEstimated: !hasVisibleExpiryDate,
        source: "image",
        confidence: item.confidence,
        category: item.category,
      };
    });

    res.json({ items });
  } catch (err) {
    next(err);
  }
};
