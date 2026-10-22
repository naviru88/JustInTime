import PantryItem from "../models/PantryItem.js";
import { estimateShelfLifeDays, expiryDateFromToday } from "../services/shelfLifeEstimator.js";
import { identifyPantryItemsFromPhotos } from "../services/visionService.js";

const MAX_BATCH_ITEMS = 50;
const VALID_SOURCES = new Set(["manual", "barcode", "image"]);

const normalizePantryItem = (input, userId) => {
  if (!input || typeof input !== "object" || !String(input.name || "").trim()) {
    return { error: "Every pantry item needs a name." };
  }

  const quantity = input.quantity === "" || input.quantity === undefined || input.quantity === null
    ? 1
    : Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: `Quantity for "${String(input.name).trim()}" must be greater than zero.` };
  }

  const expiryDate = input.expiryDate || null;
  if (expiryDate && Number.isNaN(Date.parse(expiryDate))) {
    return { error: `Expiry date for "${String(input.name).trim()}" is invalid.` };
  }

  const source = VALID_SOURCES.has(input.source)
    ? input.source
    : input.barcode
      ? "barcode"
      : "manual";

  const confidence = input.confidence === "" || input.confidence === undefined || input.confidence === null
    ? null
    : Number(input.confidence);

  return {
    value: {
      user: userId,
      name: String(input.name).trim(),
      quantity,
      unit: typeof input.unit === "string" ? input.unit.trim() : "",
      expiryDate,
      expiryDateEstimated: expiryDate ? input.expiryDateEstimated === true : null,
      barcode: input.barcode ? String(input.barcode).trim() : null,
      source,
      confidence:
        Number.isFinite(confidence) && confidence >= 0 && confidence <= 1
          ? confidence
          : null,
      category: typeof input.category === "string" ? input.category.trim().toLowerCase() : "",
    },
  };
};

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
    const normalized = normalizePantryItem(req.body, req.user._id);
    if (normalized.error) return res.status(400).json({ message: normalized.error });
    const item = await PantryItem.create(normalized.value);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// POST /api/pantry/bulk — validate the entire selection before writing it.
export const addPantryItems = async (req, res, next) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Choose at least one pantry item to add." });
    }
    if (items.length > MAX_BATCH_ITEMS) {
      return res.status(400).json({ message: `A batch can contain at most ${MAX_BATCH_ITEMS} items.` });
    }

    const normalized = items.map((item) => normalizePantryItem(item, req.user._id));
    const invalid = normalized.find((item) => item.error);
    if (invalid) return res.status(400).json({ message: invalid.error });

    const created = await PantryItem.insertMany(normalized.map((item) => item.value));
    res.status(201).json({ items: created });
  } catch (err) {
    next(err);
  }
};

// Best-effort parse of Open Food Facts' free-text "quantity" field (e.g.
// "500 g", "1 L", "12x330ml") into a numeric amount + unit we can prefill.
const KNOWN_UNITS = ["kg", "g", "mg", "l", "ml", "cl", "lb", "lbs", "oz", "fl oz", "ct", "pcs"];

const parseQuantity = (quantityText) => {
  if (typeof quantityText !== "string" || !quantityText) return { amount: null, unit: "" };

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
    const barcode = String(req.params.barcode || req.body?.barcode || "").trim();
    if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(barcode)) {
      return res.status(400).json({ message: "Enter a valid 8, 12, 13, or 14 digit food barcode." });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let payload;
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,quantity,brands,categories_tags`,
        {
          signal: controller.signal,
          headers: { "User-Agent": "JustInTimeExpiryRecipePlanner/1.0" },
        }
      );
      if (!response.ok) {
        return res.json({ found: false, barcode, lookupUnavailable: true });
      }
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
    } = payload.product;
    const { amount, unit } = parseQuantity(quantity);
    const shelfLifeDays = estimateShelfLifeDays(categories_tags, product_name);
    const expiryDate = expiryDateFromToday(shelfLifeDays, req.body?.today);

    res.json({
      found: true,
      barcode,
      name:
        typeof brands === "string" && brands.trim()
          ? `${product_name} (${brands.split(",")[0].trim()})`
          : product_name,
      quantity: amount ?? 1,
      unit,
      expiryDate,
      expiryDateEstimated: true, // barcode databases do not contain the package's printed date
    });
  } catch (err) {
    // A product lookup outage should not prevent manual entry or another scan.
    return res.json({
      found: false,
      barcode: String(req.params.barcode || req.body?.barcode || ""),
      lookupUnavailable: true,
      timedOut: err.name === "AbortError",
    });
  }
};

// PUT /api/pantry/:id
export const updatePantryItem = async (req, res, next) => {
  try {
    const body = req.body || {};
    const updates = {};

    if (Object.hasOwn(body, "name")) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return res.status(400).json({ message: "Ingredient name is required." });
      }
      updates.name = body.name.trim();
    }
    if (Object.hasOwn(body, "quantity")) {
      const quantity = Number(body.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Quantity must be greater than zero." });
      }
      updates.quantity = quantity;
    }
    if (Object.hasOwn(body, "unit")) {
      if (typeof body.unit !== "string") {
        return res.status(400).json({ message: "Unit must be text." });
      }
      updates.unit = body.unit.trim();
    }
    if (Object.hasOwn(body, "expiryDate")) {
      const expiryDate = body.expiryDate || null;
      if (expiryDate && Number.isNaN(Date.parse(expiryDate))) {
        return res.status(400).json({ message: "Expiry date is invalid." });
      }
      updates.expiryDate = expiryDate;
    }
    if (Object.hasOwn(body, "expiryDateEstimated")) {
      if (body.expiryDateEstimated !== null && typeof body.expiryDateEstimated !== "boolean") {
        return res.status(400).json({ message: "Expiry estimate status is invalid." });
      }
      updates.expiryDateEstimated = updates.expiryDate === null ? null : body.expiryDateEstimated;
    } else if (Object.hasOwn(body, "expiryDate")) {
      updates.expiryDateEstimated = updates.expiryDate ? false : null;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Provide at least one pantry field to update." });
    }

    const item = await PantryItem.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
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
    if (req.files.reduce((total, file) => total + file.size, 0) > 4 * 1024 * 1024) {
      return res.status(413).json({ message: "Photo batch is too large. Choose fewer or smaller photos." });
    }

    const photos = req.files.map((f) => ({ data: f.buffer, mimeType: f.mimetype }));

    let detected;
    try {
      detected = await identifyPantryItemsFromPhotos(photos);
    } catch (visionErr) {
      if (visionErr.code === "OPENROUTER_NOT_CONFIGURED") {
        return res.status(503).json({
          message: "Photo recognition isn't configured on this server yet.",
        });
      }
      throw visionErr;
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
    if (err.code === "OPENROUTER_TIMEOUT" || err.code === "OPENROUTER_REQUEST_FAILED" ||
      err.code === "OPENROUTER_INVALID_RESPONSE") {
      return res.status(502).json({
        message: "Photo recognition could not complete. Try fewer or clearer photos, or enter the items manually.",
      });
    }
    next(err);
  }
};
