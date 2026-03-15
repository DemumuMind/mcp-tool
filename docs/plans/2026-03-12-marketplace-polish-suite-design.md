# Marketplace Polish Suite Design

**Date:** 2026-03-12

## Goal

Finish the next marketplace polish layer after PR #11 by tightening compare-page SEO and scale behavior, expanding browse presets into first-class preset pages, improving ranking nuance, extending automated flow coverage, and bringing the remaining reference surfaces into one editorial tone.

## Current State

- `site/src/pages/compare/[left]-vs-[right].astro` renders strong side-by-side comparison pages, but compare generation still scales directly from related-tool pairs and can keep growing without an explicit cap policy.
- `site/src/pages/tools/index.astro` now supports rich filters, quick presets, saved views, and active chips, but presets are still client-side controls rather than shareable landing pages with metadata and editorial framing.
- `site/src/lib/content/marketplace.ts` owns ranking, trending, compare-pair generation, related-tool logic, and catalog rollups; this is the right seam for the next round of ranking and compare growth controls.
- Several public pages already moved into the marketplace reference tone, but some remaining secondary surfaces still need a final consistency pass.
- Automated coverage is strong at the contract/unit layer, but browse/compare/reference route flows still need stronger integration/smoke coverage around the user-visible paths added in the last two batches.

## Recommended Approach

Use a `registry-backed presentation model` instead of pushing more ad-hoc page logic into route files:

1. Extend the content layer with explicit compare-policy and preset-page models.
2. Generate capped compare pairs plus lightweight preset landing pages as static routes.
3. Keep `/tools/` as the canonical filter engine, but let preset routes act as shareable, SEO-friendly entry surfaces into the same query-driven browse state.
4. Refine ranking in-place with small, explainable score helpers instead of inventing a second ranking pipeline.
5. Tighten reference-surface tone by reusing the same marketplace framing primitives rather than adding new local page variants.

This keeps the Astro/static architecture intact, avoids introducing backend state, and uses the content layer as the single source of truth.

## Alternatives Considered

### 1. Keep everything client-side inside `/tools/`

Pros:
- Smallest diff.
- No new routes.

Cons:
- Does not solve shareable/SEO-friendly preset discovery.
- Leaves compare-page growth unmanaged.
- Makes browse UX richer but still opaque to search engines and editorial linking.

### 2. Build a separate compare index and preset micro-app

Pros:
- Maximum control over discovery flows.
- Easy to add more UI chrome later.

Cons:
- Too much surface area for the current static Astro product.
- Splits logic between multiple route families and duplicates marketplace state.

### 3. Recommended: add static preset pages and capped compare policy on top of the content layer

Pros:
- Smallest durable extension of the current architecture.
- Gives shareable preset entry pages and explicit compare scalability rules.
- Keeps ranking, presets, compare pairs, and browse behavior co-located.

Cons:
- Requires touching both the content layer and route generation.
- Needs a few more tests because behavior spans model + route + browser flows.

## Planned Changes

### Compare SEO and scale

- Add an explicit compare policy in `site/src/lib/content/marketplace.ts`:
  - cap generated compare pages per tool
  - cap total compare pages across the site
  - prefer pairs with strongest relatedness and marketplace quality
- Add canonical/supporting metadata so compare pages have:
  - stronger unique descriptions
  - deterministic page titles
  - stable canonical path generation
- Add one lightweight compare hub route for grouped discovery, instead of only pair pages.

### Browse presets and preset pages

- Promote the strongest presets into a static route family, likely under `site/src/pages/tools/presets/[slug].astro`.
- Back those routes with a preset registry from the content layer containing:
  - title
  - summary
  - default query state
  - rationale
  - CTA into `/tools/?...`
- Keep the existing client-side quick presets, but source them from the same preset registry so route pages and in-page controls stay consistent.

### Ranking refinement

- Refine the ranking helpers in `site/src/lib/content/marketplace.ts` with separate weights for:
  - hosted vs repo-backed listings
  - release cadence
  - docs maturity
- Keep the score explainable and bounded; no opaque multi-model ranking.

### Reference-layer consistency

- Identify the remaining public secondary surfaces that still read as standalone products rather than marketplace references.
- Reframe them around:
  - marketplace-first CTA
  - methodology/stats linkage
  - explicit “reference surface” positioning

### Automated coverage

- Extend invariant/unit coverage for:
  - compare caps and canonical behavior
  - preset registry semantics
  - ranking helper behavior
- Add stronger integration/smoke coverage for:
  - preset page -> browse handoff
  - compare hub -> compare pair
  - reference page navigation back into marketplace surfaces

## Risks

- Compare caps can accidentally hide good pairs if the scoring policy is too blunt.
- Preset pages can drift from `/tools/` behavior if they do not share one registry/model.
- Ranking changes can reshuffle homepage sections in surprising ways, so the scoring tests need to target behavior, not exact leaderboard snapshots.

## Success Criteria

- Compare pages are capped, canonical, and still useful.
- Browse presets exist both as in-page actions and as shareable preset routes.
- Ranking logic is measurably richer but still transparent and testable.
- Remaining reference pages read as supporting marketplace surfaces.
- Automated coverage now includes real browse/compare/reference flow protection beyond static source checks.
