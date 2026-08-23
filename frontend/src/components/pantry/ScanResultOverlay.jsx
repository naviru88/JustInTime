// Shown right after a barcode lookup succeeds. Lets the person add the item
// straight from the scan with no manual typing, or fall through to the form
// if they want to tweak something first.
export default function ScanResultOverlay({ product, onAdd, onEditManually, onClose }) {
  const { name, quantity, unit, expiryDate, estimatedExpiry, imageUrl } = product;

  return (
    <div className="scan-result-overlay" onClick={onClose}>
      <div className="scan-result-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scan-result-header">
          <span>Found it</span>
          <button type="button" className="scan-result-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="scan-result-body">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="scan-result-photo" />
          ) : (
            <div className="scan-result-photo-placeholder">📦</div>
          )}

          <div className="scan-result-info">
            <h3>{name}</h3>
            <p>
              {quantity ?? 1} {unit || ""}
            </p>
            {expiryDate && (
              <p className={estimatedExpiry ? "scan-result-estimate" : undefined}>
                {estimatedExpiry ? "Est. use by " : "Use by "}
                {expiryDate}
              </p>
            )}
          </div>
        </div>

        <div className="scan-result-actions">
          <button type="button" className="btn-secondary" onClick={onEditManually}>
            Edit details
          </button>
          <button type="button" className="scan-result-add" onClick={onAdd}>
            Add to pantry
          </button>
        </div>
      </div>
    </div>
  );
}
