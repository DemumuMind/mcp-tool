# Expand Tools Catalog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the public `/tools/` catalog so it shows more current repos by default and promotes a curated set of strong org-only tools into the visible catalog.

**Architecture:** Keep the existing data model and make visibility flow through `unlisted` instead of `registered` on the listing page. Promote selected org-only repos by setting `unlisted: false` in curated data, enrich their metadata in `overrides.json`, and regenerate or update the rendered catalog inputs used by Astro.

**Tech Stack:** Astro, JSON data files, Node.js test runner, local generation scripts

---

### Task 1: Lock the listing behavior with tests

**Files:**
- Create: `tests/unit/tools-catalog-contract.test.mjs`
- Modify: `site/src/pages/tools/index.astro`

**Step 1: Write the failing test**

Add assertions that the tools listing source:
- uses `unlisted` for default visibility instead of `registered`
- updates copy away from registry-only framing
- keeps a separate control for showing hidden backlog items

**Step 2: Run test to verify it fails**

Run: `node --test tests/unit/tools-catalog-contract.test.mjs`
Expected: FAIL because the current page still gates visibility on `registered` and uses registry-only copy.

**Step 3: Write minimal implementation**

Update `site/src/pages/tools/index.astro` so:
- public counts are derived from visible (`!unlisted`) projects
- default filtering hides only `unlisted` entries
- the checkbox label reflects hidden backlog rather than org-only visibility

**Step 4: Run test to verify it passes**

Run: `node --test tests/unit/tools-catalog-contract.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/unit/tools-catalog-contract.test.mjs site/src/pages/tools/index.astro
git commit -m "feat: expand public tools catalog visibility"
```

### Task 2: Promote curated org-only repos

**Files:**
- Modify: `site/src/data/overrides.json`
- Modify: `site/src/data/projects.json`

**Step 1: Write the failing test**

Add assertions for a curated list of org-only repos that should be public and richly described.

**Step 2: Run test to verify it fails**

Run: `node --test tests/unit/tools-catalog-contract.test.mjs`
Expected: FAIL because the selected repos are still hidden or lack required metadata.

**Step 3: Write minimal implementation**

Promote selected repos by:
- setting `unlisted: false`
- ensuring `kind`, `stability`, `tagline`, and install hints exist where appropriate

**Step 4: Run test to verify it passes**

Run: `node --test tests/unit/tools-catalog-contract.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add site/src/data/overrides.json site/src/data/projects.json tests/unit/tools-catalog-contract.test.mjs
git commit -m "feat: promote curated org-only tools"
```

### Task 3: Verify public catalog health

**Files:**
- Test: `tests/unit/tools-catalog-contract.test.mjs`
- Test: `tests/invariants/data-integrity.test.mjs`
- Build: `site/package.json`

**Step 1: Run targeted tests**

Run: `node --test tests/unit/tools-catalog-contract.test.mjs tests/invariants/data-integrity.test.mjs`
Expected: PASS

**Step 2: Run site build**

Run: `npm --prefix site run build`
Expected: PASS

**Step 3: Inspect diff**

Run: `git diff -- site/src/pages/tools/index.astro site/src/data/overrides.json site/src/data/projects.json tests/unit/tools-catalog-contract.test.mjs`
Expected: Diff shows only catalog visibility, copy, and curated metadata changes.

**Step 4: Commit**

```bash
git add docs/plans/2026-03-10-expand-tools-catalog.md tests/unit/tools-catalog-contract.test.mjs site/src/pages/tools/index.astro site/src/data/overrides.json site/src/data/projects.json
git commit -m "feat: expand public tools catalog"
```
