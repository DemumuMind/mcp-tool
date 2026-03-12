import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const HOME_PAGE_PATH = path.join(REPO_ROOT, "site", "src", "pages", "index.astro");
const BASE_LAYOUT_PATH = path.join(REPO_ROOT, "site", "src", "layouts", "Base.astro");
const GLOBAL_CSS_PATH = path.join(REPO_ROOT, "site", "src", "styles", "global.css");

describe("Homepage marketplace contract", () => {
  it("restructures the homepage around a search-first marketplace flow", () => {
    const source = fs.readFileSync(HOME_PAGE_PATH, "utf8");

    assert.match(source, /marketplace-hero/, "homepage should include a marketplace hero");
    assert.match(source, /search-omnibox/, "homepage should include omnibox search");
    assert.match(source, /featured-tools-grid/, "homepage should include a featured tools section");
    assert.match(source, /platform-hub-grid/, "homepage should include platform hubs");
    assert.match(source, /faq-preview-grid/, "homepage should include FAQ previews");
  });

  it("updates the shared shell to expose marketplace-first navigation", () => {
    const source = fs.readFileSync(BASE_LAYOUT_PATH, "utf8");

    assert.match(source, /Browse Tools/, "primary nav should include Browse Tools");
    assert.match(source, /Categories/, "primary nav should include Categories");
    assert.match(source, /Docs/, "primary nav should include Docs");
    assert.match(source, /Stats/, "primary nav should include Stats");
    assert.match(source, /FAQ/, "primary nav should include FAQ");
  });

  it("defines marketplace-specific shell and browse tokens", () => {
    const source = fs.readFileSync(GLOBAL_CSS_PATH, "utf8");

    assert.match(source, /--marketplace-accent:/, "global theme should define a marketplace accent token");
    assert.match(source, /--search-hero-grid:/, "global theme should define the search hero grid token");
    assert.match(source, /\.marketplace-card/, "global stylesheet should define marketplace card styling");
    assert.match(source, /\.facet-toolbar/, "global stylesheet should define facet toolbar styling");
  });
});
