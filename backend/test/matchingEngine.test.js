import assert from "node:assert/strict";
import { test } from "node:test";
import { rankRecipes } from "../services/matchingEngine.js";

const recipes = [
  { _id: "milk-recipe", ingredients: [{ name: "milk" }] },
  { _id: "rice-recipe", ingredients: [{ name: "rice" }] },
];

test("verified expiry dates outrank rough estimates without calling estimates expired", () => {
  const estimated = rankRecipes(
    [{ name: "milk", daysUntilExpiry: 0, expiryDateEstimated: true }],
    recipes
  );
  const verified = rankRecipes(
    [{ name: "milk", daysUntilExpiry: 0, expiryDateEstimated: false }],
    recipes
  );

  assert.ok(verified[0].score > estimated[0].score);
  assert.equal(verified[0].usesExpiringSoon, true);
  assert.equal(estimated[0].usesExpiringSoon, false);
});

test("a passed shelf-life estimate remains a check reminder, not an expired flag", () => {
  const result = rankRecipes(
    [{ name: "milk", daysUntilExpiry: -3, source: "barcode" }],
    recipes
  );

  assert.equal(result[0].score > 0, true);
  assert.equal(result[0].usesExpiringSoon, false);
});
