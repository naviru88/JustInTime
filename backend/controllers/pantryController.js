import PantryItem from "../models/PantryItem.js";
import { deletePhotoFile } from "../middleware/upload.js";

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
    const { name, quantity, unit, expiryDate, barcode } = req.body;
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

// Rough shelf-life estimates (days from today) keyed by Open Food Facts
// category tags, ordered most-specific-first since a product usually
// matches several tags and we want the most food-relevant one to win.
// This is deliberately a coarse heuristic, not food-safety guidance — the
// UI labels it as an estimate the person should double-check.
const SHELF_LIFE_BY_CATEGORY = [
  { days: 2, keywords: ["seafood", "fish", "shellfish", "sushi"] },
  { days: 4, keywords: ["meat", "poultry", "beef", "pork", "sausage", "deli"] },
  { days: 6, keywords: ["fresh-vegetables", "fresh-fruits", "vegetables", "fruits", "salad"] },
  { days: 5, keywords: ["bread", "bakery", "pastries"] },
  { days: 10, keywords: ["dairies", "cheese", "yogurt", "yoghurt", "milk", "cream"] },
  { days: 21, keywords: ["egg"] },
  { days: 30, keywords: ["beverages", "juice", "soft-drink", "soda"] },
  { days: 90, keywords: ["snack", "chip", "cracker", "biscuit"] },
  { days: 180, keywords: ["frozen"] },
  { days: 180, keywords: ["sauce", "condiment", "oil", "dressing"] },
  { days: 270, keywords: ["pasta", "rice", "grain", "cereal", "flour"] },
  { days: 365, keywords: ["canned", "tinned", "preserve", "spice", "herb"] },
];
const DEFAULT_SHELF_LIFE_DAYS = 14;

const estimateShelfLifeDays = (categoriesTags = []) => {
  const tags = categoriesTags.map((t) => t.toLowerCase());
  for (const { keywords, days } of SHELF_LIFE_BY_CATEGORY) {
    if (keywords.some((kw) => tags.some((tag) => tag.includes(kw)))) return days;
  }
  return DEFAULT_SHELF_LIFE_DAYS;
};

const toISODate = (date) => date.toISOString().slice(0, 10);

// GET /api/pantry/lookup/:barcode
// Looks up a scanned UPC/EAN against Open Food Facts (no API key needed) so
// the pantry form can prefill a name/unit instead of the user typing it.
export const lookupBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
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
    const expiryDate = toISODate(new Date(Date.now() + shelfLifeDays * 24 * 60 * 60 * 1000));

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
    item.photos.forEach(deletePhotoFile);
    res.json({ message: "Item removed" });
  } catch (err) {
    next(err);
  }
};

// PUT /api/pantry/:id/photos  (multipart/form-data, field name "photos", multiple allowed)
export const uploadPantryPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one photo file is required" });
    }
    const item = await PantryItem.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) {
      req.files.forEach((f) => deletePhotoFile(`/uploads/${f.filename}`));
      return res.status(404).json({ message: "Item not found" });
    }

    item.photos.push(...req.files.map((f) => `/uploads/${f.filename}`));
    await item.save();

    res.json(item);
  } catch (err) {
    next(err);
  }
};
