import PantryItem from "../models/PantryItem.js";

// GET /api/pantry
export const getPantryItems = async (req, res, next) => {
  try {
    const items = await PantryItem.find().sort({ expiryDate: 1 });
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
    const item = await PantryItem.create({ name, quantity, unit, expiryDate, barcode });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// Best-effort parse of Open Food Facts' free-text "quantity" field (e.g.
// "500 g", "1 L", "12x330ml") down to a single unit we can prefill.
const guessUnit = (quantityText) => {
  if (!quantityText) return "";
  const match = quantityText.match(/([a-zA-Z]+)\s*$/);
  return match ? match[1].toLowerCase() : "";
};

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
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,quantity,brands`,
        { signal: controller.signal }
      );
      payload = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    if (!payload || payload.status !== 1 || !payload.product?.product_name) {
      return res.json({ found: false, barcode });
    }

    const { product_name, quantity, brands } = payload.product;
    res.json({
      found: true,
      barcode,
      name: brands ? `${product_name} (${brands.split(",")[0].trim()})` : product_name,
      unit: guessUnit(quantity),
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
    const item = await PantryItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/pantry/:id
export const deletePantryItem = async (req, res, next) => {
  try {
    const item = await PantryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item removed" });
  } catch (err) {
    next(err);
  }
};
