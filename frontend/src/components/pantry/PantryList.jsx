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

export default function PantryList({ items, onDelete }) {
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
            <div>
              <span className="name">{item.name}</span>
              {(item.quantity || item.unit) && (
                <span className="meta">
                  {item.quantity} {item.unit}
                </span>
              )}
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
