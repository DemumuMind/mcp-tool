# Placeholder Kind Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the one-style placeholder screenshot generator with a small family of type-aware templates for flagship tools.

**Architecture:** Extend `scripts/gen-placeholders.mjs` so it resolves each tool into a visual family based on `kind`, then renders family-specific SVG markup with shared typography and deterministic accents. Keep the existing flagships/overrides flow, add unit coverage around family selection and SVG output, and regenerate only placeholder screenshots.

**Tech Stack:** Node.js ESM, `sharp`, built-in `node:test`, Astro site data JSON

---

### Task 1: Lock the expected family mapping with tests

**Files:**
- Create: `tests/unit/gen-placeholders.test.mjs`
- Modify: `scripts/gen-placeholders.mjs`

**Step 1: Write the failing test**

Add tests for:
- `cli` and `library` resolving to the package/terminal family
- `mcp-server` resolving to the protocol family
- `desktop-app` and `vscode-extension` resolving to the app/window family
- rendered SVG including family-specific markers rather than a single generic layout

**Step 2: Run test to verify it fails**

Run: `node --test tests/unit/gen-placeholders.test.mjs`
Expected: FAIL because the generator does not yet export family helpers or family-specific SVG.

**Step 3: Implement minimal exports and family-aware SVG**

Add exported helpers to `scripts/gen-placeholders.mjs`:
- `resolvePlaceholderFamily(project)`
- `generateSvg(project)`

Introduce 3 visual families:
- package: `cli`, `library`, `plugin`, `template`, fallback
- protocol: `mcp-server`
- window: `desktop-app`, `vscode-extension`

**Step 4: Run test to verify it passes**

Run: `node --test tests/unit/gen-placeholders.test.mjs`
Expected: PASS

### Task 2: Regenerate flagship placeholders with the new family system

**Files:**
- Modify: `scripts/gen-placeholders.mjs`
- Update generated files under: `site/public/screenshots/*.png`

**Step 1: Dry-run the generator**

Run: `node scripts/gen-placeholders.mjs --dry-run --force`
Expected: logs show the flagship placeholders that would be regenerated.

**Step 2: Generate the updated placeholders**

Run: `node scripts/gen-placeholders.mjs --force`
Expected: placeholder PNGs rewritten for flagship tools, but real screenshots still skipped.

**Step 3: Spot-check outputs**

Visually inspect representative outputs:
- one `cli`
- one `mcp-server`
- one `desktop-app` or `vscode-extension`

### Task 3: Verify the change set

**Files:**
- Verify: `scripts/gen-placeholders.mjs`
- Verify: `tests/unit/gen-placeholders.test.mjs`
- Verify: regenerated files in `site/public/screenshots/`

**Step 1: Run focused unit tests**

Run: `node --test tests/unit/gen-placeholders.test.mjs`
Expected: PASS

**Step 2: Run broader script/unit coverage if unaffected**

Run: `npm test`
Expected: PASS, or report unrelated pre-existing failures if present.

**Step 3: Check git diff for generated asset scope**

Run: `git status --short`
Expected: script, test, plan doc, and regenerated screenshot files only for this work.
