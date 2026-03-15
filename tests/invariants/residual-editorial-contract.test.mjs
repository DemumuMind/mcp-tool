import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

const LEGACY_COLOR_PATTERNS = [
  /#388bfd/i,
  /#161b22/i,
  /#30363d/i,
  /#8b949e/i,
  /#e6edf3/i,
  /SF Mono/i,
  /system-ui/i,
];

const PAGE_CASES = [
  {
    label: "clearance landing",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "clearance", "index.astro"),
    requiredPatterns: [/import PageHero from /, /<PageHero/s],
  },
  {
    label: "promo week",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "promo", "[week].astro"),
    requiredPatterns: [/import PageHero from /, /<PageHero/s],
  },
  {
    label: "submission queue",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "submit", "queue.astro"),
    requiredPatterns: [/import PageHero from /, /<PageHero/s],
  },
  {
    label: "weekly focus reference",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "now.astro"),
    requiredPatterns: [/import PageHero from /, /<PageHero/s, /withBase/],
  },
  {
    label: "pulse reference",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "pulse.astro"),
    requiredPatterns: [/import PageHero from /, /<PageHero/s, /Reference surface/],
  },
  {
    label: "registry reference",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "registry.astro"),
    requiredPatterns: [/import PageHero from /, /<PageHero/s, /Reference surface/],
  },
  {
    label: "override review reference",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "review.astro"),
    requiredPatterns: [/import PageHero from /, /<PageHero/s, /Reference surface/],
  },
  {
    label: "logo studio dossier",
    filePath: path.join(REPO_ROOT, "site", "src", "pages", "tools", "logo-studio.astro"),
    requiredPatterns: [/tool-profile__hero/, /tool-meta-grid/, /signal-strip/],
  },
];

describe("Residual editorial contract", () => {
  it("remaining public routes use the editorial primitives instead of legacy page-local styling", () => {
    const failures = [];

    for (const pageCase of PAGE_CASES) {
      const source = fs.readFileSync(pageCase.filePath, "utf8");

      for (const pattern of pageCase.requiredPatterns) {
        if (!pattern.test(source)) {
          failures.push(`${pageCase.label} missing ${pattern}`);
        }
      }

      for (const pattern of LEGACY_COLOR_PATTERNS) {
        if (pattern.test(source)) {
          failures.push(`${pageCase.label} still contains legacy pattern ${pattern}`);
        }
      }
    }

    assert.deepEqual(
      failures,
      [],
      `residual editorial routes still contain legacy structure or styling: ${failures.join("; ")}`
    );
  });
});
