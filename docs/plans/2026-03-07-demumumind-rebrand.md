# DemumuMind Rebrand Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand the repo, site, docs, workflows, and package identity to `DemumuMind` / `DemumuMind/mcp-tool` / `DemumuMind/*` / `@demumumind` with explicit migration notes for legacy names only.

**Architecture:** Drive the rebrand from shared config and package metadata first, then update site UI and documentation, then rewrite workflow/runtime references, then regenerate derived artifacts. Use small, test-backed steps to avoid blind string-replace damage.

**Tech Stack:** Node.js, Astro, JSON data files, GitHub Actions YAML, markdown docs, npm package metadata

---

### Task 1: Record the approved brand contract

**Files:**
- Create: `docs/plans/2026-03-07-demumumind-rebrand-design.md`
- Create: `docs/plans/2026-03-07-demumumind-rebrand.md`

**Step 1: Verify the design doc exists**

Run: `dir docs\\plans`
Expected: design and implementation plan files are present

**Step 2: Commit the planning docs**

```bash
git add docs/plans/2026-03-07-demumumind-rebrand-design.md docs/plans/2026-03-07-demumumind-rebrand.md
git commit -m "docs: add DemumuMind rebrand design and plan"
```

### Task 2: Add failing tests for canonical branding entry points

**Files:**
- Modify: `tests/unit/config.test.mjs`
- Modify: `tests/unit/package-scripts.test.mjs`
- Create: `tests/unit/rebrand-branding.test.mjs`

**Step 1: Write failing tests for canonical brand metadata**

Cover:
- `kit.config.json` should expose `DemumuMind`
- `kit.config.json` should point at `DemumuMind/mcp-tool` and `DemumuMind/*`
- root package metadata should stop using `DemumuMind`
- `packages/promo-kit/package.json` should use `@demumumind/promo-kit`

**Step 2: Run the narrow test set and verify failure**

Run: `node --test tests/unit/rebrand-branding.test.mjs`
Expected: FAIL on old brand strings

### Task 3: Switch shared config and package metadata

**Files:**
- Modify: `kit.config.json`
- Modify: `package.json`
- Modify: `packages/promo-kit/package.json`
- Modify: `packages/promo-kit/bin/promo-kit.mjs`

**Step 1: Update canonical config fields**

Change org/site/repo/contact/package metadata to:
- brand: `DemumuMind`
- repo: `DemumuMind/mcp-tool`
- org/tool repos: `DemumuMind/*`
- scope: `@demumumind`
- temporary site URL: `http://localhost:4321/`

**Step 2: Run narrow tests and verify green**

Run: `node --test tests/unit/rebrand-branding.test.mjs tests/unit/package-scripts.test.mjs`
Expected: PASS

**Step 3: Commit**

```bash
git add kit.config.json package.json packages/promo-kit/package.json packages/promo-kit/bin/promo-kit.mjs tests/unit/rebrand-branding.test.mjs tests/unit/package-scripts.test.mjs
git commit -m "refactor: switch canonical brand metadata to DemumuMind"
```

### Task 4: Rebrand site layouts, meta, and navigation

**Files:**
- Modify: `site/src/layouts/Base.astro`
- Modify: `site/src/pages/index.astro`
- Modify: `site/src/pages/about.astro`
- Modify: `site/src/pages/tools/index.astro`
- Modify: `site/src/pages/tools/[slug].astro`
- Modify: `site/src/pages/trust.astro`
- Modify: `site/src/pages/proof/index.astro`
- Modify: `site/src/pages/press/index.astro`
- Modify: `site/src/pages/releases/index.astro`
- Modify: `site/src/pages/support.astro`

**Step 1: Replace primary visible brand strings and canonical URLs**

Keep old brand only where explicitly marked as legacy/migration.

**Step 2: Run a focused build**

Run: `npm run build`
Workdir: `site`
Expected: PASS

**Step 3: Commit**

```bash
git add site/src/layouts/Base.astro site/src/pages
git commit -m "feat: rebrand site UI to DemumuMind"
```

### Task 5: Rebrand docs, examples, and migration notes

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`
- Modify: `docs/HANDBOOK.md`
- Modify: `docs/INTERNAL-MARKETING-WING.md`
- Modify: `docs/automation.md`
- Modify: `docs/presskit-handbook.md`
- Modify: `docs/quickstart.md`
- Modify: `docs/redirects.md`
- Modify: `docs/pilot-*.md`
- Modify: `examples/**`

**Step 1: Replace primary brand/install/URL references**

**Step 2: Add explicit migration notes for legacy package name where needed**

**Step 3: Run a grep audit**

Run: `git grep -n "DemumuMind\\|demumumind\\|@demumumind\\|DemumuMind" -- README.md docs examples packages site/src .github tests`
Expected: only intentional legacy notes and tests remain

**Step 4: Commit**

```bash
git add README.md CONTRIBUTING.md SECURITY.md docs examples
git commit -m "docs: rebrand documentation to DemumuMind"
```

### Task 6: Rebrand workflows and script defaults

**Files:**
- Modify: `.github/workflows/*.yml`
- Modify: `scripts/*.mjs`
- Modify: `packages/promo-kit/scripts/*.mjs`

**Step 1: Update repo/org/package/email defaults**

Also update script defaults and hardcoded links that currently assume `DemumuMind/*` so they resolve to `DemumuMind/*`.

**Step 2: Add or update tests where script defaults are asserted**

**Step 3: Run targeted tests**

Run: `node --test tests/unit/*.test.mjs`
Expected: PASS

**Step 4: Commit**

```bash
git add .github/workflows scripts packages/promo-kit/scripts tests/unit
git commit -m "refactor: update workflow and script defaults for DemumuMind"
```

### Task 7: Refresh generated artifacts

**Files:**
- Modify: `site/src/data/**`
- Modify: `audit/truth-matrix.json`

**Step 1: Run sync and downstream generators**

Run:
- `node scripts/sync-org-metadata.mjs`
- `npm run daily:dynamic`
- `node scripts/gen-tool-audit.mjs`

**Step 2: Inspect generated artifacts for old brand leakage**

Run: `git grep -n "DemumuMind\\|demumumind\\|@demumumind\\|DemumuMind" -- site/src/data audit`
Expected: only intentional legacy notes if any

### Task 8: Full verification

**Files:**
- Verify only

**Step 1: Run full test suite**

Run: `npm run test:all`
Expected: PASS

**Step 2: Run site build**

Run: `npm run build`
Workdir: `site`
Expected: PASS

**Step 3: Run selftest**

Run: `npm run kit:selftest`
Expected: PASS

**Step 4: Run smoke checks on built output**

Confirm:
- `DemumuMind` appears in built page titles/footer/nav
- canonical GitHub links use `DemumuMind/mcp-tool`
- tool/org GitHub links use `DemumuMind/*`
- canonical package text uses `@demumumind`
- canonical site URL uses `http://localhost:4321/`
- old ghost pages stay absent

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: rebrand project to DemumuMind"
```
