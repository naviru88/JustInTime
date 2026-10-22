const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_VISION_MODEL = "meta-llama/llama-3.2-11b-vision-instruct:free";

const SYSTEM_PROMPT = `You are a food inventory vision model. Identify every individual food item visible in photos of a fridge, freezer, or pantry shelf.

Respond with ONLY a JSON array (no prose, no markdown fences) of objects shaped like:
 [{"name": "eggs", "quantity": 6, "unit": "ct", "category": "egg", "confidence": 0.94, "expiryDate": null}]

Rules:
- Return one entry for each distinct, visually identifiable item. If a photo shows one apple, return one entry with quantity 1. If it shows three separate apples, return one entry with quantity 3. If it shows a carton of eggs, return one entry for that carton and use the egg count as quantity.
- Never return one generic entry for an entire photo when multiple foods are visible.
- If the same item appears in more than one photo, list it once.
- "quantity" is your best visual estimate as a plain number (count items, or estimate weight/volume if that's clearer — pick whichever is more natural for that food). Default to 1 if you can't tell.
- "unit" is a short unit like "ct", "g", "kg", "ml", "l", or "" if quantity is just a count of whole items.
- "category" is a single lowercase word describing the food type (e.g. "dairy", "vegetable", "meat", "fruit", "bakery", "canned", "frozen", "beverage", "condiment", "grain") — used to estimate shelf life, so pick the closest match.
- "confidence" is your confidence that the item identification is correct, from 0 to 1.
- "expiryDate" must be a YYYY-MM-DD date only when a printed use-by, best-before, or expiry date is clearly legible and visibly belongs to that item. Otherwise return null. Never infer a printed date from the food type, packaging, or current date.
- Ignore non-food objects (containers, shelves, labels facing away, etc.) unless you can identify the food inside/under them.
- If you genuinely can't identify any food items, return [].`;

const MEDIA_TYPE_BY_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const inferCategory = (name) => {
  const n = name.toLowerCase();
  if (/chicken|beef|pork|fish|meat|steak/.test(n)) return "meat";
  if (/milk|cheese|yogurt|cream|butter/.test(n)) return "dairy";
  if (/apple|banana|lettuce|tomato|onion|vegetable|fruit|produce/.test(n)) return "produce";
  if (/bread|bagel|cake|pastry|bakery/.test(n)) return "bakery";
  if (/frozen|ice cream/.test(n)) return "frozen";
  return "pantry";
};

const isValidISODate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const extractJSON = (text) => {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

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
      const err = new Error(`OpenRouter vision request failed (${response.status}).`);
      err.code = "OPENROUTER_REQUEST_FAILED";
      throw err;
    }

    payload = await response.json();
  } catch (err) {
    if (err.name === "AbortError") {
      err.code = "OPENROUTER_TIMEOUT";
    } else if (!err.code) {
      err.code = "OPENROUTER_REQUEST_FAILED";
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const content = payload?.choices?.[0]?.message?.content;
  const text = Array.isArray(content)
    ? content.map((block) => (typeof block === "string" ? block : block?.text || "")).join("\n")
    : content;

  if (typeof text !== "string" || !text.trim()) {
    const err = new Error("The vision model returned no readable result.");
    err.code = "OPENROUTER_INVALID_RESPONSE";
    throw err;
  }

  let parsed = extractJSON(text);
  if (!Array.isArray(parsed) && Array.isArray(parsed?.items)) parsed = parsed.items;

  if (!Array.isArray(parsed)) {
    const err = new Error("The vision model returned an unexpected result shape.");
    err.code = "OPENROUTER_INVALID_RESPONSE";
    throw err;
  }

  return parsed
    .filter((item) => item && typeof item.name === "string" && item.name.trim())
    .map((item) => {
      const name = item.name.trim();
      const category =
        typeof item.category === "string" && item.category.trim()
          ? item.category.trim().toLowerCase()
          : inferCategory(name);

      return {
        name,
        quantity:
          typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
            ? item.quantity
            : 1,
        unit: typeof item.unit === "string" ? item.unit.trim() : "",
        category,
        confidence:
          typeof item.confidence === "number" && item.confidence >= 0 && item.confidence <= 1
            ? item.confidence
            : null,
        expiryDate: isValidISODate(item.expiryDate) ? item.expiryDate : null,
      };
    });
};
