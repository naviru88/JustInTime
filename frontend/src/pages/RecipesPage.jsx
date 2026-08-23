import { useEffect, useState } from "react";
import RecipeCard from "../components/recipes/RecipeCard.jsx";
import GroceryList from "../components/recipes/GroceryList.jsx";
import {
  fetchMatchedRecipes,
  generateGroceryList,
  generateRecipes,
  deleteRecipe,
} from "../services/api.js";

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

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [generateStatus, setGenerateStatus] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const loadMatches = () =>
    fetchMatchedRecipes(activeTags)
      .then((data) => {
        setResults(data);
        setError(null);
      })
      .catch(() => setError("Couldn't load recipe matches. Is the backend running?"))
      .finally(() => setLoading(false));

  useEffect(() => {
    setLoading(true);
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleDeleteRecipe = async (id) => {
    setDeleteError(null);
    setDeletingId(id);
    try {
      await deleteRecipe(id);
      setResults((prev) => prev.filter((r) => r.recipe._id !== id));
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setGroceryData(null); // a deleted recipe may have been part of the last list
    } catch {
      setDeleteError("Couldn't remove that recipe. Try again.");
    } finally {
      setDeletingId(null);
    }
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

  const handleGenerateRecipes = async () => {
    setGenerating(true);
    setGenerateError(null);
    setGenerateStatus(null);
    try {
      const created = await generateRecipes(activeTags);
      setGenerateStatus(
        `Added ${created.length} new recipe${created.length === 1 ? "" : "s"} from your pantry.`
      );
      setLoading(true);
      await loadMatches();
    } catch (err) {
      setGenerateError(
        err.response?.data?.message || "Couldn't generate recipes right now. Try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h1>Suggested recipes</h1>
      <p className="page-subtitle">
        Ranked by what uses your soonest-to-expire ingredients first. Select a few to build a
        grocery list for what you're missing.
      </p>

      <div className="generate-recipes-bar">
        <button className="btn" onClick={handleGenerateRecipes} disabled={generating}>
          {generating ? "Generating..." : "✨ Generate recipes from my pantry"}
        </button>
        {generateStatus && <span className="generate-status">{generateStatus}</span>}
      </div>
      {generateError && <p style={{ color: "#c1440e" }}>{generateError}</p>}
      {deleteError && <p style={{ color: "#c1440e" }}>{deleteError}</p>}

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
          No recipes yet. Click "Generate recipes from my pantry" above, or run{" "}
          <code>npm run seed</code> in the backend folder to load starter recipes.
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
                onDelete={handleDeleteRecipe}
                deleting={deletingId === r.recipe._id}
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
