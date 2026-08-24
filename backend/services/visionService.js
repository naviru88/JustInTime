// Identifies food items in fridge/pantry photos via OpenRouter's
// OpenAI-compatible vision endpoint — the same account/key the app already
// uses for recipe generation (see openRouterService.js), so this doesn't
// require signing up for a second provider just to make photo recognition work.
//
// "openrouter/free" (used for recipe text) doesn't reliably route to a
// vision-capable model, so this uses its own model env var. Free vision
// model IDs on OpenRouter rotate over time — override OPENROUTER_VISION_MODEL
// in .env if the default below gets pulled; check
// https://openrouter.ai/models?modality=text%2Bimage-%3Etext&max_price=0
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_VISION_MODEL = "meta-llama/llama-3.2-11b-vision-instruct:free";

const SYSTEM_PROMPT = `You are a food inventory vision model. Identify every individual food item visible in photos of a fridge, freezer, or pantry shelf.

Respond with ONLY a JSON array (no prose, no markdown fences) of objects shaped like:
[{"name": "eggs", "quantity": 6, "unit": "ct", "category": "egg"}]

Rules:
- Return one entry for each distinct, visually identifiable item. If a photo shows one apple, return one entry with quantity 1. If it shows three separate apples, return one entry with quantity 3. If it shows a carton of eggs, return one entry for that carton and use the egg count as quantity.
- Never return one generic entry for an entire photo when multiple foods are visible.
- If the same item appears in more than one photo, list it once.
- "quantity" is your best visual estimate as a plain number (count items, or estimate weight/volume if that's clearer — pick whichever is more natural for that food). Default to 1 if you can't tell.
- "unit" is a short unit like "ct", "g", "kg", "ml", "l", or "" if quantity is just a count of whole items.
- "category" is a single lowercase word describing the food type (e.g. "dairy", "vegetable", "meat", "fruit", "bakery", "canned", "frozen", "beverage", "condiment", "grain") — used to estimate shelf life, so pick the closest match.
- Ignore non-food objects (containers, shelves, labels facing away, etc.) unless you can identify the food inside/under them.
- If you genuinely can't identify any food items, return [].`;

const MEDIA_TYPE_BY_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// photos: [{ data: Buffer, mimeType: string }]
// Returns: [{ name, quantity, unit, category }]
export const identifyPantryItemsFromPhotos = async (photos) => {
  if (!photos || photos.length === 0) return [];

  const imageBlocks = photos
    .filter((p) => MEDIA_TYPE_BY_MIME.has(p.mimeType))
    .map((p) => ({
      type: "image_url",
      image_url: { url: `data:${p.mimeType};base64,${p.data.toString("base64")}` },
    }));

  if (imageBlocks.length === 0) return [];

  if (!process.env.OPENROUTER_API_KEY) {
    const err = new Error("OPENROUTER_API_KEY isn't configured on this server.");
    err.code = "OPENROUTER_NOT_CONFIGURED";
    throw err;
  }

  const model = process.env.OPENROUTER_VISION_MODEL || DEFAULT_VISION_MODEL;

  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  if (process.env.OPENROUTER_SITE_NAME) headers["X-Title"] = process.env.OPENROUTER_SITE_NAME;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let payload;
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              ...imageBlocks,
              {
                type: "text",
                text: "Identify the food items visible across these photos, following the JSON format from your instructions.",
              },
            ],
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      const err = new Error(`OpenRouter vision request failed (${response.status}): ${errBody.slice(0, 300)}`);
      err.code = "OPENROUTER_REQUEST_FAILED";
      throw err;
    }

    payload = await response.json();
  } finally {
    clearTimeout(timeout);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) return [];

  // Some vision models add a short sentence despite the JSON-only request.
  // Strip fences and isolate the outer array so a useful response is not
  // discarded just because of that wrapper text.
  const cleaned = content.replace(/```json|```/gi, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start < 0 || end <= start) return [];
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item) => item && typeof item.name === "string" && item.name.trim())
    .map((item) => ({
      name: item.name.trim(),
      quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
      unit: typeof item.unit === "string" ? item.unit.trim() : "",
      category: typeof item.category === "string" ? item.category.trim().toLowerCase() : "",
    }));
};
