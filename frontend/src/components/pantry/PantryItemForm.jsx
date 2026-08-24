import { useCallback, useEffect, useRef, useState } from "react";
import BarcodeScanner from "./BarcodeScanner.jsx";
import ScanResultOverlay from "./ScanResultOverlay.jsx";
import { lookupBarcode, recognizePantryPhotos } from "../../services/api.js";

export default function PantryItemForm({ onAdd }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [barcode, setBarcode] = useState(null);

  const photoInputRef = useRef(null);
  const cameraPhotoInputRef = useRef(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [lookupStatus, setLookupStatus] = useState(null); // null | "loading" | "not-found" | "error" | "found-estimated"
  const [scanResult, setScanResult] = useState(null); // the looked-up product, shown in the overlay
  const [batchStatus, setBatchStatus] = useState(null); // summary text after a multi-item batch add

  // Photo recognition ("scan a fridge/pantry photo") state, separate from
  // barcode lookup — recognizing is true while the photo is being analyzed,
  // recognizedItems holds the results once the review overlay should open.
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedItems, setRecognizedItems] = useState(null);
  const [recognitionAdding, setRecognitionAdding] = useState(false);

  // Close the "Scan" dropdown on an outside click.
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
    setBarcode(null);
    setLookupStatus(null);
    setScanResult(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      quantity: quantity ? Number(quantity) : 1,
      unit: unit.trim(),
      expiryDate: expiryDate || null,
      barcode,
    });

    resetForm();
  };

  const handleDetected = useCallback(async (code) => {
    setScannerOpen(false);
    setBatchStatus(null);
    setBarcode(code);
    setLookupStatus("loading");
    try {
      const result = await lookupBarcode(code);
      if (result.found) {
        setLookupStatus(null);
        // A successful scan is already a complete pantry item. Add it
        // immediately; the lookup supplies quantity, unit and an estimated
        // shelf-life date so the user never has to retype the product.
        onAdd({
          name: result.name,
          quantity: result.quantity ?? 1,
          unit: result.unit || "",
          expiryDate: result.expiryDate || null,
          barcode: result.barcode,
        });
        setBatchStatus(`Added ${result.name} to your pantry.`);
        resetForm();
      } else {
        setLookupStatus("not-found");
      }
    } catch {
      setLookupStatus("error");
    }
  }, [onAdd]);

  // Several barcode photos picked at once — look each one up and add every
  // match straight to the pantry (no per-item confirmation), so the list
  // fills in automatically as each lookup resolves.
  const handleDetectedBatch = useCallback(
    async ({ codes, unreadable }) => {
      setScannerOpen(false);
      setLookupStatus(null);
      setBatchStatus(`Looking up ${codes.length} barcode${codes.length === 1 ? "" : "s"}...`);

      let added = 0;
      let notFound = 0;
      for (const code of codes) {
        try {
          const result = await lookupBarcode(code);
          if (result.found) {
            onAdd({
              name: result.name,
              quantity: result.quantity ?? 1,
              unit: result.unit || "",
              expiryDate: result.expiryDate || null,
              barcode: result.barcode,
            });
            added += 1;
          } else {
            notFound += 1;
          }
        } catch {
          notFound += 1;
        }
      }

      const skipped = unreadable + notFound;
      setBatchStatus(
        `Added ${added} item${added === 1 ? "" : "s"} from photos` +
          (skipped > 0 ? ` — ${skipped} couldn't be matched.` : ".")
      );
    },
    [onAdd]
  );

  // "Add to pantry" in the barcode-match overlay — skips the form entirely.
  const handleQuickAdd = () => {
    if (!scanResult) return;
    onAdd({
      name: scanResult.name,
      quantity: scanResult.quantity ?? 1,
      unit: scanResult.unit || "",
      expiryDate: scanResult.expiryDate || null,
      barcode: scanResult.barcode,
    });
    setScanResult(null);
    resetForm();
  };

  // "Edit details" in the barcode-match overlay — prefills the form instead,
  // in case something needs adjusting before saving.
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

  // "Scan photo" — identifies every distinct food item visible and adds one
  // pantry entry per detected item with AI-estimated details.
  const handlePhotoScanChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    setBatchStatus(null);
    setRecognizing(true);
    try {
      const items = await recognizePantryPhotos(files);
      if (items.length === 0) {
        setBatchStatus("Couldn't identify any food in that photo. Try a clearer, closer shot.");
      } else {
        items.forEach((item) => onAdd(item));
        setBatchStatus(`Added ${items.length} item${items.length === 1 ? "" : "s"} from photo.`);
      }
    } catch {
      setBatchStatus("Couldn't analyze that photo — try again or add items manually.");
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

      {batchStatus && <p className="scan-status">{batchStatus}</p>}

      {scannerOpen && (
        <BarcodeScanner
          onDetect={handleDetected}
          onDetectBatch={handleDetectedBatch}
          onClose={() => setScannerOpen(false)}
        />
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
