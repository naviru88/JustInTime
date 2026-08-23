// Finds a freely-reusable stock photo for a recipe via Openverse
// (openverse.org) — a search engine over openly-licensed images. No API key
// required, which keeps this consistent with the rest of the app's "free
// tier" services (Open Food Facts for barcode lookups, OpenRouter's free
// router for recipe generation).
const OPENVERSE_SEARCH_ENDPOINT = "https://api.openverse.org/v1/images/";

// Deliberately NOT using the search result's own `url`/`thumbnail` fields —
// those point at the original third-party host, which is often hotlink-
// blocked, slow, or simply gone by the time the image loads, producing a
// broken <img>. Openverse's own per-image thumb proxy at
// /v1/images/<id>/thumb/ is the documented, reliable way to embed an
// Openverse result: it's always served from Openverse's own infrastructure
// regardless of what happened to the original source.
const buildThumbUrl = (id) => `${OPENVERSE_SEARCH_ENDPOINT}${id}/thumb/`;

export const findRecipePhoto = async (title) => {
  if (!title) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const params = new URLSearchParams({
      q: `${title} food dish`,
      page_size: "3",
      license_type: "commercial,modification",
      mature: "false",
    });

    const response = await fetch(`${OPENVERSE_SEARCH_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = await response.json();
    const hit = (data.results || []).find((r) => r.id);
    return hit ? buildThumbUrl(hit.id) : null;
  } catch {
    // Best-effort — a search failure just means the recipe keeps showing
    // the placeholder in the UI instead of a photo. Not worth a 500.
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
