import { useEffect, useState } from "react";
import RecipeCard from "../components/recipes/RecipeCard.jsx";
import GroceryList from "../components/recipes/GroceryList.jsx";
import { fetchMatchedRecipes, generateGroceryList } from "../services/api.js";

const DIETARY_TAGS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten-free", label: "Gluten-free" },
];

export default function RecipesPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTags, setActiveTags] = useState([]);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [groceryData, setGroceryData] = useState(null);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [groceryError, setGroceryError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchMatchedRecipes(activeTags)
      .then((data) => {
        setResults(data);
        setError(null);
      })
      .catch(() => setError("Couldn't load recipe matches. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [activeTags]);

  const toggleTag = (tag) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setSelectedIds(new Set());
    setGroceryData(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setGroceryData(null); // stale selection invalidates the previous list
  };

  const handlePhotoUpdated = (updatedRecipe) => {
    setResults((prev) =>
      prev.map((r) => (r.recipe._id === updatedRecipe._id ? { ...r, recipe: updatedRecipe } : r))
    );
  };

  const handleGenerateGroceryList = async () => {
    if (selectedIds.size === 0) return;
    try {
      setGroceryLoading(true);
      setGroceryError(null);
      const data = await generateGroceryList(Array.from(selectedIds));
      setGroceryData(data);
    } catch (err) {
      setGroceryError("Couldn't generate the grocery list. Try again.");
    } finally {
      setGroceryLoading(false);
    }
  };

  return (
    <div>
      <h1>Suggested recipes</h1>
      <p className="page-subtitle">
        Ranked by what uses your soonest-to-expire ingredients first. Select a few to build a
        grocery list for what you're missing.
      </p>

      <div className="dietary-filters">
        {DIETARY_TAGS.map((t) => (
          <label
            key={t.value}
            className={`filter-chip ${activeTags.includes(t.value) ? "active" : ""}`}
          >
            <input
              type="checkbox"
              checked={activeTags.includes(t.value)}
              onChange={() => toggleTag(t.value)}
            />
            {t.label}
          </label>
        ))}
      </div>

      {loading && <p>Finding matches...</p>}
      {error && <p style={{ color: "#c1440e" }}>{error}</p>}

      {!loading && !error && results.length === 0 && activeTags.length > 0 && (
        <div className="empty-state">
          No recipes match the selected dietary filters. Try removing one.
        </div>
      )}

      {!loading && !error && results.length === 0 && activeTags.length === 0 && (
        <div className="empty-state">
          No recipes yet. Run <code>npm run seed</code> in the backend folder to load starter
          recipes.
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <>
          <div className="recipe-grid">
            {results.map((r) => (
              <RecipeCard
                result={r}
                key={r.recipe._id}
                selected={selectedIds.has(r.recipe._id)}
                onToggleSelect={toggleSelect}
                onPhotoUpdated={handlePhotoUpdated}
              />
            ))}
          </div>

          <div className="grocery-action-bar">
            <button
              className="btn"
              disabled={selectedIds.size === 0 || groceryLoading}
              onClick={handleGenerateGroceryList}
            >
              {groceryLoading
                ? "Building list..."
                : `Generate grocery list (${selectedIds.size} selected)`}
            </button>
          </div>

          {groceryError && <p style={{ color: "#c1440e" }}>{groceryError}</p>}

          {groceryData && (
            <div className="grocery-section">
              <h2>Grocery list</h2>
              <GroceryList data={groceryData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
