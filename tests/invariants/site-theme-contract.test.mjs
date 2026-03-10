import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const SITE_SRC = path.join(REPO_ROOT, "site", "src");
const BASE_LAYOUT_PATH = path.join(SITE_SRC, "layouts", "Base.astro");
const GLOBAL_CSS_PATH = path.join(SITE_SRC, "styles", "global.css");

function getSourceFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getSourceFiles(fullPath));
      continue;
    }

    if (/\.(astro|css|js|mjs|ts)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("Site theme contract", () => {
  it("Base layout exposes a route-family shell marker", () => {
    const baseLayout = fs.readFileSync(BASE_LAYOUT_PATH, "utf8");
    assert.match(
      baseLayout,
      /data-route-family=\{routeFamily\}/,
      "Base.astro should expose data-route-family={routeFamily} on the page shell"
    );
  });

  it("global theme defines the protocol editorial typography and accent tokens", () => {
    const globalCss = fs.readFileSync(GLOBAL_CSS_PATH, "utf8");

    assert.match(globalCss, /Cormorant Garamond/, "display serif font stack missing");
    assert.match(globalCss, /Instrument Sans/, "interface sans font stack missing");
    assert.match(globalCss, /IBM Plex Mono/, "mono font stack missing");
    assert.match(globalCss, /--color-signal:\s*#D7FF3F/i, "signal accent token missing");
    assert.match(globalCss, /--color-ink:\s*#0D0F12/i, "ink token missing");
  });

  it("site source no longer references legacy --sl-color tokens", () => {
    const offenders = getSourceFiles(SITE_SRC)
      .filter((filePath) => fs.readFileSync(filePath, "utf8").includes("--sl-color-"))
      .map((filePath) => path.relative(REPO_ROOT, filePath));

    assert.deepEqual(
      offenders,
      [],
      `legacy --sl-color token usage remains in: ${offenders.join(", ")}`
    );
  });
});
