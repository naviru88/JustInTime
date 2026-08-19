export default function RecipeCard({ result }) {
  const { recipe, matchedIngredients, missingIngredients, usesExpiringSoon } = result;

  const expiringCount = matchedIngredients.filter(
    (m) => m.daysUntilExpiry !== null && m.daysUntilExpiry <= 2 && m.daysUntilExpiry >= 0
  ).length;

  return (
    <div className="recipe-card">
      <h3>{recipe.title}</h3>

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
