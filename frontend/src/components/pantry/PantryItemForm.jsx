import { useCallback, useState } from "react";
import BarcodeScanner from "./BarcodeScanner.jsx";
import { lookupBarcode } from "../../services/api.js";

export default function PantryItemForm({ onAdd }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [barcode, setBarcode] = useState(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupStatus, setLookupStatus] = useState(null); // null | "loading" | "found" | "not-found" | "error"

  const resetForm = () => {
    setName("");
    setQuantity("");
    setUnit("");
    setExpiryDate("");
    setBarcode(null);
    setLookupStatus(null);
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
    setBarcode(code);
    setLookupStatus("loading");
    try {
      const result = await lookupBarcode(code);
      if (result.found) {
        setName(result.name);
        if (result.unit) setUnit(result.unit);
        setLookupStatus("found");
      } else {
        setLookupStatus("not-found");
      }
    } catch {
      setLookupStatus("error");
    }
  }, []);

  return (
    <>
      <form className="pantry-form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="scan-button"
          onClick={() => setScannerOpen(true)}
          title="Scan a barcode to fill this in"
        >
          📷 Scan
        </button>
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
          {lookupStatus === "found" && "Found it — check the details below before adding."}
          {lookupStatus === "not-found" && "No match for that barcode — fill in the details manually."}
          {lookupStatus === "error" && "Couldn't reach the product lookup — fill in the details manually."}
        </p>
      )}

      {scannerOpen && (
        <BarcodeScanner onDetect={handleDetected} onClose={() => setScannerOpen(false)} />
      )}
    </>
  );
}
