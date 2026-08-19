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
    const { name, quantity, unit, expiryDate } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Ingredient name is required" });
    }
    const item = await PantryItem.create({ name, quantity, unit, expiryDate });
    res.status(201).json(item);
  } catch (err) {
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
