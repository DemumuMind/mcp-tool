# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x (latest) | Yes |
| < 0.1.0 | No |

Only the latest minor release receives security fixes.

## Scope

This policy covers the repository and the portable `@demumumind/promo-kit` package separately:

- **`@demumumind/promo-kit`**: zero runtime dependencies, local-only generators, no mandatory network calls in the package runtime.
- **Repository automation and site build**: includes GitHub API calls, raw GitHub fetches for registry/MarketIR sync, generated site artifacts, and optional browser-local telemetry export.

## Dependency Posture

`@demumumind/promo-kit` has **zero runtime dependencies**. There is nothing to audit beyond the package itself. All functionality uses Node.js built-in modules (`fs`, `path`, `crypto`, `child_process`).

## Data Handling

- `@demumumind/promo-kit` keeps generated data local and does not require external services for its portable core.
- Repository automation fetches GitHub metadata, registry artifacts, and MarketIR snapshots over HTTPS.
- Browser telemetry stays in localStorage until an operator manually exports it; there is no remote telemetry sink.
- Artifacts are hashed with SHA-256 for integrity verification.
- No secrets are committed to the repo; GitHub tokens are injected through workflow environments when needed.

## Reporting a Vulnerability

If you discover a security issue, please report it privately:

1. **Email**: [demumumind@users.noreply.github.com](mailto:demumumind@users.noreply.github.com)
2. **Subject**: `[SECURITY] promo-kit -- brief description`

Please include:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment (if known)

We aim to acknowledge reports within 48 hours and provide a fix timeline within 7 days.

**Do not** open a public GitHub issue for security vulnerabilities.
