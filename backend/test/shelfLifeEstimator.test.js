import assert from "node:assert/strict";
import { test } from "node:test";
import { expiryDateFromToday, toISODate } from "../services/shelfLifeEstimator.js";

test("shelf-life dates use the app's local calendar date when supplied", () => {
  const now = new Date();
  const localToday = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;
  const expected = new Date(`${localToday}T00:00:00.000Z`);
  expected.setUTCDate(expected.getUTCDate() + 14);

  assert.equal(expiryDateFromToday(14, localToday), toISODate(expected));
});

test("invalid or stale client dates fall back to the server's UTC calendar date", () => {
  const now = new Date();
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  utcToday.setUTCDate(utcToday.getUTCDate() + 2);

  assert.equal(expiryDateFromToday(2, "2020-02-31"), toISODate(utcToday));
});
