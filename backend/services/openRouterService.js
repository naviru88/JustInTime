// Generates recipes from a person's actual pantry via OpenRouter's AI models.
// Defaults to the "openrouter/free" router, which auto-selects from whatever free models are currently available

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const buildSystemPrompt = () => `You are a recipe writer. Given a list of pantry ingredients (with how many days until each expires, where known) and optional dietary restrictions, invent practical recipes that primarily use those ingredients — prioritizing the ones expiring soonest.

Respond with ONLY a JSON array (no prose, no markdown fences) of recipe objects shaped like:
[
  {
    "title": "Recipe name",
    "ingredients": [{"name": "ingredient", "quantity": "2 cups"}],
    "steps": ["Step one.", "Step two."],
    "tags": ["vegetarian"]
  }
]

Rules:
- Generate exactly the requested number of recipes, each meaningfully different from the others.
- For each ingredient's "name", reuse the exact pantry ingredient name given to you whenever that ingredient is one from the pantry list (so it matches correctly) — only introduce a new ingredient name for things not in the pantry (basic staples like salt, oil, water are fine to assume).
- A recipe can also call for a few common ingredients not in the pantry (e.g. salt, oil, garlic) — that's expected and fine, just don't make the recipe mostly unavailable ingredients.
- "steps" should be clear, numbered-in-order cooking instructions, at least 3 steps.
- "tags" may include any of: "vegetarian", "vegan", "gluten-free" — only include ones that genuinely apply, and only if dietary restrictions were requested, still tag accurately.
- If dietary restrictions are given, every recipe MUST satisfy all of them.
- Output nothing except the JSON array.`;

const formatPantryForPrompt = (pantryItems) =>
  pantryItems
    .map((item) => {
      const days = item.daysUntilExpiry;
      const urgency =
        days === null || days === undefined
          ? ""
          : days < 0
            ? " (expired)"
            : ` (expires in ${days} day${days === 1 ? "" : "s"})`;
      const qty = item.quantity ? `${item.quantity}${item.unit ? " " + item.unit : ""} ` : "";
      return `- ${qty}${item.name}${urgency}`;
    })
    .join("\n");

// pantryItems: PantryItem docs (with daysUntilExpiry virtual)
// options: { count?: number, tags?: string[] }
// Returns: [{ title, ingredients: [{name, quantity}], steps: [string], tags: [string] }]
export const generateRecipesFromPantry = async (pantryItems, options = {}) => {
  if (!process.env.OPENROUTER_API_KEY) {
    const err = new Error("OPENROUTER_API_KEY isn't configured on this server.");
    err.code = "OPENROUTER_NOT_CONFIGURED";
    throw err;
  }

  const count = Math.min(Math.max(options.count ?? 4, 1), 8);
  const tags = options.tags || [];

  const userPrompt = [
    `Pantry:\n${formatPantryForPrompt(pantryItems)}`,
    tags.length > 0 ? `Dietary restrictions (all recipes must satisfy every one): ${tags.join(", ")}` : "",
    `Generate ${count} recipe${count === 1 ? "" : "s"}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const model = process.env.OPENROUTER_MODEL || "openrouter/free";

  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };
  // Optional but recommended by OpenRouter for attributing traffic — harmless to omit.
  if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  if (process.env.OPENROUTER_SITE_NAME) headers["X-Title"] = process.env.OPENROUTER_SITE_NAME;

  const controller = new AbortController();
  // Stay comfortably under the 60s maxDuration set in vercel.json — if we
  // hit our own limit first, we throw a clear OPENROUTER_TIMEOUT error
  // instead of letting Vercel kill the function with an opaque 504.
  const timeout = setTimeout(() => controller.abort(), 50000);

  let payload;
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      const err = new Error(`OpenRouter request failed (${response.status}): ${errBody.slice(0, 300)}`);
      err.code = "OPENROUTER_REQUEST_FAILED";
      throw err;
    }

    payload = await response.json();
  } finally {
    clearTimeout(timeout);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    const err = new Error("OpenRouter returned no content.");
    err.code = "OPENROUTER_EMPTY_RESPONSE";
    throw err;
  }

  const cleaned = content.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const err = new Error("Couldn't parse recipes from the model's response.");
    err.code = "OPENROUTER_BAD_JSON";
    throw err;
  }

  if (!Array.isArray(parsed)) {
    const err = new Error("Model response wasn't a JSON array of recipes.");
    err.code = "OPENROUTER_BAD_JSON";
    throw err;
  }

  return parsed
    .filter(
      (r) =>
        r &&
        typeof r.title === "string" &&
        r.title.trim() &&
        Array.isArray(r.ingredients) &&
        r.ingredients.length > 0 &&
        Array.isArray(r.steps) &&
        r.steps.length > 0
    )
    .map((r) => ({
      title: r.title.trim(),
      ingredients: r.ingredients
        .filter((ing) => ing && typeof ing.name === "string" && ing.name.trim())
        .map((ing) => ({
          name: ing.name.trim(),
          quantity: typeof ing.quantity === "string" ? ing.quantity.trim() : "",
        })),
      steps: r.steps.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()),
      tags: Array.isArray(r.tags)
        ? r.tags.filter((t) => typeof t === "string").map((t) => t.trim().toLowerCase())
        : [],
    }))
    .filter((r) => r.ingredients.length > 0 && r.steps.length > 0);
};