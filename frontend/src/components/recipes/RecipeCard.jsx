import { useRef, useState } from "react";
import { resolvePhotoUrl, uploadRecipePhoto } from "../../services/api.js";

export default function RecipeCard({ result, selected, onToggleSelect, onPhotoUpdated }) {
  const { recipe, matchedIngredients, missingIngredients, usesExpiringSoon } = result;
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const expiringCount = matchedIngredients.filter(
    (m) => m.daysUntilExpiry !== null && m.daysUntilExpiry <= 2 && m.daysUntilExpiry >= 0
  ).length;

  const photoUrl = resolvePhotoUrl(recipe.photoUrl);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const updated = await uploadRecipePhoto(recipe._id, file);
      onPhotoUpdated(updated);
    } catch {
      // Silently leave the previous photo in place; the recipe grid isn't
      // the place for a persistent error banner over one thumbnail.
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`recipe-card ${selected ? "selected" : ""}`}>
      <label className="recipe-photo-wrap" title={photoUrl ? "Change photo" : "Add a photo"}>
        {photoUrl ? (
          <img src={photoUrl} alt={recipe.title} className="recipe-photo" />
        ) : (
          <span className="recipe-photo-placeholder">🍽️ Add a photo</span>
        )}
        {uploading && <span className="recipe-photo-uploading">Uploading...</span>}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={handlePhotoChange}
        />
      </label>

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
