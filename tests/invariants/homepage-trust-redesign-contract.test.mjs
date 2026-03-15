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

describe("Homepage editorial landing contract", () => {
  it("restructures the homepage around a value-first editorial landing flow", () => {
    const source = fs.readFileSync(HOME_PAGE_PATH, "utf8");

    assert.match(source, /home-editorial-hero/, "homepage should include the editorial hero shell");
    assert.match(source, /home-proof-rail/, "homepage should include a proof rail beside the hero copy");
    assert.match(source, /home-value-grid/, "homepage should include value proposition cards");
    assert.match(source, /home-feature-grid/, "homepage should include a curated featured tools grid");
    assert.match(source, /home-workflow-grid/, "homepage should include workflow browse entry points");
    assert.match(source, /home-proof-grid/, "homepage should include a trust or proof block");
    assert.match(source, /home-final-cta/, "homepage should include a final browse CTA");
    assert.match(source, />Browse tools</, "homepage primary CTA should send users to browse tools");
    assert.match(source, />Submit a tool</, "homepage should preserve a secondary author CTA");
  });

  it("updates the shared shell to expose marketplace-first navigation", () => {
    const source = fs.readFileSync(BASE_LAYOUT_PATH, "utf8");

    assert.match(source, /Browse Tools/, "primary nav should include Browse Tools");
    assert.match(source, /Categories/, "primary nav should include Categories");
    assert.match(source, /Docs/, "primary nav should include Docs");
    assert.match(source, /Stats/, "primary nav should include Stats");
    assert.match(source, /FAQ/, "primary nav should include FAQ");
  });

  it("defines home-specific editorial section styling", () => {
    const source = fs.readFileSync(GLOBAL_CSS_PATH, "utf8");

    assert.match(source, /--marketplace-accent:/, "global theme should define a marketplace accent token");
    assert.match(source, /\.home-editorial-hero/, "global stylesheet should define the home editorial hero");
    assert.match(source, /\.home-proof-rail/, "global stylesheet should define the home proof rail");
    assert.match(source, /\.home-value-grid/, "global stylesheet should define the home value grid");
    assert.match(source, /\.home-workflow-grid/, "global stylesheet should define the home workflow grid");
    assert.match(source, /\.home-final-cta/, "global stylesheet should define the final home CTA block");
  });
});
