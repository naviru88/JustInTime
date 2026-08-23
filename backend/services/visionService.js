import Anthropic from "@anthropic-ai/sdk";

let client = null;
const getClient = () => {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY isn't set — photo recognition needs it configured.");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
};

const SYSTEM_PROMPT = `You identify individual food items visible in photos of a fridge, freezer, or pantry shelf.

Respond with ONLY a JSON array (no prose, no markdown fences) of objects shaped like:
[{"name": "eggs", "quantity": 6, "unit": "ct", "category": "egg"}]

Rules:
- One entry per distinct food item you can actually see, not per photo.
- If the same item appears in more than one photo, list it once.
- "quantity" is your best visual estimate as a plain number (count items, or estimate weight/volume if that's clearer — pick whichever is more natural for that food). Default to 1 if you can't tell.
- "unit" is a short unit like "ct", "g", "kg", "ml", "l", or "" if quantity is just a count of whole items.
- "category" is a single lowercase word describing the food type (e.g. "dairy", "vegetable", "meat", "fruit", "bakery", "canned", "frozen", "beverage", "condiment", "grain") — used to estimate shelf life, so pick the closest match.
- Ignore non-food objects (containers, shelves, labels facing away, etc.) unless you can identify the food inside/under them.
- If you genuinely can't identify any food items, return [].`;

const MEDIA_TYPE_BY_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// photos: [{ data: Buffer, mimeType: string }]
// Returns: [{ name, quantity, unit, category }]
export const identifyPantryItemsFromPhotos = async (photos) => {
  if (!photos || photos.length === 0) return [];

  const imageBlocks = photos
    .filter((p) => MEDIA_TYPE_BY_MIME.has(p.mimeType))
    .map((p) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: p.mimeType,
        data: p.data.toString("base64"),
      },
    }));

  if (imageBlocks.length === 0) return [];

  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
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
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock) return [];

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
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
