import { useEffect, useState } from "react";
import PantryItemForm from "../components/pantry/PantryItemForm.jsx";
import PantryList from "../components/pantry/PantryList.jsx";
import NotificationSettings from "../components/pantry/NotificationSettings.jsx";
import { fetchPantryItems, addPantryItem, deletePantryItem } from "../services/api.js";
import { syncReminders } from "../services/notifications.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function PantryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await fetchPantryItems();
      setItems(data);
      setError(null);
    } catch (err) {
      setError("Couldn't load pantry. Is the backend running on port 5000?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Re-derive the reminder schedule whenever the pantry or the person's
  // notification settings change. Harmless no-op if notifications are off
  // or permission hasn't been granted (syncReminders checks both).
  useEffect(() => {
    if (user?.notifications?.enabled) {
      syncReminders(items, user.notifications.daysBefore ?? 2);
    }
  }, [items, user?.notifications?.enabled, user?.notifications?.daysBefore]);

  // Barcode/photo scans (see PantryItemForm) already resolve to plain text
  // fields before calling this — no image is ever uploaded or saved here.
  const handleAdd = async (item) => {
    const created = await addPantryItem(item);
    setItems((prev) => [...prev, created]);
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

      <PantryItemForm onAdd={handleAdd} />

      {loading && <p>Loading pantry...</p>}
      {error && <p style={{ color: "#c1440e" }}>{error}</p>}
      {!loading && !error && <PantryList items={items} onDelete={handleDelete} />}
    </div>
  );
}
