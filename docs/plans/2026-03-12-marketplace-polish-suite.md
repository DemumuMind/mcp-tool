# Marketplace Polish Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the next marketplace polish layer after PR #11 across compare SEO/scale, preset landing pages, ranking nuance, reference-surface consistency, and stronger automated route coverage.

**Architecture:** Extend the marketplace content layer with explicit compare-policy and preset-registry models, then reuse those models across Astro route generation, browse UX, and automated tests. Keep `/tools/` as the canonical filter engine, add static preset entry pages, and keep compare growth bounded through content-layer caps instead of route-local logic.

**Tech Stack:** Astro static routes, TypeScript content layer, Node test runner, Playwright MCP, Chrome DevTools.

---

### Task 1: Add compare growth policy and canonical helpers

**Files:**
- Modify: `site/src/lib/content/marketplace.ts`
- Modify: `site/src/pages/compare/[left]-vs-[right].astro`
- Test: `tests/unit/marketplace-comparisons.test.mjs`

**Step 1: Write the failing tests**

- Add tests for:
  - capped compare pair generation
  - compare hub/group metadata if introduced
  - canonical pair ordering still preserved after the cap

**Step 2: Run the focused tests to verify failure**

Run: `node --test tests/unit/marketplace-comparisons.test.mjs`

**Step 3: Implement the content-layer compare policy**

- Add compare policy constants/helpers in `site/src/lib/content/marketplace.ts`
- Sort candidate pairs by strongest relatedness and quality
- Cap per-tool and total compare-page volume

**Step 4: Update compare route generation**

- Make `site/src/pages/compare/[left]-vs-[right].astro` consume the capped policy output
- Keep canonical href behavior intact

**Step 5: Re-run focused tests**

Run: `node --test tests/unit/marketplace-comparisons.test.mjs`

### Task 2: Add preset registry and preset landing pages

**Files:**
- Modify: `site/src/lib/content/marketplace.ts`
- Modify: `site/src/pages/tools/index.astro`
- Create: `site/src/pages/tools/presets/[slug].astro`
- Test: `tests/invariants/marketplace-enhancements-contract.test.mjs`
- Test: `tests/unit/marketplace-content.test.mjs`

**Step 1: Write the failing tests**

- Add tests for:
  - preset registry availability
  - hosted/builder/multi-client preset semantics
  - existence of preset landing route

**Step 2: Run focused tests to verify failure**

Run: `node --test tests/unit/marketplace-content.test.mjs tests/invariants/marketplace-enhancements-contract.test.mjs`

**Step 3: Add preset registry to the content layer**

- Define preset models with:
  - slug
  - title
  - summary
  - default browse state
  - explanatory copy

**Step 4: Build preset route**

- Create `site/src/pages/tools/presets/[slug].astro`
- Render preset rationale and CTA into `/tools/?...`
- Keep `/tools/` as the actual filter engine

**Step 5: Reuse preset registry in browse page**

- Source quick presets from the same registry
- Keep saved views and clearable filters working

**Step 6: Re-run focused tests**

Run: `node --test tests/unit/marketplace-content.test.mjs tests/invariants/marketplace-enhancements-contract.test.mjs`

### Task 3: Refine ranking helpers

**Files:**
- Modify: `site/src/lib/content/marketplace.ts`
- Test: `tests/unit/marketplace-content.test.mjs`

**Step 1: Write failing tests**

- Add tests for:
  - hosted vs repo-backed weighting differences
  - release cadence affecting trend/quality
  - stronger docs maturity behavior

**Step 2: Run focused tests to verify failure**

Run: `node --test tests/unit/marketplace-content.test.mjs`

**Step 3: Implement minimal scoring refinement**

- Adjust helper functions in `site/src/lib/content/marketplace.ts`
- Keep score labels and verified logic explainable

**Step 4: Re-run focused tests**

Run: `node --test tests/unit/marketplace-content.test.mjs`

### Task 4: Final reference-surface consistency pass

**Files:**
- Modify: remaining secondary public pages identified during scoping
- Test: relevant invariant contract file(s)

**Step 1: Identify remaining mismatched routes**

- Use scoping results to limit edits to the actual remaining secondary surfaces

**Step 2: Add/update tests first**

- Add or extend contract tests that enforce marketplace-linked reference framing on those pages

**Step 3: Implement minimal editorial cleanup**

- Add marketplace-first CTA
- Make route-family language explicit
- Remove any remaining standalone-product framing

**Step 4: Re-run focused contract tests**

Run the exact touched invariant tests

### Task 5: Strengthen browse/compare/reference flow coverage

**Files:**
- Modify or create tests under `tests/invariants/`
- Possibly add route-level smoke helpers if needed

**Step 1: Write failing coverage checks**

- Cover:
  - preset route existence and browse handoff
  - compare route family/cap behavior
  - reference route back-links into marketplace

**Step 2: Run focused tests to verify failure**

Run the touched invariant tests only

**Step 3: Implement the minimal test/fixture support needed**

- Prefer contract/integration checks over adding heavy new infrastructure

**Step 4: Re-run focused tests**

Run the touched invariant tests again

### Task 6: Full verification and PR handoff

**Files:**
- Review all touched files

**Step 1: Run the full suite**

Run: `npm run test:all`

**Step 2: Run the site build**

Run: `npm --prefix site run build`

**Step 3: Run browser smoke**

- Use Playwright MCP and Chrome DevTools to verify:
  - preset landing page
  - `/tools/` preset application
  - compare page still loads under the cap
  - one cleaned reference page

**Step 4: Commit**

Use a conventional commit summarizing the polish batch.

**Step 5: Push and open PR**

- Push the branch
- Open a PR with summary + verification evidence
