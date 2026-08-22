import { useState } from "react";

// Shown after a fridge/pantry photo is analyzed. Each detected item is
// editable and can be excluded before committing — recognition is a best
// guess, not something that should silently write to the pantry unreviewed.
export default function PhotoRecognitionOverlay({ items, onAddSelected, onClose, adding }) {
  const [rows, setRows] = useState(() =>
    items.map((item, i) => ({
      id: i,
      included: true,
      name: item.name,
      quantity: String(item.quantity ?? 1),
      unit: item.unit || "",
      expiryDate: item.expiryDate || "",
    }))
  );

  const updateRow = (id, changes) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  };

  const includedCount = rows.filter((r) => r.included && r.name.trim()).length;

  const handleAdd = () => {
    const selected = rows
      .filter((r) => r.included && r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        quantity: r.quantity ? Number(r.quantity) : 1,
        unit: r.unit.trim(),
        expiryDate: r.expiryDate || null,
      }));
    if (selected.length > 0) onAddSelected(selected);
  };

  return (
    <div className="scan-result-overlay" onClick={onClose}>
      <div className="photo-recognition-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scan-result-header">
          <span>
            {rows.length === 0
              ? "No items recognized"
              : `Found ${rows.length} item${rows.length > 1 ? "s" : ""}`}
          </span>
          <button type="button" className="scan-result-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="photo-recognition-empty">
            Couldn't identify any food in that photo. Try a clearer, closer shot, or add items
            manually.
          </div>
        ) : (
          <div className="photo-recognition-list">
            {rows.map((row) => (
              <div className={`photo-recognition-row ${row.included ? "" : "excluded"}`} key={row.id}>
                <input
                  type="checkbox"
                  checked={row.included}
                  onChange={(e) => updateRow(row.id, { included: e.target.checked })}
                />
                <input
                  className="pr-name"
                  value={row.name}
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
                  placeholder="Item name"
                />
                <input
                  className="pr-qty"
                  type="number"
                  min="0"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                  placeholder="Qty"
                />
                <input
                  className="pr-unit"
                  value={row.unit}
                  onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                  placeholder="Unit"
                />
                <input
                  className="pr-expiry"
                  type="date"
                  value={row.expiryDate}
                  onChange={(e) => updateRow(row.id, { expiryDate: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}

        <p className="photo-recognition-note">
          Estimated names, quantities, and expiry dates — double-check before adding.
        </p>

        <div className="scan-result-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="scan-result-add"
            onClick={handleAdd}
            disabled={includedCount === 0 || adding}
          >
            {adding
              ? "Adding..."
              : `Add ${includedCount || ""} item${includedCount === 1 ? "" : "s"} to pantry`}
          </button>
        </div>
      </div>
    </div>
  );
}
