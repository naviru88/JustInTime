import { useState } from "react";

function expiryBadge(days, estimated = false) {
  if (days === null || days === undefined) {
    return { label: "No expiry set", className: "neutral" };
  }
  if (days < 0 && estimated) return { label: "Estimate passed · check", className: "warn" };
  if (days < 0) return { label: "Expired", className: "urgent" };
  if (days === 0) return { label: "Use today", className: "urgent" };
  if (days <= 2) return { label: `${days}d left`, className: "urgent" };
  if (days <= 5) return { label: `${days}d left`, className: "warn" };
  return { label: `${days}d left`, className: "ok" };
}

function expiryEstimated(item) {
  return item.expiryDateEstimated ?? ["barcode", "image"].includes(item.source);
}

function PantryItemRow({ item, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const estimated = expiryEstimated(item);
  const badge = expiryBadge(item.daysUntilExpiry, estimated);

  const beginEdit = () => {
    setDraft({
      name: item.name,
      quantity: String(item.quantity ?? 1),
      unit: item.unit || "",
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "",
      expiryDateEstimated: estimated,
    });
    setError("");
    setEditing(true);
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (saving || !draft?.name.trim() || !Number.isFinite(Number(draft.quantity)) || Number(draft.quantity) <= 0) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onUpdate(item._id, {
        name: draft.name.trim(),
        quantity: Number(draft.quantity),
        unit: draft.unit.trim(),
        expiryDate: draft.expiryDate || null,
        expiryDateEstimated: draft.expiryDate ? draft.expiryDateEstimated : null,
      });
      setEditing(false);
      setDraft(null);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this item. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (editing && draft) {
    return (
      <li className="pantry-item">
        <form className="pantry-edit-form" onSubmit={saveEdit}>
          <div className="pantry-edit-fields">
            <label>
              Item
              <input
                required
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={draft.quantity}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, quantity: event.target.value }))
                }
              />
            </label>
            <label>
              Unit
              <input
                value={draft.unit}
                onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
              />
            </label>
            <label>
              Use-by date
              <input
                type="date"
                value={draft.expiryDate}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    expiryDate: event.target.value,
                    expiryDateEstimated: false,
                  }))
                }
              />
            </label>
          </div>
          <div className="pantry-edit-footer">
            {draft.expiryDate ? (
              <label className="pantry-edit-verified">
                <input
                  type="checkbox"
                  checked={!draft.expiryDateEstimated}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      expiryDateEstimated: !event.target.checked,
                    }))
                  }
                />
                I've checked this date against the package
              </label>
            ) : (
              <span className="pantry-edit-hint">No date set</span>
            )}
            <div className="pantry-edit-actions">
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="pantry-edit-save" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
          {error && <p className="pantry-edit-error">{error}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className="pantry-item" key={item._id}>
      <div>
        <span className="name">{item.name}</span>
        {(item.quantity || item.unit) && (
          <span className="meta">
            {item.quantity} {item.unit}
          </span>
        )}
      </div>
      <div className="item-right">
        <span className={`badge ${badge.className}`}>
          {estimated && item.daysUntilExpiry != null && item.daysUntilExpiry >= 0
            ? `Est. ${badge.label}`
            : badge.label}
        </span>
        <button type="button" className="icon-btn" onClick={beginEdit}>
          Edit
        </button>
        <button type="button" className="icon-btn" onClick={() => onDelete(item._id)}>
          Remove
        </button>
      </div>
    </li>
  );
}

export default function PantryList({ items, onDelete, onUpdate }) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        Your pantry is empty. Add what you have on hand to get recipe suggestions.
      </div>
    );
  }

  return (
    <ul className="pantry-list">
      {items.map((item) => (
        <PantryItemRow key={item._id} item={item} onDelete={onDelete} onUpdate={onUpdate} />
      ))}
    </ul>
  );
}
