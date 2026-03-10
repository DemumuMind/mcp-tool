# Architecture Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the repo so `packages/promo-kit` owns portable-core behavior, Astro pages consume a dedicated content layer instead of direct file reads, and root scripts become explicit wrappers or repo-specific orchestration.

**Architecture:** Start with the lowest-risk seams: canonicalize shared config, introduce a site content layer, migrate a small set of high-value pages, then collapse duplicated portable-core logic into wrappers. Keep existing entrypoints stable while using TDD and small commits to ratchet the architecture into place.

**Tech Stack:** Node.js 22, ESM `.mjs`, Astro 5, JSON data files, root `node:test` suites

---

### Task 1: Create an isolated execution worktree and record a clean baseline

**Files:**
- Verify only

**Step 1: Create a dedicated worktree from `main`**

Run: `git worktree add .worktrees/architecture-seams -b codex/architecture-seams main`
Expected: a new worktree exists at `.worktrees/architecture-seams`

**Step 2: Switch all follow-up commands to the worktree**

Run: `git -C .worktrees/architecture-seams status --short`
Expected: clean worktree output

**Step 3: Capture the architectural baseline**

Run: `node --test tests/unit/config.test.mjs tests/unit/package-scripts.test.mjs`
Expected: PASS in the baseline worktree

**Step 4: Commit the plan docs if not already committed**

```bash
git add docs/plans/2026-03-10-architecture-refactor-design.md docs/plans/2026-03-10-architecture-refactor.md
git commit -m "docs: add architecture refactor design and plan"
```

### Task 2: Add failing tests for canonical config ownership

**Files:**
- Modify: `tests/unit/config.test.mjs`
- Create: `tests/unit/site-kit.test.mjs`

**Step 1: Add a failing test for site config delegation**

Add a new test file that reads `site/src/lib/kit.ts` and asserts the site config adapter no longer owns parsing logic such as direct `JSON.parse(readFileSync(...kit.config.json))`.

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

