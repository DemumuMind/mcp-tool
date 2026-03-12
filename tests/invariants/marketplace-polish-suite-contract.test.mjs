import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

const ROUTES = [
  "site/src/pages/compare.astro",
  "site/src/pages/compare/page/[page].astro",
  "site/src/pages/tools/presets/[slug].astro",
];

describe("marketplace polish suite contract", () => {
  it("adds compare hub and preset landing routes", () => {
    const missing = ROUTES.filter((relativePath) => !fs.existsSync(path.join(REPO_ROOT, relativePath)));

    assert.deepEqual(missing, [], `missing marketplace polish routes: ${missing.join(", ")}`);
  });

  it("keeps remaining secondary pages linked back into the marketplace", () => {
    const files = [
      "site/src/pages/releases/index.astro",
      "site/src/pages/support.astro",
      "site/src/pages/start.astro",
      "site/src/pages/newsletter/index.astro",
      "site/src/pages/trust.astro",
    ].map((relativePath) => fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));

    for (const source of files) {
      assert.match(source, /tools\//i, "secondary pages should link back into browse/tools");
      assert.match(source, /methodology|stats/i, "secondary pages should link back into marketplace context");
    }
  });
});
