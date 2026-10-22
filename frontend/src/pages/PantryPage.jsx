import { useEffect, useState } from "react";
import PantryItemForm from "../components/pantry/PantryItemForm.jsx";
import PantryList from "../components/pantry/PantryList.jsx";
import NotificationSettings from "../components/pantry/NotificationSettings.jsx";
import PhotoRecognitionOverlay from "../components/pantry/PhotoRecognitionOverlay.jsx";
import {
  fetchPantryItems,
  addPantryItem,
  addPantryItems,
  updatePantryItem,
  deletePantryItem,
  lookupBarcode,
} from "../services/api.js";
import { syncReminders } from "../services/notifications.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function PantryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingScanItems, setPendingScanItems] = useState(null);
  const [isAddingBatch, setIsAddingBatch] = useState(false);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await fetchPantryItems();
      setItems(data);
      setError(null);
    } catch {
      setError("Couldn't load pantry. Is the backend running on port 5000?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (user?.notifications?.enabled) {
      syncReminders(items, user.notifications.daysBefore ?? 2);
    }
  }, [items, user?.notifications?.enabled, user?.notifications?.daysBefore]);

  const handleAdd = async (item) => {
    const created = await addPantryItem(item);
    setItems((prev) => [...prev, created]);
  };

  const handleAddMany = async (newItems) => {
    setIsAddingBatch(true);
    try {
      const result = await addPantryItems(newItems);
      if (result.failed && result.failed.length > 0) {
        setError(`${result.failed.length} item(s) could not be saved. Check the details and try again.`);
      }
      await loadItems();
      setPendingScanItems(null);
    } finally {
      setIsAddingBatch(false);
    }
  };

  const handleBarcodeBatch = async (codes) => {
    try {
      const results = await Promise.all(codes.map((code) => lookupBarcode(code)));
      const validItems = results
        .filter((r) => r.found)
        .map((r) => ({
          name: r.name,
          quantity: r.quantity ?? 1,
          unit: r.unit || "",
          expiryDate: r.expiryDate || null,
          expiryDateEstimated: true,
          category: r.category || "pantry",
          confidence: 1.0,
          source: "barcode",
        }));

      if (validItems.length === 0) {
        setError("None of those barcodes matched a product. Try adding them manually.");
        return;
      }
      setPendingScanItems(validItems);
    } catch {
      setError("Barcode lookup failed. Please try again.");
    }
  };

  const handlePhotoScan = async (recognizedItems) => {
    if (!recognizedItems || recognizedItems.length === 0) {
      setError("No food items were recognized in those photos.");
      return;
    }
    setPendingScanItems(recognizedItems);
  };

  const handleUpdate = async (id, updates) => {
    const updated = await updatePantryItem(id, updates);
    setItems((prev) => prev.map((item) => (item._id === id ? updated : item)));
    return updated;
  };

  const handleDelete = async (id) => {
    await deletePantryItem(id);
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  return (
    <div>
      <h1>Your pantry</h1>
      <p className="page-subtitle">
        Add what you've got. We'll flag what's about to expire and suggest what to cook first.
      </p>

      <NotificationSettings />

      <PantryItemForm
        onAdd={handleAdd}
        onAddMany={handleAddMany}
        onBarcodeBatch={handleBarcodeBatch}
        onPhotoScan={handlePhotoScan}
      />

      {loading && <p>Loading pantry...</p>}
      {error && <p style={{ color: "#c1440e" }}>{error}</p>}
      {!loading && !error && (
        <PantryList items={items} onDelete={handleDelete} onUpdate={handleUpdate} />
      )}

      {pendingScanItems && (
        <PhotoRecognitionOverlay
          items={pendingScanItems}
          onAddSelected={handleAddMany}
          onClose={() => setPendingScanItems(null)}
          adding={isAddingBatch}
        />
      )}
    </div>
  );
}
