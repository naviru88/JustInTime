import { useState } from "react";

export default function RecipeCard({
  result,
  selected,
  onToggleSelect,
  onDelete,
  deleting,
}) {
  const { recipe, matchedIngredients, missingIngredients, usesExpiringSoon } = result;
  const [stepsOpen, setStepsOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const expiringCount = matchedIngredients.filter(
    (m) => m.daysUntilExpiry !== null && m.daysUntilExpiry <= 2 && m.daysUntilExpiry >= 0
  ).length;

  return (
    <div className={`recipe-card ${selected ? "selected" : ""}`}>
      <div className="recipe-card-header">
        <h3>
          {recipe.title}
          {recipe.source === "generated" && <span className="ai-badge">✨ AI generated</span>}
        </h3>
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

      {recipe.steps?.length > 0 && (
        <div className="recipe-steps-wrap">
          <button
            type="button"
            className="recipe-steps-toggle"
            onClick={() => setStepsOpen((o) => !o)}
          >
            {stepsOpen ? "Hide steps ▲" : "View steps ▼"}
          </button>
          {stepsOpen && (
            <ol className="recipe-steps">
              {recipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="recipe-card-footer">
        {confirmingDelete ? (
          <div className="recipe-delete-confirm">
            <span>Remove this recipe?</span>
            <button
              type="button"
              className="recipe-delete-confirm-yes"
              onClick={() => onDelete(recipe._id)}
              disabled={deleting}
            >
              {deleting ? "Removing..." : "Yes, remove"}
            </button>
            <button
              type="button"
              className="recipe-delete-confirm-no"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="recipe-delete-btn"
            onClick={() => setConfirmingDelete(true)}
          >
            🗑️ Remove recipe
          </button>
        )}
      </div>
    </div>
  );
}
