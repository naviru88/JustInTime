import { useRef } from "react";
import { resolvePhotoUrl } from "../../services/api.js";

function expiryBadge(days) {
  if (days === null || days === undefined) {
    return { label: "No expiry set", className: "neutral" };
  }
  if (days < 0) return { label: "Expired", className: "urgent" };
  if (days === 0) return { label: "Use today", className: "urgent" };
  if (days <= 2) return { label: `${days}d left`, className: "urgent" };
  if (days <= 5) return { label: `${days}d left`, className: "warn" };
  return { label: `${days}d left`, className: "ok" };
}

function PantryItemPhoto({ item, onPhotoUpload }) {
  const fileInputRef = useRef(null);
  const photos = item.photos || [];
  const photoUrl = resolvePhotoUrl(photos[0]);

  return (
    <label className="pantry-thumb" title={photoUrl ? "Add more photos" : "Add a photo"}>
      {photoUrl ? (
        <img src={photoUrl} alt={item.name} />
      ) : (
        <span className="pantry-thumb-placeholder">📷</span>
      )}
      {photos.length > 1 && <span className="pantry-thumb-count">+{photos.length - 1}</span>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) onPhotoUpload(item._id, files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export default function PantryList({ items, onDelete, onPhotoUpload }) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        Your pantry is empty. Add what you have on hand to get recipe suggestions.
      </div>
    );
  }

  return (
    <ul className="pantry-list">
      {items.map((item) => {
        const badge = expiryBadge(item.daysUntilExpiry);
        return (
          <li className="pantry-item" key={item._id}>
            <div className="pantry-item-left">
              <PantryItemPhoto item={item} onPhotoUpload={onPhotoUpload} />
              <div>
                <span className="name">{item.name}</span>
                {(item.quantity || item.unit) && (
                  <span className="meta">
                    {item.quantity} {item.unit}
                  </span>
                )}
              </div>
            </div>
            <div className="item-right">
              <span className={`badge ${badge.className}`}>{badge.label}</span>
              <button className="icon-btn" onClick={() => onDelete(item._id)}>
                Remove
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
