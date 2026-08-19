import { useState } from "react";

export default function PantryItemForm({ onAdd }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      quantity: quantity ? Number(quantity) : 1,
      unit: unit.trim(),
      expiryDate: expiryDate || null,
    });

    setName("");
    setQuantity("");
    setUnit("");
    setExpiryDate("");
  };

  return (
    <form className="pantry-form" onSubmit={handleSubmit}>
      <input
        placeholder="Ingredient (e.g. tomato)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        placeholder="Qty"
        type="number"
        min="0"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <input placeholder="Unit (g, cup...)" value={unit} onChange={(e) => setUnit(e.target.value)} />
      <input
        type="date"
        value={expiryDate}
        onChange={(e) => setExpiryDate(e.target.value)}
      />
      <button type="submit">Add</button>
    </form>
  );
}
