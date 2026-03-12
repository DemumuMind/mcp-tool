import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

const PAGE_CASES = [
  {
    label: "trust",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "trust.astro"),
    requiredPatterns: [/PageHero/, /\/methodology\//, /\/stats\//, /reference/i],
  },
  {
    label: "press",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "press", "index.astro"),
    requiredPatterns: [/PageHero/, /\/tools\//, /\/methodology\//, /reference/i],
  },
  {
    label: "releases",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "releases", "index.astro"),
    requiredPatterns: [/PageHero/, /\/tools\//, /\/stats\//, /reference/i],
  },
  {
    label: "start",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "start.astro"),
    requiredPatterns: [/PageHero/, /\/tools\//, /\/categories\//, /marketplace/i],
  },
  {
    label: "support",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "support.astro"),
    requiredPatterns: [/PageHero/, /\/docs\//, /\/submit\//, /marketplace/i],
  },
  {
    label: "newsletter",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "newsletter", "index.astro"),
    requiredPatterns: [/PageHero/, /\/tools\//, /\/stats\//, /marketplace/i],
  },
];

describe("Legacy public routes contract", () => {
  it("reframes legacy routes as secondary marketplace surfaces", () => {
    const failures = [];

    for (const pageCase of PAGE_CASES) {
      const source = fs.readFileSync(pageCase.filePath, "utf8");
      for (const pattern of pageCase.requiredPatterns) {
        if (!pattern.test(source)) {
          failures.push(`${pageCase.label} missing ${pattern}`);
        }
      }
    }

    assert.deepEqual(failures, [], `legacy routes still look detached from marketplace IA: ${failures.join("; ")}`);
  });

  it("classifies legacy routes under the reference shell family", () => {
    const baseLayout = fs.readFileSync(path.join(REPO_ROOT, "site", "src", "layouts", "Base.astro"), "utf8");

    assert.match(baseLayout, /currentPath\.startsWith\("\/trust\/"\)/);
    assert.match(baseLayout, /currentPath\.startsWith\("\/press\/"\)/);
    assert.match(baseLayout, /currentPath\.startsWith\("\/releases\/"\)/);
    assert.match(baseLayout, /currentPath\.startsWith\("\/start\/"\)/);
    assert.match(baseLayout, /currentPath\.startsWith\("\/support\/"\)/);
    assert.match(baseLayout, /currentPath\.startsWith\("\/newsletter\/"\)/);
  });
});
