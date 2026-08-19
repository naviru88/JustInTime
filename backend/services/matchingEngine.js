/**
 * Ranks recipes against the user's current pantry, prioritizing recipes
 * that use ingredients which are close to expiring.
 *
 * Scoring logic (kept intentionally simple & explainable for MVP):
 *  - Each pantry item gets an "urgency weight" based on days until expiry.
 *  - A recipe's score = sum of urgency weights for every pantry ingredient
 *    it uses, plus a small bonus for overall pantry coverage, minus a
 *    penalty for ingredients the user doesn't have (so a recipe that needs
 *    10 extra items isn't ranked above one that needs 1).
 */

// Higher weight = more urgent to use
function urgencyWeight(daysUntilExpiry) {
  if (daysUntilExpiry === null || daysUntilExpiry === undefined) return 1; // no expiry info, neutral
  if (daysUntilExpiry < 0) return 0; // already expired, don't recommend using it
  if (daysUntilExpiry === 0) return 10; // expires today
  if (daysUntilExpiry <= 2) return 8;
  if (daysUntilExpiry <= 5) return 5;
  if (daysUntilExpiry <= 7) return 3;
  return 1; // plenty of time left
}

/**
 * @param {Array} pantryItems - array of PantryItem docs (with daysUntilExpiry virtual)
 * @param {Array} recipes - array of Recipe docs
 * @returns {Array} recipes annotated with score + matched/missing ingredients, sorted desc by score
 */
export function rankRecipes(pantryItems, recipes) {
  // Build a quick lookup: ingredient name -> urgency weight
  const pantryMap = new Map();
  for (const item of pantryItems) {
    const weight = urgencyWeight(item.daysUntilExpiry);
    // If the same ingredient appears twice, keep the more urgent weight
    const existing = pantryMap.get(item.name);
    if (!existing || weight > existing.weight) {
      pantryMap.set(item.name, { weight, daysUntilExpiry: item.daysUntilExpiry });
    }
  }

  const results = recipes.map((recipe) => {
    let score = 0;
    const matchedIngredients = [];
    const missingIngredients = [];

    for (const ing of recipe.ingredients) {
      const pantryEntry = pantryMap.get(ing.name);
      if (pantryEntry) {
        score += pantryEntry.weight;
        matchedIngredients.push({
          name: ing.name,
          daysUntilExpiry: pantryEntry.daysUntilExpiry,
        });
      } else {
        missingIngredients.push(ing.name);
      }
    }

    // Coverage bonus: reward recipes where most ingredients are already owned
    const coverageRatio =
      recipe.ingredients.length > 0
        ? matchedIngredients.length / recipe.ingredients.length
        : 0;
    score += coverageRatio * 2;

    // Small penalty per missing ingredient so "needs 8 extra things" ranks lower
    score -= missingIngredients.length * 0.5;

    return {
      recipe,
      score: Math.round(score * 100) / 100,
      matchedIngredients,
      missingIngredients,
      usesExpiringSoon: matchedIngredients.some(
        (m) => m.daysUntilExpiry !== null && m.daysUntilExpiry <= 2 && m.daysUntilExpiry >= 0
      ),
    };
  });

  return results.sort((a, b) => b.score - a.score);
}