describe("site kit adapter", () => {
  it("delegates config loading to the canonical shared module", () => {
    const source = fs.readFileSync("site/src/lib/kit.ts", "utf8");
    assert.match(source, /loadKitConfig|getConfig/);
    assert.doesNotMatch(source, /JSON\.parse\(.*readFileSync/s);
  });
});
```

**Step 2: Add a failing test for root config wrapper behavior**

Extend `tests/unit/config.test.mjs` to cover the canonical site-url helpers exposed by `scripts/lib/config.mjs`, so the root module remains the stable adapter surface while the implementation can move underneath it.

**Step 3: Run the narrow test set and verify failure**

Run: `node --test tests/unit/config.test.mjs tests/unit/site-kit.test.mjs`
Expected: FAIL because `site/src/lib/kit.ts` still parses config directly

**Step 4: Commit the failing tests after they are intentionally red in the worktree**

```bash
git add tests/unit/config.test.mjs tests/unit/site-kit.test.mjs
git commit -m "test: define canonical config seam expectations"
```

### Task 3: Canonicalize config and make the site a thin adapter

**Files:**
- Modify: `packages/promo-kit/scripts/lib/config.mjs`
- Modify: `packages/promo-kit/index.mjs`
- Modify: `scripts/lib/config.mjs`
- Modify: `site/src/lib/kit.ts`
- Modify: `tests/unit/config.test.mjs`
- Modify: `tests/unit/site-kit.test.mjs`

**Step 1: Move all shared config behavior into the package-owned module**

Ensure `packages/promo-kit/scripts/lib/config.mjs` exports the complete shared config surface, including site URL normalization helpers needed by the repo.

**Step 2: Turn the root config module into a thin wrapper**

Replace root-owned config logic with re-exports from the package-owned module.

```js
export {
  getConfig,
  getRoot,
  loadKitConfig,
  resetConfigCache,
  KIT_VERSION_SUPPORTED,
  normalizeSiteUrl,
  getSiteUrl,
  getSiteBaseUrl,
  resolveSiteUrl,
} from "../../packages/promo-kit/scripts/lib/config.mjs";
```

**Step 3: Refactor the site adapter to delegate instead of parse**

Make `site/src/lib/kit.ts` load config through the shared module and only shape Astro-friendly output.

```ts
import { loadKitConfig, getSiteUrl } from "../../../scripts/lib/config.mjs";
```

Keep the file focused on adapting values for Astro, not on file discovery or parsing.

**Step 4: Run the narrow tests and verify green**

Run: `node --test tests/unit/config.test.mjs tests/unit/site-kit.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/promo-kit/scripts/lib/config.mjs packages/promo-kit/index.mjs scripts/lib/config.mjs site/src/lib/kit.ts tests/unit/config.test.mjs tests/unit/site-kit.test.mjs
git commit -m "refactor: canonicalize shared config ownership"
```

### Task 4: Add the Astro content-layer foundation with tests

**Files:**
- Create: `site/src/lib/content/generated-data.mjs`
- Create: `site/src/lib/content/public-artifacts.mjs`
- Create: `site/src/lib/content/view-models.mjs`
- Create: `tests/unit/site-content.test.mjs`

**Step 1: Write failing tests for content-loader behavior**

Add tests for:

- reading JSON safely from `site/src/data`
- reading optional public artifacts from `site/public`
- returning defaults instead of page-local `try/catch` duplication

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readGeneratedJson } from "../../site/src/lib/content/generated-data.mjs";

describe("site content loaders", () => {
  it("returns a fallback value when a generated JSON file is missing", () => {
    const value = readGeneratedJson("does-not-exist.json", { fallback: [] });
    assert.deepEqual(value, []);
  });
});
```

**Step 2: Run the new tests and verify failure**

Run: `node --test tests/unit/site-content.test.mjs`
Expected: FAIL because the content-layer modules do not exist yet

**Step 3: Implement the minimal loaders**

Create small focused modules:

- `generated-data.mjs` for `site/src/data/**`
- `public-artifacts.mjs` for `site/public/**`
- `view-models.mjs` for shared derived page data

Keep each loader deterministic and side-effect free.

**Step 4: Run the content-loader tests and verify green**

Run: `node --test tests/unit/site-content.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add site/src/lib/content/generated-data.mjs site/src/lib/content/public-artifacts.mjs site/src/lib/content/view-models.mjs tests/unit/site-content.test.mjs
git commit -m "feat: add Astro content-layer foundation"
```

### Task 5: Migrate the first high-value Astro pages to content loaders

**Files:**
- Modify: `site/src/pages/trust.astro`
- Modify: `site/src/pages/now.astro`
- Modify: `site/src/pages/experiments.astro`
- Modify: `site/src/lib/content/view-models.mjs`
- Create: `tests/unit/site-page-contracts.test.mjs`

**Step 1: Write failing page-contract tests**

Add tests that scan the three target pages and assert they no longer import `node:fs`.

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

for (const filePath of [
  "site/src/pages/trust.astro",
  "site/src/pages/now.astro",
  "site/src/pages/experiments.astro",
]) {
  describe(filePath, () => {
    it("does not import node:fs", () => {
      const source = fs.readFileSync(filePath, "utf8");
      assert.doesNotMatch(source, /node:fs/);
    });
  });
}
```

**Step 2: Run the narrow test set and verify failure**

Run: `node --test tests/unit/site-page-contracts.test.mjs`
Expected: FAIL because the pages still read files directly

**Step 3: Refactor the pages to consume loaders/view models**

- move file reads and fallback behavior into `site/src/lib/content/*`
- keep page frontmatter focused on composition
- do not add new page-local helper duplication

**Step 4: Run the migrated-page tests and a focused site build**

Run: `node --test tests/unit/site-page-contracts.test.mjs`
Expected: PASS

Run: `npm run build`
Workdir: `site`
Expected: PASS

**Step 5: Commit**

```bash
git add site/src/pages/trust.astro site/src/pages/now.astro site/src/pages/experiments.astro site/src/lib/content/view-models.mjs tests/unit/site-page-contracts.test.mjs
git commit -m "refactor: route core pages through site content loaders"
```

### Task 6: Convert duplicated portable-core files into explicit wrappers

**Files:**
- Modify: `scripts/apply-control-patch.mjs`
- Modify: `scripts/apply-submission-status.mjs`
- Modify: `scripts/gen-baseline.mjs`
- Modify: `scripts/gen-decision-drift.mjs`
- Modify: `scripts/gen-experiment-decisions.mjs`
- Modify: `scripts/gen-feedback-summary.mjs`
- Modify: `scripts/gen-promo-decisions.mjs`
- Modify: `scripts/gen-queue-health.mjs`
- Modify: `scripts/gen-recommendation-patch.mjs`
- Modify: `scripts/gen-recommendations.mjs`
- Modify: `scripts/gen-telemetry-aggregate.mjs`
- Modify: `scripts/gen-trust-receipt.mjs`
- Modify: `scripts/kit-bootstrap.mjs`
- Modify: `scripts/kit-migrate.mjs`
- Modify: `scripts/kit-selftest.mjs`
- Create: `tests/unit/portable-core-wrappers.test.mjs`

**Step 1: Write failing wrapper tests**

Add tests that verify root scripts delegate to package-owned implementations and keep any repo-specific adapter behavior only where intentional.

Examples:

- `scripts/apply-control-patch.mjs` may keep base64 CLI decoding, but should call package-owned patch application logic
- `scripts/kit-selftest.mjs` may keep repo-aware skip behavior, but should delegate portable checks to the package layer

**Step 2: Run the wrapper tests and verify failure**

Run: `node --test tests/unit/portable-core-wrappers.test.mjs`
Expected: FAIL because root scripts still own duplicated logic

**Step 3: Refactor root scripts into wrappers/adapters**

Pattern:

```js
import { canonicalFunction } from "../packages/promo-kit/scripts/example.mjs";

export { canonicalFunction };

if (isMain) {
  // repo-specific argument translation only
}
```

Do not remove intentional repo-only CLI compatibility. Do remove duplicate core logic.

**Step 4: Run the wrapper tests and the affected unit suite**

Run: `node --test tests/unit/portable-core-wrappers.test.mjs tests/unit/config.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts packages/promo-kit/scripts tests/unit/portable-core-wrappers.test.mjs
git commit -m "refactor: collapse duplicated portable-core scripts into wrappers"
```

### Task 7: Migrate the lab pages in controlled batches

**Files:**
- Modify: `site/src/pages/lab/baseline/index.astro`
- Modify: `site/src/pages/lab/control/index.astro`
- Modify: `site/src/pages/lab/drift/index.astro`
- Modify: `site/src/pages/lab/metrics/index.astro`
- Modify: `site/src/pages/lab/ops/index.astro`
- Modify: `site/src/pages/lab/promo/index.astro`
- Modify: `site/src/pages/lab/queue.astro`
- Modify: `site/src/pages/lab/signals.astro`
- Modify: `site/src/pages/lab/targets.astro`
- Modify: `site/src/pages/lab/worthy/index.astro`
- Modify: `site/src/lib/content/generated-data.mjs`
- Modify: `site/src/lib/content/public-artifacts.mjs`
- Modify: `tests/unit/site-page-contracts.test.mjs`

**Step 1: Add one failing assertion per migrated page batch**

Migrate in small batches of 2-3 pages, each time extending `tests/unit/site-page-contracts.test.mjs` to forbid `node:fs` in the files being migrated.

**Step 2: Run the targeted test after each batch and verify failure**

Run: `node --test tests/unit/site-page-contracts.test.mjs`
Expected: FAIL for the current batch only

**Step 3: Move batch-local file access into the content layer**

Reuse the shared loaders instead of adding one-off helpers inside page frontmatter.

**Step 4: Run the test and site build after each batch**

Run: `node --test tests/unit/site-page-contracts.test.mjs`
Expected: PASS

Run: `npm run build`
Workdir: `site`
Expected: PASS

**Step 5: Commit after each page batch**

```bash
git add site/src/pages/lab site/src/lib/content tests/unit/site-page-contracts.test.mjs
git commit -m "refactor: migrate lab page batch to site content loaders"
```

### Task 8: Add repo-wide architectural guardrails

**Files:**
- Create: `tests/unit/architecture-guardrails.test.mjs`
- Modify: `tests/unit/package-scripts.test.mjs`
- Modify: `README.md`
- Modify: `docs/HANDBOOK.md`

**Step 1: Write failing architectural guardrail tests**

Cover:

- `site/src/pages/**` must not import `node:fs`
- `site/src/lib/kit.ts` must remain an adapter, not a parser
- duplicated portable-core logic must not be reintroduced outside `packages/promo-kit`

**Step 2: Run the guardrail suite and verify failure**

Run: `node --test tests/unit/architecture-guardrails.test.mjs`
Expected: FAIL until the remaining direct page/file-system coupling is removed

**Step 3: Implement the minimal missing cleanups**

Finish the last stragglers needed to satisfy the guardrails and document the new architecture boundaries in the README/handbook.

**Step 4: Run the guardrail suite and verify green**

Run: `node --test tests/unit/architecture-guardrails.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/unit/architecture-guardrails.test.mjs tests/unit/package-scripts.test.mjs README.md docs/HANDBOOK.md
git commit -m "test: enforce architecture boundaries"
```

### Task 9: Run full verification and request review

**Files:**
- Verify only

**Step 1: Run the unit and invariant suites**

Run: `npm run test:all`
Expected: PASS

**Step 2: Run the site build**

Run: `npm run build`
Workdir: `site`
Expected: PASS

**Step 3: Run the portable selftest**

Run: `npm run kit:selftest`
Expected: PASS

**Step 4: Run a targeted repo scan for forbidden direct page file access**

Run: `git grep -n "node:fs" -- site/src/pages`
Expected: no matches

**Step 5: Use @requesting-code-review before merge**

Review scope:

- config ownership is singular
- root wrappers retain CLI compatibility
- content-layer APIs are cohesive
- page/frontmatter logic is presentation-only

**Step 6: Commit the completed migration**

```bash
git add -A
git commit -m "refactor: enforce architecture boundaries across core and site"
```
