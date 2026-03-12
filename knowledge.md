# Project knowledge

This file gives Codebuff context about your project: goals, commands, conventions, and gotchas.

## What this is

DemumuMind — a catalog and promotion engine for MCP (Model Context Protocol) tools. It includes:
- An **Astro static site** (marketplace) at `site/`
- A **portable promotion engine** (`packages/promo-kit/`) published as `@demumumind/promo-kit`
- **Automation scripts** in `scripts/` (data sync, promo generation, trust receipts, drift detection)
- **GitHub Actions workflows** in `.github/workflows/` for CI, deploys, and scheduled ops

## Quickstart

```bash
# Site dev server (localhost:4321)
cd site && npm install && npm run dev

# Run unit tests (from repo root)
npm test

# Run invariant tests
npm run test:invariants

# Run all tests
npm run test:all

# Build site for production
cd site && npm run build
```

## Architecture

- `site/` — Astro site; file-based routing in `site/src/pages/`, layouts in `site/src/layouts/`, components in `site/src/components/`, data in `site/src/data/`, styles in `site/src/styles/`
- `scripts/` — Node.js automation scripts (ESM `.mjs`); shared helpers in `scripts/lib/`
- `packages/promo-kit/` — Portable npm package extracting the promotion engine for external use
- `tests/unit/` — Unit tests using Node.js built-in test runner (`node --test`)
- `tests/invariants/` — Cross-referential data integrity tests
- `tests/fixtures/` — Test fixture JSON files
- `docs/` — Handbook, automation contract, ops runbook, security model, etc.
- `kit.config.json` — Central config (org name, site URL, data paths, guardrails)
- `submissions/` — Tool submission intake folder

## Conventions

- **ESM only** — all scripts use `.mjs` extension and `"type": "module"`
- **Zero runtime deps** — the root package has minimal deps (`yazl` only); site uses Astro + fonts
- **Node ≥ 22** required (promo-kit engine constraint)
- **Built-in test runner** — tests use `node --test`, not Jest/Vitest
- **No remote telemetry** — everything runs locally; no cloud deps for core functionality
- **Receipt-backed promotions** — every promo week has hashed inputs and commit SHA for verification
- **Sanitization** — HTML output is sanitized; see `scripts/lib/sanitize.mjs` and `docs/SECURITY-MODEL.md`
- **Data ownership** — automation vs. human boundaries defined in `docs/automation.md`

## Things to avoid

- Don't add runtime dependencies without strong justification
- Don't use Jest/Vitest — stick with the Node.js built-in test runner
- Don't skip invariant tests — PRs must pass `site-quality.yml` checks (unit + invariant + schema + link check + secret scan)
- Don't hardcode localhost URLs in production paths — the site deploys to GitHub Pages at `/mcp-tool/`
