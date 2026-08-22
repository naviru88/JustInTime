import { useCallback, useEffect, useRef, useState } from "react";
import BarcodeScanner from "./BarcodeScanner.jsx";
import ScanResultOverlay from "./ScanResultOverlay.jsx";
import { lookupBarcode } from "../../services/api.js";

export default function PantryItemForm({ onAdd }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [barcode, setBarcode] = useState(null);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [lookupStatus, setLookupStatus] = useState(null); // null | "loading" | "not-found" | "error" | "found-estimated"
  const [scanResult, setScanResult] = useState(null); // the looked-up product, shown in the overlay

  // Close the "Scan" dropdown on an outside click.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Revoke the object URL whenever it's replaced or the form unmounts, so we
  // don't leak blob URLs as the user picks several photos in a row.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const resetForm = () => {
    setName("");
    setQuantity("");
    setUnit("");
    setExpiryDate("");
    setBarcode(null);
    setLookupStatus(null);
    setScanResult(null);
    setPhotoFile(null);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd(
      {
        name: name.trim(),
        quantity: quantity ? Number(quantity) : 1,
        unit: unit.trim(),
        expiryDate: expiryDate || null,
        barcode,
      },
      photoFile
    );

    resetForm();
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleDetected = useCallback(async (code) => {
    setScannerOpen(false);
    setBarcode(code);
    setLookupStatus("loading");
    try {
      const result = await lookupBarcode(code);
      if (result.found) {
        setLookupStatus(null);
        setScanResult(result); // hand off to the overlay rather than filling the form silently
      } else {
        setLookupStatus("not-found");
      }
    } catch {
      setLookupStatus("error");
    }
  }, []);

  // "Add to pantry" in the overlay — skips the form entirely.
  const handleQuickAdd = () => {
    if (!scanResult) return;
    onAdd(
      {
        name: scanResult.name,
        quantity: scanResult.quantity ?? 1,
        unit: scanResult.unit || "",
        expiryDate: scanResult.expiryDate || null,
        barcode: scanResult.barcode,
      },
      null
    );
    setScanResult(null);
    resetForm();
  };

  // "Edit details" in the overlay — prefills the form instead, same as the
  // old behavior, in case something needs adjusting before saving.
  const handleEditManually = () => {
    if (scanResult) {
      setName(scanResult.name);
      if (scanResult.quantity !== null && scanResult.quantity !== undefined) {
        setQuantity(String(scanResult.quantity));
      }
      if (scanResult.unit) setUnit(scanResult.unit);
      if (scanResult.expiryDate) setExpiryDate(scanResult.expiryDate);
      setLookupStatus(scanResult.estimatedExpiry ? "found-estimated" : null);
    }
    setScanResult(null);
  };

  return (
    <>
      <form className="pantry-form" onSubmit={handleSubmit}>
        <div className="scan-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="scan-button"
            onClick={() => setMenuOpen((o) => !o)}
            title="Scan a barcode or attach a photo"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" className="scan-button-thumb" />
            ) : (
              "📷"
            )}{" "}
            Scan
          </button>

          {menuOpen && (
            <div className="scan-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setScannerOpen(true);
                }}
              >
                📷 Scan barcode
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  fileInputRef.current?.click();
                }}
              >
                🖼️ Upload photo
              </button>
              {photoFile && (
                <button
                  type="button"
                  role="menuitem"
                  className="scan-menu-remove"
                  onClick={() => {
                    setMenuOpen(false);
                    clearPhoto();
                  }}
                >
                  ✕ Remove photo
                </button>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handlePhotoChange}
            hidden
          />
        </div>

        <input
          placeholder="Ingredient (e.g. tomato)"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            // manual edits after a scan detach the item from that barcode's
            // looked-up name so we don't silently keep stale scan state
            if (barcode) setLookupStatus(null);
          }}
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

      {lookupStatus && (
        <p className={`scan-status scan-status-${lookupStatus}`}>
          {lookupStatus === "loading" && "Looking up product..."}
          {lookupStatus === "found-estimated" &&
            "Expiry is an estimate based on the product type, so double-check it."}
          {lookupStatus === "not-found" && "No match for that barcode — fill in the details manually."}
          {lookupStatus === "error" && "Couldn't reach the product lookup — fill in the details manually."}
        </p>
      )}

      {photoFile && !lookupStatus && (
        <p className="scan-status">Photo attached — it'll be added with this item.</p>
      )}

      {scannerOpen && (
        <BarcodeScanner onDetect={handleDetected} onClose={() => setScannerOpen(false)} />
      )}

      {scanResult && (
        <ScanResultOverlay
          product={scanResult}
          onAdd={handleQuickAdd}
          onEditManually={handleEditManually}
          onClose={() => setScanResult(null)}
        />
      )}
    </>
  );
}
