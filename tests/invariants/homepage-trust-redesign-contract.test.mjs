import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const PAGE_HERO_PATH = path.join(REPO_ROOT, "site", "src", "components", "PageHero.astro");
const HOME_PAGE_PATH = path.join(REPO_ROOT, "site", "src", "pages", "index.astro");
const BASE_LAYOUT_PATH = path.join(REPO_ROOT, "site", "src", "layouts", "Base.astro");
const GLOBAL_CSS_PATH = path.join(REPO_ROOT, "site", "src", "styles", "global.css");
const PUBLIC_HERO_PAGES = [
  path.join(REPO_ROOT, "site", "src", "pages", "tools", "index.astro"),
  path.join(REPO_ROOT, "site", "src", "pages", "trust.astro"),
  path.join(REPO_ROOT, "site", "src", "pages", "press", "index.astro"),
  path.join(REPO_ROOT, "site", "src", "pages", "start.astro"),
  path.join(REPO_ROOT, "site", "src", "pages", "support.astro"),
  path.join(REPO_ROOT, "site", "src", "pages", "newsletter", "index.astro"),
  path.join(REPO_ROOT, "site", "src", "pages", "releases", "index.astro"),
];

describe("Homepage trust redesign contract", () => {
  it("expands PageHero into a richer shared primitive", () => {
    const source = fs.readFileSync(PAGE_HERO_PATH, "utf8");

    assert.match(source, /proofItems\?: string\[\]/, "PageHero should support proofItems");
    assert.match(source, /asideTitle\?: string/, "PageHero should support an aside title");
    assert.match(source, /asideBody\?: string/, "PageHero should support aside body copy");
    assert.match(source, /<slot name="aside"/, "PageHero should expose an aside slot");
  });

  it("restructures the homepage around trust-first sections", () => {
    const source = fs.readFileSync(HOME_PAGE_PATH, "utf8");

    assert.match(source, /trust-proof-band/, "homepage should include a trust proof band");
    assert.match(source, /operator-path-grid/, "homepage should include audience path cards");
    assert.match(source, /section-kicker">Curated discovery</, "homepage should foreground curated discovery");
    assert.match(source, /section-kicker">Editorial spotlight</, "homepage should include an editorial spotlight section");
  });

  it("updates the shared shell to expose trust-oriented navigation and CTA treatment", () => {
    const source = fs.readFileSync(BASE_LAYOUT_PATH, "utf8");

    assert.match(source, /site-nav__status/, "Base layout should expose a dedicated status rail");
    assert.match(source, /site-nav__cta/, "Base layout should expose a shared header CTA");
  });

  it("defines the new public-facing shell and homepage design tokens", () => {
    const source = fs.readFileSync(GLOBAL_CSS_PATH, "utf8");

    assert.match(source, /--hero-grid:/, "global theme should define a hero grid token");
    assert.match(source, /--surface-glass:/, "global theme should define a glass surface token");
    assert.match(source, /\.trust-proof-band/, "global stylesheet should define trust proof band styling");
    assert.match(source, /\.operator-path-grid/, "global stylesheet should define operator path styling");
  });

  it("upgrades major public pages to the richer hero interface", () => {
    for (const filePath of PUBLIC_HERO_PAGES) {
      const source = fs.readFileSync(filePath, "utf8");
      assert.match(
        source,
        /proofItems=|asideTitle=|layout="split"/,
        `${path.relative(REPO_ROOT, filePath)} should use the richer PageHero interface`
      );
    }
  });
});
