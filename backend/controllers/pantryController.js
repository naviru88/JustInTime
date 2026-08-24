import PantryItem from "../models/PantryItem.js";
import { estimateShelfLifeDays, expiryDateFromToday } from "../services/shelfLifeEstimator.js";
import { identifyPantryItemsFromPhotos } from "../services/visionService.js";

// GET /api/pantry
export const getPantryItems = async (req, res, next) => {
  try {
    const items = await PantryItem.find({ user: req.user._id }).sort({ expiryDate: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// POST /api/pantry
export const addPantryItem = async (req, res, next) => {
  try {
    const { name, quantity, unit, expiryDate, barcode, source, confidence, category } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Ingredient name is required" });
    }
    const item = await PantryItem.create({
      user: req.user._id,
      name,
      quantity,
      unit,
      expiryDate,
      barcode,
      source: source || (barcode ? "barcode" : "manual"),
      confidence,
      category,
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// Best-effort parse of Open Food Facts' free-text "quantity" field (e.g.
// "500 g", "1 L", "12x330ml") into a numeric amount + unit we can prefill.
const KNOWN_UNITS = ["kg", "g", "mg", "l", "ml", "cl", "lb", "lbs", "oz", "fl oz", "ct", "pcs"];

const parseQuantity = (quantityText) => {
  if (!quantityText) return { amount: null, unit: "" };

  const matches = [...quantityText.matchAll(/([\d.,]+)\s*([a-zA-Zµ]+)/g)];
  for (const [, rawAmount, rawUnit] of matches) {
    const unit = rawUnit.toLowerCase();
    if (KNOWN_UNITS.includes(unit)) {
      const amount = parseFloat(rawAmount.replace(",", "."));
      if (!Number.isNaN(amount)) return { amount, unit };
    }
  }
  return { amount: null, unit: "" };
};

// GET /api/pantry/lookup/:barcode
// Looks up a scanned UPC/EAN against Open Food Facts (no API key needed) so
// the pantry form can prefill a name/unit instead of the user typing it.
export const lookupBarcode = async (req, res, next) => {
  try {
    const barcode = req.params.barcode || req.body?.barcode;
    if (!barcode || !/^\d{6,14}$/.test(barcode)) {
      return res.status(400).json({ message: "A numeric barcode (6-14 digits) is required" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let payload;
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,quantity,brands,categories_tags,image_front_small_url,image_url`,
        { signal: controller.signal }
      );
      payload = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    if (!payload || payload.status !== 1 || !payload.product?.product_name) {
      return res.json({ found: false, barcode });
    }

    const {
      product_name,
      quantity,
      brands,
      categories_tags,
      image_front_small_url,
      image_url,
    } = payload.product;
    const { amount, unit } = parseQuantity(quantity);
    const shelfLifeDays = estimateShelfLifeDays(categories_tags);
    const expiryDate = expiryDateFromToday(shelfLifeDays);

    res.json({
      found: true,
      barcode,
      name: brands ? `${product_name} (${brands.split(",")[0].trim()})` : product_name,
      quantity: amount ?? 1,
      unit,
      expiryDate,
      estimatedExpiry: true, // the API has no real expiry — this is a category-based guess
      imageUrl: image_front_small_url || image_url || null,
    });
  } catch (err) {
    // Network hiccup or Open Food Facts being unreachable shouldn't be a 500 —
    // just tell the client nothing was found so they can fall back to typing it in.
    if (err.name === "AbortError") {
      return res.json({ found: false, barcode: req.params.barcode, timedOut: true });
    }
    next(err);
  }
};

// PUT /api/pantry/:id
export const updatePantryItem = async (req, res, next) => {
  try {
    const item = await PantryItem.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/pantry/:id
export const deletePantryItem = async (req, res, next) => {
  try {
    const item = await PantryItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item removed" });
  } catch (err) {
    next(err);
  }
};

// POST /api/pantry/recognize-photos  (multipart/form-data, field name "photos")
// Runs each photo through vision recognition and returns a list of detected
// food items with an estimated expiry — nothing is saved to the pantry yet,
// the frontend shows these for review before adding.
export const recognizePantryPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one photo file is required" });
    }

    const photos = req.files.map((f) => ({ data: f.buffer, mimeType: f.mimetype }));

    let detected;
    try {
      detected = await identifyPantryItemsFromPhotos(photos);
    } catch (visionErr) {
      if (visionErr.code === "OPENROUTER_NOT_CONFIGURED") {
        return res.status(500).json({
          message: "Photo recognition isn't configured on this server yet.",
        });
      }
      throw visionErr;
    }

    const items = detected.map((item) => {
      const shelfLifeDays = estimateShelfLifeDays(item.category, item.name);
      return {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: expiryDateFromToday(shelfLifeDays),
        estimatedExpiry: true,
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
