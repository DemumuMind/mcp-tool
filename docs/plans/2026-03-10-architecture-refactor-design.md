# Architecture Refactor Design

**Date:** 2026-03-10

## Goal

Reshape the repo so the portable promotion core, repo-specific orchestration, and Astro presentation layer have explicit boundaries, a single source of truth for shared behavior, and testable seams that make future changes safer and cheaper.

## Current-State Findings

The approved design is based on these repo-specific observations:

- The repo currently has a large root-level script surface in `scripts/` while `packages/promo-kit/` already contains a partial portable-core extraction.
- Several portable-core files are duplicated between `scripts/` and `packages/promo-kit/scripts/`, and some of those copies have already diverged.
- `site/src/lib/kit.ts` reimplements kit-config loading instead of delegating to the shared core config module.
- Many Astro pages import JSON directly or read `src/data` and `public` artifacts with `fs`, so presentation code currently knows file paths, fallback behavior, and artifact layout details.

## Architectural Problem Statement

The repo does not primarily suffer from missing modules. It suffers from blurred ownership boundaries:

- portable-core behavior exists in more than one place
- repo-specific orchestration and portable-core logic are partially interleaved
- Astro pages mix presentation, data access, and file-system concerns

This increases drift risk, makes tests less targeted, and turns routine architectural changes into wide edits across unrelated surfaces.

## Evaluated Approaches

### 1. Seam-First Refactor

Keep the existing repo shape, but formalize boundaries:

- `packages/promo-kit` becomes the canonical portable core
- root `scripts/*.mjs` become repo-specific entrypoints and thin wrappers
- Astro data access moves into a dedicated `site/src/lib/content/` layer

**Pros**

- Lowest migration risk
- Works incrementally without freezing the repo
- Preserves current automation entrypoints while reducing duplication

**Cons**

- The monorepo remains broad
- Some repo-specific logic still lives at the root by design

### 2. Package-First Split

Break the repo into multiple first-class packages for core, repo orchestration, and site data/read models.

**Pros**

- Cleanest long-term package boundaries
- Strong ownership and clearer dependency graph

**Cons**

- High migration cost
- More movement than the current repo needs to realize the main architectural win

### 3. Rewrite Around a New Typed Application Layer

Introduce a new application API and gradually rewrite scripts and site surfaces around it.

**Pros**

- Highest long-term consistency and developer ergonomics

**Cons**

- Rewrite-sized effort
- Too much risk relative to the current problems

## Approved Direction

Use the **seam-first refactor**.

This addresses the real failure mode in the repo: architectural drift at the layer boundaries. It delivers the biggest improvement with the smallest risk and preserves the current operational model while making future extraction possible.

## Approved Target Architecture

### 1. `packages/promo-kit`

This package is the only canonical owner of portable-core behavior:

- config loading and normalization
- bootstrap and migration
- selftest core behavior
- portable generators and patch application logic

Anything intended to work across orgs belongs here and nowhere else.

### 2. Root `scripts/`

Root scripts become one of two things only:

- repo-specific orchestration
- thin wrappers/adapters over portable-core modules

Examples of repo-specific responsibilities:

- GitHub and registry sync
- MarketIR fetch/enrichment
- screenshots, press kits, outreach, operator surfaces
- repo-only smoke/readiness flows

Examples of wrapper responsibilities:

- preserving existing CLI shape
- translating repo-specific paths/env vars into canonical core calls
- adding compatibility behavior that is intentionally repo-scoped

### 3. `site/src/lib/content/`

Introduce a dedicated site data-access layer with stable loader APIs for:

- kit configuration
- generated JSON data
- public build artifacts
- derived page view models

This layer owns file reads, path resolution, fallback behavior, and normalization for Astro consumers.

### 4. `site/src/pages/`

Astro pages become presentation/composition only. They may call content loaders, but they should no longer:

- import `node:fs`
- walk directories directly
- hardcode `src/data/...` and `public/...` access patterns
- own normalization/fallback behavior that belongs in the content layer

## Migration Phases

### Phase 1: Stabilize the Seams

- keep existing entrypoints intact
- define the canonical ownership of core, wrappers, and site content loading
- avoid behavioral changes unless required for seam extraction

### Phase 2: Canonicalize Config and Portable Core

- remove double ownership of config parsing
- ensure portable-core logic lives only in `packages/promo-kit`
- keep root wrappers only where repo-specific adapter behavior is needed

### Phase 3: Introduce Site Content Loaders

- add `site/src/lib/content/` loader modules
- migrate selected pages off direct `fs` usage
- centralize derived page data and artifact lookup logic

### Phase 4: Consolidate Repo-Specific Services

- group reusable repo-only helpers under `scripts/lib/`
- reduce ad hoc duplication across fetch/generate/analyze scripts
- preserve CLI entrypoints while improving internal cohesion

## Migration Rules

- No big-bang rewrite
- Every batch must keep `npm test`, `npm run test:invariants`, and the site build working
- New Astro data access goes through `site/src/lib/content/*`
- New portable-core behavior goes only into `packages/promo-kit`
- Root script entrypoints may remain during migration, but only as adapters or repo-specific flows

## Testing Strategy

### Portable Core

- unit tests for canonical API behavior
- targeted contract-style tests for generators and config behavior

### Root Wrappers

- integration-style tests that confirm wrapper behavior and CLI compatibility
- explicit coverage for any repo-only translation logic

### Site Content Layer

- unit tests for file loading, fallback behavior, normalization, and derived view-model generation

### Astro Pages

- pages should be tested as presentation consumers of prepared data
- page code should not be the place where file-system behavior is tested

### Architecture Guardrails

Add tests or checks that enforce the new boundaries:

- pages must not import `node:fs`
- portable-core logic must not drift back into duplicate root copies
- config loading must resolve through one canonical implementation path

## Success Criteria

The architecture is considered corrected when:

- `packages/promo-kit` is the only source of truth for portable-core behavior
- `site/src/lib/kit.ts` is removed or reduced to a thin adapter with no local parsing logic
- Astro pages no longer directly perform file-system reads for data and build artifacts
- `scripts/` are clearly separable into wrappers, orchestration, and shared repo services
- architectural boundaries are backed by tests/guardrails instead of documentation alone

## Risks

- Over-eager extraction can change CLI behavior if wrappers are collapsed too early
- Astro build-time imports may break if cross-repo module boundaries are changed without targeted tests
- Guardrail tests added too early can create unnecessary migration drag if they forbid still-unmigrated pages

## Recommended Execution Order

1. Canonicalize config ownership
2. Add the site content-layer foundation
3. Migrate high-value pages onto content loaders
4. Convert duplicated root portable-core files into wrappers/adapters
5. Add architecture guardrails once the first migrated slices are stable
