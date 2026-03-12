import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

const COMPARE_INDEX = path.join(REPO_ROOT, "site", "src", "pages", "compare.astro");
const COMPARE_PAGE_ROUTE = path.join(REPO_ROOT, "site", "src", "pages", "compare", "page", "[page].astro");
const PRESETS_INDEX = path.join(REPO_ROOT, "site", "src", "pages", "tools", "presets", "index.astro");
const PRESETS_ROUTE = path.join(REPO_ROOT, "site", "src", "pages", "tools", "presets", "[slug].astro");

describe("Marketplace route expansion contract", () => {
  it("adds compare hub routes for SEO and pagination", () => {
    assert.equal(fs.existsSync(COMPARE_INDEX), true);
    assert.equal(fs.existsSync(COMPARE_PAGE_ROUTE), true);
  });

  it("adds browse preset landing pages", () => {
    assert.equal(fs.existsSync(PRESETS_INDEX), true);
    assert.equal(fs.existsSync(PRESETS_ROUTE), true);
  });
});
