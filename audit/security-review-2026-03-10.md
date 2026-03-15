# Security Review 2026-03-10

Repo-wide security review covering `site/`, `scripts/`, `packages/promo-kit/`, and `.github/workflows/`.

## Source-to-Sink Map

| Source | Trust | Sink | Current control | Verdict |
|--------|-------|------|-----------------|---------|
| GitHub API + raw GitHub content | Low | Generated HTML/JSON/Markdown | `htmlEsc`, `escapeXml`, `validateUrl`, fixture tests | Safe with current controls |
| `workflow_dispatch` inputs (`patch_json`, `reason`, `mode`) | Low | Shell `run:` blocks and PR metadata | Env binding before shell, JSON validation in Node entrypoints, workflow policy tests | Remediated |
| `promo-queue.json` slug entries | Medium | Generator subprocess invocation | `execFileSync` argument passing without shell interpolation | Remediated |
| Browser localStorage telemetry | Low | `/lab/telemetry-export/` preview table | `textContent`-based DOM node construction, manual export only | Remediated |
| Operator JSON patches | Medium | `site/src/data/*.json` writes in `apply-control-patch` / `apply-submission-status` | Allowed-file lists, protected-field checks, value validators, regression tests | Safe with current controls |
| `promo-kit` CLI args | Medium | Child-process execution in `promo-kit` bin | `fork()` of fixed local script paths, no shell-built commands | Safe with current controls |
| `KIT_CONFIG` env var | Medium | Portable root/path resolution | `resolve()` + existence checks, operator-scoped trust boundary, config validation tests | Acceptable residual risk |
| Repo-authored content and snapshots | Medium | Static site HTML/redirect/link output | Shared sanitizer library, protocol allowlist, XSS fixture tests, link-safety invariants | Safe with current controls |
| GitHub Actions third-party refs | Medium | CI/CD execution | Full SHA pinning + workflow hardening test | Remediated |

## Reviewed Sink Inventory

| Sink class | Examples reviewed | Verdict |
|------------|-------------------|---------|
| Shell / process execution | `scripts/gen-promo.mjs`, workflow PR body generation, `promo-kit` bin/selftest | Remediated where untrusted data crossed the boundary; remaining `promo-kit` usage is fixed-path/operator-scoped |
| File writes | patch/status workflows, generators writing site data, portable kit seed/migration writes | Safe with current controls under operator trust boundary |
| HTML / Markdown generation | presskits, go links, snippets, outreach artifacts, audit pages | Safe with current controls where shared escaping/URL validation is used |
| DOM rendering | `/lab/telemetry-export/` preview | Remediated to DOM-node construction without `innerHTML` |
| Workflow tokens / permissions | write-capable automation and PR-creation jobs | Safe with current controls after input routing and SHA pinning changes |

## Findings Matrix

| ID | Severity | Surface | Exploit path | Current control | Fix | Release-blocking | Status |
|----|----------|---------|--------------|-----------------|-----|------------------|--------|
| F-01 | High | `scripts/gen-promo.mjs` | Malicious slug value reached `execSync` shell command via `promo-queue.json` | None on shell boundary | Replaced shell command construction with `execFileSync(process.execPath, [script, "--slugs", value])` and added regression test | Yes | Fixed |
| F-02 | High | `apply-control-patch.yml`, `apply-submission-status.yml` | Direct `${{ inputs.* }}` interpolation inside `run:` blocks could break shell quoting in write-capable workflows | JSON validation happened after shell boundary | Routed inputs through `env:`, invoked Node with quoted env vars, built PR bodies from temp files, added workflow policy test | Yes | Fixed |
| F-03 | Medium | `/lab/telemetry-export/` | Poisoned localStorage event data rendered into preview table | Event type allowlist only on normal writes | Switched preview rendering to DOM node construction with `textContent`; added regression test preventing `innerHTML` use | No | Fixed |
| F-04 | Medium | Multiple workflows | Actions referenced by movable tags (`@v4`) instead of immutable SHAs | Partial pinning only | Pinned remaining `checkout`, `setup-node`, and `cache` usages; added repo-wide pinning test | No | Fixed |
| F-05 | Low | README / security docs | Docs understated network and telemetry surfaces, which can mislead operators | Existing docs partly accurate for package, not full repo | Updated root docs and security model to reflect repo automation, local telemetry, and workflow input policy | No | Fixed |

## Reviewed Without Change

| Surface | Reason no code change was needed |
|---------|----------------------------------|
| `packages/promo-kit/bin/promo-kit.mjs` | Uses `fork()` with fixed package-local script paths instead of shell-built commands; `KIT_CONFIG` handling is operator-scoped and covered by config tests. |
| `packages/promo-kit/scripts/kit-selftest.mjs` | Still uses `execSync`, but only against fixed internal script lists and project-local commands; no untrusted external values were found crossing into shell command construction in the reviewed paths. |
| Shared sanitizer flow in `scripts/lib/sanitize.mjs` consumers | Existing XSS and URL allowlist coverage already matched the reviewed generator sinks on `main`. |

## Remediation Backlog

### Immediate

- None remaining from this pass. The release-blocking findings in shell execution and write-capable workflow input handling were remediated in this review.

### Follow-up Hardening

- Add a lightweight policy test for new inline DOM sinks outside telemetry preview, so future `innerHTML` usage requires an explicit review.
- Consider moving more workflow shell logic behind testable Node entrypoints, following the new PR-body helper pattern.
- Consider a generated audit artifact in CI that summarizes write-capable workflows, permissions, and pinned action refs for operator review.
- Evaluate whether GitHub Pages deployment should add any host-supported security header documentation or a published constraints note for CSP/HSTS limits.

## Verification

- Targeted regression suite:
- `node --test tests/unit/gen-promo.test.mjs tests/unit/telemetry-preview.test.mjs tests/unit/workflow-security-hardening.test.mjs`
  - plus `tests/unit/workflow-pr-body.test.mjs` for PR-body handling
- Existing security baseline:
  - `node --test tests/unit/sanitize.test.mjs tests/unit/html-output-safety.test.mjs tests/unit/validate-submissions.test.mjs tests/unit/apply-control-patch.test.mjs tests/unit/apply-submission-status.test.mjs tests/invariants/site-link-safety.test.mjs`
- Dependency posture:
  - `npm audit --omit=dev --json`
  - `npm audit --omit=dev --json` in `site/`
