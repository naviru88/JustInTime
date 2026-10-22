import { useCallback, useEffect, useRef, useState } from "react";
import BarcodeScanner from "./BarcodeScanner.jsx";
import PhotoRecognitionOverlay from "./PhotoRecognitionOverlay.jsx";
import { lookupBarcode, recognizePantryPhotos } from "../../services/api.js";

export default function PantryItemForm({ onAdd, onAddMany }) {
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
  const [lookupStatus, setLookupStatus] = useState(null); // null | "loading" | "not-found" | "error"
  const [batchStatus, setBatchStatus] = useState(null); // summary text after a multi-item batch add

  // Photo recognition ("scan a fridge/pantry photo") state, separate from
  // barcode lookup — recognizing is true while the photo is being analyzed,
  // recognizedItems holds the results once the review overlay should open.
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedItems, setRecognizedItems] = useState(null);
  const [recognitionAdding, setRecognitionAdding] = useState(false);
  const [savingManual, setSavingManual] = useState(false);

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

  const handleDetected = useCallback(async (code) => {
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

    const item = {
      name: result.name,
      quantity: result.quantity ?? 1,
      unit: result.unit || "",
      expiryDate: result.expiryDate || null,
      expiryDateEstimated: result.expiryDateEstimated === true,
      barcode: result.barcode,
      source: "barcode",
    };
    try {
      await onAdd(item);
      setLookupStatus(null);
      setBatchStatus(
        `Added ${result.name} to your pantry.` +
          (item.expiryDateEstimated ? " The use-by date is an estimate; check the package." : "")
      );
      resetForm();
    } catch {
      setName(item.name);
      setQuantity(String(item.quantity));
      setUnit(item.unit);
      setExpiryDate(item.expiryDate || "");
      setExpiryDateEstimated(item.expiryDateEstimated);
      setLookupStatus(null);
      setBatchStatus("Product found, but it wasn't saved. Check the form and try Add again.");
    }
  }, [onAdd]);

  // Several barcode photos picked at once — look each one up and add every
  // match straight to the pantry (no per-item confirmation), so the list
  // fills in automatically as each lookup resolves.
  const handleDetectedBatch = useCallback(
    async ({ codes, unreadable = 0 }) => {
      setScannerOpen(false);
      setLookupStatus(null);
      setBatchStatus(`Looking up ${codes.length} barcode${codes.length === 1 ? "" : "s"}...`);

      const lookups = await Promise.all(codes.map(async (code) => {
        try {
          const result = await lookupBarcode(code);
          return { result };
        } catch {
          return { error: true };
        }
      }));

      const found = lookups
        .filter(({ result }) => result?.found)
        .map(({ result }) => ({
          name: result.name,
          quantity: result.quantity ?? 1,
          unit: result.unit || "",
          expiryDate: result.expiryDate || null,
          expiryDateEstimated: result.expiryDateEstimated === true,
          barcode: result.barcode,
          source: "barcode",
        }));
      const notFound = lookups.filter(({ result }) => result && !result.found && !result.lookupUnavailable).length;
      const unavailable = lookups.filter(({ error, result }) => error || result?.lookupUnavailable).length;

      let added = 0;
      if (found.length > 0) {
        try {
          await onAddMany(found);
          added = found.length;
        } catch {
          setBatchStatus(
            `Found ${found.length} product${found.length === 1 ? "" : "s"}, but the batch couldn't be saved. ` +
              "Check your connection and scan again."
          );
          return;
        }
      }

      const skipped = unreadable + notFound + unavailable;
      setBatchStatus(
        `Added ${added} item${added === 1 ? "" : "s"} from photos` +
          (skipped > 0 ? ` — ${skipped} unreadable, unmatched, or unavailable.` : ".") +
          (added > 0 ? " Dates are shelf-life estimates; check the packages." : "")
      );
    },
    [onAddMany]
  );

  // "Scan photo" — identifies every distinct food item visible and opens a
  // confirmation list. Recognition results stay separate from the real pantry
  // until the user explicitly adds the selected entries.
  const handlePhotoScanChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    setBatchStatus(null);
    setRecognizing(true);
    try {
      const items = await recognizePantryPhotos(files);
      setRecognizedItems(items);
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

  const handleAddRecognizedItems = async (items) => {
    setRecognitionAdding(true);
    try {
      await onAddMany(items);
      setRecognizedItems(null);
      setBatchStatus(
        `Added ${items.length} item${items.length === 1 ? "" : "s"} from photo. ` +
          "Estimated dates are marked in your pantry; check the packages."
      );
    } catch {
      setBatchStatus("The items were recognized, but the batch couldn't be saved. Check your connection and try again.");
    } finally {
      setRecognitionAdding(false);
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
          min="0.01"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input placeholder="Unit (g, cup...)" value={unit} onChange={(e) => setUnit(e.target.value)} />
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

      {recognizedItems && (
        <PhotoRecognitionOverlay
          items={recognizedItems}
          onAddSelected={handleAddRecognizedItems}
          onClose={() => setRecognizedItems(null)}
          adding={recognitionAdding}
        />
      )}
    </>
  );
}
