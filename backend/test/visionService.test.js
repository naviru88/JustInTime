import assert from "node:assert/strict";
import { test } from "node:test";
import { identifyPantryItemsFromPhotos } from "../services/visionService.js";

test("normalizes model output and only accepts a real ISO expiry date", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.messages[1].content[0].type, "image_url");
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: [{
              type: "text",
              text: '[{"name":"Milk","quantity":1,"unit":"carton","category":"dairy","confidence":0.9,"expiryDate":"2027-01-31"},{"name":"Bread","expiryDate":"2027-02-31"}]',
            }],
          },
        }],
      }),
    };
  };

  try {
    const result = await identifyPantryItemsFromPhotos([
      { data: Buffer.from("fake image"), mimeType: "image/jpeg" },
    ]);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, "Milk");
    assert.equal(result[0].expiryDate, "2027-01-31");
    assert.equal(result[1].expiryDate, null);
    assert.equal(result[1].quantity, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  }
});

test("reports provider failures without requiring provider-specific response bodies", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-key";
  globalThis.fetch = async () => ({ ok: false, status: 429 });

  try {
    await assert.rejects(
      identifyPantryItemsFromPhotos([
        { data: Buffer.from("fake image"), mimeType: "image/jpeg" },
      ]),
      (error) => error.code === "OPENROUTER_REQUEST_FAILED"
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  }
});
