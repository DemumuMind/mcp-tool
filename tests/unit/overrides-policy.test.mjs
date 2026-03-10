import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const OVERRIDES_PATH = resolve(ROOT, "site", "src", "data", "overrides.json");

describe("overrides policy", () => {
  it("keeps tags at or below the site-quality cap", () => {
    const overrides = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"));
    const offenders = Object.entries(overrides)
      .filter(([, entry]) => Array.isArray(entry.tags) && entry.tags.length > 6)
      .map(([repo, entry]) => `${repo}:${entry.tags.length}`);

    assert.deepEqual(offenders, []);
  });
});
