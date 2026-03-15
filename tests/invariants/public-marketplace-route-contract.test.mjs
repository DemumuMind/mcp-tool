import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

const REQUIRED_ROUTES = [
  "site/src/pages/categories/index.astro",
  "site/src/pages/categories/[slug].astro",
  "site/src/pages/platforms/index.astro",
  "site/src/pages/platforms/[slug].astro",
  "site/src/pages/collections/index.astro",
  "site/src/pages/collections/[slug].astro",
  "site/src/pages/docs/index.astro",
  "site/src/pages/docs/[slug].astro",
  "site/src/pages/stats.astro",
  "site/src/pages/faq.astro",
  "site/src/pages/methodology.astro",
  "site/src/pages/request-category.astro",
  "site/src/pages/terms.astro",
  "site/src/pages/privacy.astro",
];

describe("Public marketplace route contract", () => {
  it("creates the required marketplace route surfaces", () => {
    const missing = REQUIRED_ROUTES.filter((relativePath) => !fs.existsSync(path.join(REPO_ROOT, relativePath)));

    assert.deepEqual(missing, [], `marketplace route files missing: ${missing.join(", ")}`);
  });
});
