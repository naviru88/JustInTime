// Rough shelf-life estimates (days from today) keyed by food category
// keywords, ordered most-specific-first since an item usually matches
// several tags and we want the most food-relevant one to win.
// This is deliberately a coarse heuristic, not food-safety guidance — the
// UI labels it as an estimate the person should double-check.
const SHELF_LIFE_BY_CATEGORY = [
  { days: 2, keywords: ["seafood", "fish", "shellfish", "sushi"] },
  { days: 4, keywords: ["meat", "poultry", "beef", "pork", "sausage", "deli", "chicken"] },
  { days: 6, keywords: ["fresh-vegetables", "fresh-fruits", "vegetables", "fruits", "salad", "vegetable", "fruit", "produce"] },
  { days: 5, keywords: ["bread", "bakery", "pastries", "pastry"] },
  { days: 10, keywords: ["dairies", "dairy", "cheese", "yogurt", "yoghurt", "milk", "cream"] },
  { days: 21, keywords: ["egg"] },
  { days: 30, keywords: ["beverages", "beverage", "juice", "soft-drink", "soda"] },
  { days: 90, keywords: ["snack", "chip", "cracker", "biscuit"] },
  { days: 180, keywords: ["frozen"] },
  { days: 180, keywords: ["sauce", "condiment", "oil", "dressing"] },
  { days: 270, keywords: ["pasta", "rice", "grain", "cereal", "flour"] },
  { days: 365, keywords: ["canned", "tinned", "preserve", "spice", "herb"] },
];
const DEFAULT_SHELF_LIFE_DAYS = 14;

// Accepts one or more free-text strings (category tags, a food name, etc.)
// and returns the best-matching shelf-life estimate in days.
export const estimateShelfLifeDays = (...textParts) => {
  const haystack = textParts
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const { keywords, days } of SHELF_LIFE_BY_CATEGORY) {
    if (keywords.some((kw) => haystack.includes(kw))) return days;
  }
  return DEFAULT_SHELF_LIFE_DAYS;
};

export const toISODate = (date) => date.toISOString().slice(0, 10);

export const expiryDateFromToday = (days) => toISODate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
