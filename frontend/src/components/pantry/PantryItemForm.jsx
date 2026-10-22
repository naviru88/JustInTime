import { useCallback, useEffect, useRef, useState } from "react";
import BarcodeScanner from "./BarcodeScanner.jsx";
import { lookupBarcode, recognizePantryPhotos } from "../../services/api.js";

export default function PantryItemForm({ onAdd, onBarcodeBatch, onPhotoScan }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryDateEstimated, setExpiryDateEstimated] = useState(false);
  const [barcode, setBarcode] = useState(null);

  const photoInputRef = useRef(null);
  const cameraPhotoInputRef = useRef(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  
  const [lookupStatus, setLookupStatus] = useState(null);
  const [batchStatus, setBatchStatus] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const resetForm = () => {
    setName("");
    setQuantity("");
    setUnit("");
    setExpiryDate("");
    setExpiryDateEstimated(false);
    setBarcode(null);
    setLookupStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || savingManual) return;

    const item = {
      name: name.trim(),
      quantity: quantity ? Number(quantity) : 1,
      unit: unit.trim(),
      expiryDate: expiryDate || null,
      expiryDateEstimated: expiryDate ? expiryDateEstimated : null,
      barcode,
    };
    setSavingManual(true);
    try {
      await onAdd(item);
      resetForm();
      setBatchStatus(`Added ${item.name} to your pantry.`);
    } catch {
      setBatchStatus("The item couldn't be saved. Check your connection and try again.");
    } finally {
      setSavingManual(false);
    }
  };

  const handleDetected = useCallback(
    async (code) => {
      setScannerOpen(false);
      setBatchStatus(null);
      setBarcode(code);
      setLookupStatus("loading");

      let result;
      try {
        result = await lookupBarcode(code);
      } catch {
        setLookupStatus("error");
        return;
      }

      if (!result.found) {
        setLookupStatus(result.lookupUnavailable ? "error" : "not-found");
        return;
      }

      // Single barcode scanned.
      setLookupStatus(null);
      if (onBarcodeBatch) {
        onBarcodeBatch([code]);
      }
    },
    [onBarcodeBatch]
  );

  const handleDetectedBatch = useCallback(
    async (codes) => {
      setScannerOpen(false);
      setLookupStatus(null);
      setBatchStatus(null);

      if (onBarcodeBatch) {
        onBarcodeBatch(codes);
      }
    },
    [onBarcodeBatch]
  );

  const handlePhotoScanChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    setBatchStatus(null);
    setRecognizing(true);
    
    try {
      const items = await recognizePantryPhotos(files);
      if (onPhotoScan) {
        onPhotoScan(items);
      }
    } catch (error) {
      setBatchStatus(
        error.response?.data?.message ||
          error.message ||
          "Couldn't analyze that photo — try again or add items manually."
      );
    } finally {
      setRecognizing(false);
    }
  };

  return (
    <>
      <form className="pantry-form" onSubmit={handleSubmit}>
        <div className="scan-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="scan-button"
            onClick={() => setMenuOpen((o) => !o)}
            title="Scan a barcode or a photo of your fridge/pantry"
            disabled={recognizing}
          >
            📷 {recognizing ? "Analyzing..." : "Scan"}
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
                  cameraPhotoInputRef.current?.click();
                }}
              >
                📷 Take pantry photo
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  photoInputRef.current?.click();
                }}
              >
                🖼️ Choose from gallery
              </button>
            </div>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handlePhotoScanChange}
            hidden
          />
          <input
            ref={cameraPhotoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            multiple
            onChange={handlePhotoScanChange}
            hidden
          />
        </div>

        <input
          placeholder="Ingredient (e.g. tomato)"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (barcode) setLookupStatus(null);
          }}
          required
        />
        <input
          placeholder="Qty"
          type="number"
          min="0.01"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input
          placeholder="Unit (g, cup...)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => {
            setExpiryDate(e.target.value);
            setExpiryDateEstimated(false);
          }}
        />
        <button type="submit" disabled={savingManual}>
          {savingManual ? "Adding..." : "Add"}
        </button>
      </form>

      {lookupStatus && (
        <p className={`scan-status scan-status-${lookupStatus}`}>
          {lookupStatus === "loading" && "Looking up product..."}
          {lookupStatus === "not-found" && "No match for that barcode — fill in the details manually."}
          {lookupStatus === "error" &&
            "Product lookup is unavailable — fill in the details manually or try again."}
        </p>
      )}

      {batchStatus && <p className="scan-status">{batchStatus}</p>}

      {scannerOpen && (
        <BarcodeScanner
          onDetect={handleDetected}
          onDetectBatch={handleDetectedBatch}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
}
