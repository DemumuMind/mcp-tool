# DemumuMind Rebrand Design

**Date:** 2026-03-07

## Goal

Rebrand the marketing repo, site, docs, package metadata, workflows, and generated artifacts from the existing `DemumuMind` / `demumumind` identity to the new canonical `DemumuMind` identity, while preserving only explicit legacy compatibility notes where they are operationally necessary.

## Approved Brand Contract

- Canonical public brand: `DemumuMind`
- Canonical GitHub repo: `DemumuMind/mcp-tool`
- Canonical GitHub org/tool repos: `DemumuMind/*`
- Canonical npm scope: `@demumumind`
- Temporary canonical site URL during rebrand: `http://localhost:4321/`
- Old identifiers (`DemumuMind`, `demumumind`, `@demumumind`, `DemumuMind`) are legacy-only and must not remain as the primary visible brand.

## Scope

### 1. Core Identity

Update the shared configuration surface so every consumer inherits the new identity from one place:

- `kit.config.json`
- root `package.json`
- `packages/promo-kit/package.json`

This includes title, site URL, GitHub org/profile/repo, contact email, package name, homepage, bugs URL, repository URL, and author metadata.

### 2. Site Surface

Update visible UI branding and canonical links in:

- layouts
- pages
- components
- metadata
- footer/nav text

The site must render `DemumuMind` as the primary name and point to the new canonical GitHub/npm locations.

### 3. Docs and Examples

Update README, docs, examples, and workflow guidance to use the new brand and new install commands. Old package names or URLs may remain only as migration notes, not as defaults.

### 4. Automation and Workflow Surface

Workflow files and script defaults must reference the new canonical owner/repo/package identity. This includes bot email, marketing repo URL, package install commands, and site links.

This also includes the org/tool repo defaults that currently point at `DemumuMind/*`; after the rebrand they must point at `DemumuMind/*`.

### 5. Generated and Data Artifacts

Generated site data, audit artifacts, and public build metadata must be regenerated after the brand cutover so they do not keep emitting old identifiers.

## Migration Policy

- New primary identity everywhere: `DemumuMind`, `DemumuMind/mcp-tool`, `@demumumind/*`
- Tool repository identity everywhere: `DemumuMind/*`
- Legacy values allowed only in clearly labeled migration notes such as:
  - `formerly @demumumind/promo-kit`
  - `legacy repo URL`
- No hidden mixed-brand defaults
- No automatic redirect infrastructure invented outside the repo

## Compatibility Policy

- Public docs may mention the old package name only as a historical migration note.
- Tests and fixtures may keep old values only if a given test explicitly validates backward compatibility.
- Package names and install examples must switch to `@demumumind/*` as the canonical default.

## Verification Criteria

- Grep-based scan shows no old brand as a primary string in active code/docs/config
- Root config, package metadata, site metadata, and workflows agree on the new identity
- Site pages use `http://localhost:4321/` as the temporary canonical base during the transition
- `npm run test:all` passes
- `npm run build` in `site/` passes
- `npm run kit:selftest` passes
- Smoke check on built output shows `DemumuMind` in title/meta/nav/footer and new canonical GitHub/npm links
- Any remaining old-brand occurrences are intentional legacy notes only

## Risks

- Blind string replacement can break package imports, fixture semantics, workflow URLs, and issue links.
- Package scope rename impacts docs, package metadata, CLI help text, and downstream examples at the same time.
- Generated data can silently reintroduce stale brand strings unless regeneration is part of the same batch.

## Recommended Execution Strategy

Perform the rebrand in a dedicated worktree with a config-first approach:

1. Canonical config and package metadata
2. Site surface and UI strings
3. Docs/examples/workflows
4. Generated data refresh
5. Full verification pass
