import { useEffect, useState } from "react";
import RecipeCard from "../components/recipes/RecipeCard.jsx";
import { fetchMatchedRecipes } from "../services/api.js";

export default function RecipesPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMatchedRecipes()
      .then((data) => {
        setResults(data);
        setError(null);
      })
      .catch(() => setError("Couldn't load recipe matches. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Suggested recipes</h1>
      <p className="page-subtitle">
        Ranked by what uses your soonest-to-expire ingredients first.
      </p>

      {loading && <p>Finding matches...</p>}
      {error && <p style={{ color: "#c1440e" }}>{error}</p>}

      {!loading && !error && results.length === 0 && (
        <div className="empty-state">
          No recipes yet. Run <code>npm run seed</code> in the backend folder to load starter
          recipes.
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="recipe-grid">
          {results.map((r) => (
            <RecipeCard result={r} key={r.recipe._id} />
          ))}
        </div>
      )}
    </div>
  );
}
