export default function RecipeCard({ result, selected, onToggleSelect }) {
  const { recipe, matchedIngredients, missingIngredients, usesExpiringSoon } = result;

  const expiringCount = matchedIngredients.filter(
    (m) => m.daysUntilExpiry !== null && m.daysUntilExpiry <= 2 && m.daysUntilExpiry >= 0
  ).length;

  return (
    <div className={`recipe-card ${selected ? "selected" : ""}`}>
      <div className="recipe-card-header">
        <h3>{recipe.title}</h3>
        <label className="select-checkbox">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(recipe._id)}
          />
          <span>Plan this</span>
        </label>
      </div>

      {usesExpiringSoon && (
        <div className="match-reason">
          ⏳ Uses {expiringCount} item{expiringCount !== 1 ? "s" : ""} expiring soon
        </div>
      )}

      <div className="ingredient-tags">
        {matchedIngredients.map((m) => (
          <span className="tag have" key={m.name}>
            ✓ {m.name}
          </span>
        ))}
        {missingIngredients.map((name) => (
          <span className="tag" key={name}>
            + {name}
          </span>
        ))}
      </div>
    </div>
  );
}
