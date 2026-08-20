/**
 * Given a set of recipes and the current pantry, produces a shopping list
 * of ingredients the user doesn't already have — aggregated across all
 * selected recipes (e.g. if 3 recipes each need onions, that's one line
 * item, not three), and grouped by grocery category for easier shopping.
 */

// Simple static keyword -> category map. Not exhaustive, but covers common
// ingredients. Anything unmatched falls into "Other".
const CATEGORY_KEYWORDS = {
  Produce: [
    "tomato", "onion", "garlic", "potato", "carrot", "spring onion",
    "banana", "lemon", "lime", "spinach", "lettuce", "pepper", "cucumber",
    "apple", "avocado", "ginger", "chili", "coriander", "cilantro",
  ],
  Dairy: ["milk", "butter", "cheese", "parmesan", "yogurt", "cream", "egg"],
  Meat: ["chicken", "beef", "pork", "fish", "shrimp", "bacon", "sausage"],
  Pantry: [
    "rice", "pasta", "oats", "flour", "sugar", "salt", "oil",
    "vinegar", "spice", "sauce", "stock", "broth",
  ],
};

function categorize(ingredientName) {
  const name = ingredientName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => name.includes(k))) return category;
  }
  return "Other";
}

/**
 * @param {Array} recipes - array of Recipe docs (must include .ingredients)
 * @param {Array} pantryItems - array of PantryItem docs
 * @returns {Object} { groceryList: [{ category, items: [{ name, neededFor, quantities }] }], recipesUsed }
 */
export function generateGroceryList(recipes, pantryItems) {
  const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase().trim()));

  // Aggregate missing ingredients across all selected recipes
  const aggregate = new Map(); // name -> { quantities: [], neededFor: Set(recipeTitles) }

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const name = ing.name.toLowerCase().trim();
      if (pantryNames.has(name)) continue; // already have it, skip

      if (!aggregate.has(name)) {
        aggregate.set(name, { quantities: [], neededFor: new Set() });
      }
      const entry = aggregate.get(name);
      if (ing.quantity) entry.quantities.push(ing.quantity);
      entry.neededFor.add(recipe.title);
    }
  }

  // Group into categories
  const grouped = {};
  for (const [name, data] of aggregate.entries()) {
    const category = categorize(name);
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({
      name,
      quantities: data.quantities, // e.g. ["2", "1 clove"] — left as raw strings, user reconciles
      neededFor: Array.from(data.neededFor),
    });
  }

  // Sort categories in a sensible shopping order, items alphabetically within each
  const categoryOrder = ["Produce", "Meat", "Dairy", "Pantry", "Other"];
  const groceryList = categoryOrder
    .filter((cat) => grouped[cat]?.length)
    .map((category) => ({
      category,
      items: grouped[category].sort((a, b) => a.name.localeCompare(b.name)),
    }));

  return {
    groceryList,
    recipesUsed: recipes.map((r) => r.title),
  };
}
