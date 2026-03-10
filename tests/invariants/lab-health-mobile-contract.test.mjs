import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const HEALTH_PAGE_PATH = path.join(REPO_ROOT, "site", "src", "pages", "lab", "health", "index.astro");

describe("Lab health mobile contract", () => {
  it("defines the responsive guards needed to avoid horizontal overflow on narrow viewports", () => {
    const source = fs.readFileSync(HEALTH_PAGE_PATH, "utf8");

    assert.match(
      source,
      /\.ops-page\s*>\s*\*[\s\S]*?\{[\s\S]*?min-width:\s*0;/s,
      "health page should allow ops-page children to shrink inside the mobile frame"
    );

    assert.match(
      source,
      /\.stats-strip\s*\{[^}]*flex-wrap:\s*wrap;/s,
      "health page should wrap the stats strip on mobile"
    );

    assert.match(
      source,
      /\.filter-chips\s*\{[^}]*flex-wrap:\s*wrap;/s,
      "health page should wrap filter chips on mobile"
    );

    assert.match(
      source,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.search-input\s*\{[^}]*min-width:\s*0;/s,
      "health page should let the search input shrink to the mobile viewport"
    );
  });
});
