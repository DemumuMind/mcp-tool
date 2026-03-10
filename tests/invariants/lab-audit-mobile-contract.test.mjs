import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const AUDIT_PAGE_PATH = path.join(REPO_ROOT, "site", "src", "pages", "lab", "audit", "index.astro");

describe("Lab audit mobile contract", () => {
  it("defines the responsive guards needed to avoid horizontal overflow on narrow viewports", () => {
    const source = fs.readFileSync(AUDIT_PAGE_PATH, "utf8");

    assert.match(
      source,
      /\.ops-page\s*>\s*\*[\s\S]*?\{[\s\S]*?min-width:\s*0;/s,
      "audit page should allow ops-page children to shrink inside the mobile frame"
    );

    assert.match(
      source,
      /\.stats-strip\s*\{[^}]*flex-wrap:\s*wrap;/s,
      "audit page should wrap the stats strip"
    );

    assert.match(
      source,
      /\.filter-chips\s*\{[^}]*flex-wrap:\s*wrap;/s,
      "audit page should wrap filter chips"
    );

    assert.match(
      source,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.table-header\s*\{[^}]*display:\s*none;/s,
      "audit page should collapse the desktop table header on mobile"
    );

    assert.match(
      source,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.table-row\s*\{[^}]*grid-template-columns:\s*1fr;/s,
      "audit page should stack table rows into a single column on mobile"
    );

    assert.match(
      source,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.search-input\s*\{[^}]*min-width:\s*0;/s,
      "audit page should let the search input shrink to the mobile viewport"
    );
  });
});
