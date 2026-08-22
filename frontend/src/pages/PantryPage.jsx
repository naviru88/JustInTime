import { useEffect, useState } from "react";
import PantryItemForm from "../components/pantry/PantryItemForm.jsx";
import PantryList from "../components/pantry/PantryList.jsx";
import {
  fetchPantryItems,
  addPantryItem,
  deletePantryItem,
  uploadPantryPhoto,
} from "../services/api.js";

export default function PantryPage() {
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

  const handleAdd = async (item, photoFile) => {
    const created = await addPantryItem(item);
    setItems((prev) => [...prev, created]);

    if (photoFile) {
      try {
        const withPhoto = await uploadPantryPhoto(created._id, photoFile);
        setItems((prev) => prev.map((i) => (i._id === withPhoto._id ? withPhoto : i)));
      } catch {
        // The item is already saved without a photo — surface this softly
        // rather than losing the whole add because the image upload failed.
        setError("Item added, but the photo upload failed. You can retry it from the list.");
      }
    }
  };

  const handleDelete = async (id) => {
    await deletePantryItem(id);
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  const handlePhotoUpload = async (id, file) => {
    try {
      const updated = await uploadPantryPhoto(id, file);
      setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
    } catch {
      setError("Couldn't upload that photo. Try again.");
    }
  };

  return (
    <div>
      <h1>Your pantry</h1>
      <p className="page-subtitle">
        Add what you've got. We'll flag what's about to expire and suggest what to cook first.
      </p>

      <PantryItemForm onAdd={handleAdd} />

      {loading && <p>Loading pantry...</p>}
      {error && <p style={{ color: "#c1440e" }}>{error}</p>}
      {!loading && !error && <PantryList items={items} onDelete={handleDelete} onPhotoUpload={handlePhotoUpload} />}
    </div>
  );
}
