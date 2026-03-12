import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

const COMPARE_ROUTE = path.join(REPO_ROOT, "site", "src", "pages", "compare", "[left]-vs-[right].astro");
const TOOLS_INDEX = path.join(REPO_ROOT, "site", "src", "pages", "tools", "index.astro");
const TOOL_DOSSIER = path.join(REPO_ROOT, "site", "src", "pages", "tools", "[slug].astro");

describe("marketplace enhancements contract", () => {
  it("adds a dedicated compare route", () => {
    assert.equal(fs.existsSync(COMPARE_ROUTE), true, "compare route should exist");
  });

  it("canonicalizes compare routes instead of emitting mirrored duplicates", () => {
    const source = fs.readFileSync(COMPARE_ROUTE, "utf8");

    assert.match(source, /getComparisonPairs/i, "compare route should use canonical comparison pairs");
    assert.match(source, /buildCanonicalCompareHref|canonical/i, "compare route should talk in canonical compare terms");
  });

  it("upgrades the browse page with saved views and active filter feedback", () => {
    const source = fs.readFileSync(TOOLS_INDEX, "utf8");

    assert.match(source, /saved-view/i, "browse page should expose saved view UI");
    assert.match(source, /active-filter/i, "browse page should expose active filter feedback");
    assert.match(source, /localStorage/i, "browse page should persist view presets");
    assert.match(source, /compatibility/i, "browse page should keep a compatibility-focused sort or preset surface");
    assert.match(source, /quick-view|preset/i, "browse page should expose quick presets");
    assert.match(source, /clear-filters/i, "browse page should let users reset filters");
    assert.match(source, /hosted:\s*\{\s*source:\s*"external"/i, "hosted preset should filter hosted listings instead of pricing only");
    assert.match(source, /type:\s*document\.getElementById\("filter-kind"\)/i, "type state should map to the type select control");
  });

  it("adds compare links or compare actions to dossier alternatives", () => {
    const source = fs.readFileSync(TOOL_DOSSIER, "utf8");

    assert.match(source, /compare/i, "tool dossier should mention compare actions");
    assert.match(source, /getRelatedTools/i, "tool dossier should use a dedicated related-tools helper");
  });
});
