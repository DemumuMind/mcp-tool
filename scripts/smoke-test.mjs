#!/usr/bin/env node

/**
 * Smoke test for the configured public site URL.
 *
 * Checks that key pages and legacy redirects respond correctly.
 * Run manually or from CI after deploy.
 *
 * Usage:
 *   node scripts/smoke-test.mjs
 *   node scripts/smoke-test.mjs http://127.0.0.1:4321
 */

import { getSiteUrl } from "./lib/config.mjs";
import { classifySmokeOutcome } from "./lib/smoke.mjs";

const BASE = (() => {
  const raw = process.argv[2] || process.env.PUBLIC_SITE_URL || getSiteUrl();
  return raw.endsWith("/") ? raw : `${raw}/`;
})();

function resolveFromBase(pathname = "/") {
  const relativePath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return new URL(relativePath, BASE).toString();
}

const CHECKS = [
  { url: "/", expect: 200, label: "homepage" },
  { url: "/tools/", expect: 200, label: "tools index" },
  { url: "/tools/zip-meta-map/", expect: 200, label: "zip-meta-map tool page" },
  { url: "/releases/", expect: 200, label: "releases page" },
  { url: "/about/", expect: 200, label: "about page" },
  { url: "/trust/", expect: 200, label: "trust page" },
  { url: "/support/", expect: 200, label: "support page" },
  { url: "/submit/queue/", expect: 200, label: "submission queue" },
  { url: "/brain-dev.html", expect: 200, label: "legacy: brain-dev.html" },
  { url: "/registry.html", expect: 200, label: "legacy: registry.html" },
  { url: "/voice-soundboard.html", expect: 200, label: "legacy: voice-soundboard.html" },
  { url: "/trust.json", expect: 200, label: "trust receipt JSON" },
  { url: "/presskit/zip-meta-map/", expect: 200, label: "presskit: zip-meta-map" },
  { url: "/presskit/zip-meta-map/presskit.json", expect: 200, label: "presskit: machine-readable" },
  { url: "/snippets/zip-meta-map.md", expect: 200, label: "snippets: zip-meta-map" },
  { url: "/campaigns/zip-meta-map-launch/bundle.json", expect: 200, label: "campaign: bundle.json" },
  { url: "/campaigns/zip-meta-map-launch/README.md", expect: 200, label: "campaign: README.md" },
  { url: "/press/", expect: 200, label: "press index" },
  { url: "/press/zip-meta-map/", expect: 200, label: "press: zip-meta-map" },
  { url: "/proof/", expect: 200, label: "proof index" },
  { url: "/proof/zip-meta-map/", expect: 200, label: "proof: zip-meta-map" },
  { url: "/outreach/zip-meta-map/email-partner.md", expect: 200, label: "outreach: email-partner" },
  { url: "/outreach/zip-meta-map/github-readme-snippet.md", expect: 200, label: "outreach: readme-snippet" },
  { url: "/partners/zip-meta-map/partner-pack.zip", expect: 200, label: "partner: zip bundle" },
  { url: "/partners/zip-meta-map/manifest.json", expect: 200, label: "partner: manifest" },
  { url: "/go/zmm-hn/", expect: 200, label: "go-link: zmm-hn" },
  { url: "/go/zmm-github/", expect: 200, label: "go-link: zmm-github" },
  { url: "/favicon.svg", expect: 200, label: "favicon" },
  { url: "/screenshots/zip-meta-map.png", expect: 200, label: "zip-meta-map screenshot" },
  { url: "/marketir/evidence/zip-meta-map-dashboard.png", expect: 200, label: "marketir evidence screenshot" },
];

let passed = 0;
let failed = 0;
let warned = 0;

function recordOutcome({ label, ok, successMessage, failureMessage, degradedMarketingMode }) {
  const outcome = classifySmokeOutcome({ label, ok, degradedMarketingMode });
  if (outcome.level === "pass") {
    console.log(`  PASS ${successMessage}`);
    passed++;
    return;
  }

  if (outcome.level === "warn") {
    console.warn(`  WARN ${failureMessage} (degraded marketing mode)`);
    warned++;
    return;
  }

  console.error(`  FAIL ${failureMessage}`);
  failed++;
}

const degradedMarketingMode = false;

for (const check of CHECKS) {
  const url = resolveFromBase(check.url);
  try {
    const res = await fetch(url, { redirect: "follow" });
    recordOutcome({
      label: check.label,
      ok: res.status === check.expect,
      successMessage: `${check.label} (${res.status})`,
      failureMessage: `${check.label}: expected ${check.expect}, got ${res.status}`,
      degradedMarketingMode,
    });
  } catch (err) {
    recordOutcome({
      label: check.label,
      ok: false,
      successMessage: check.label,
      failureMessage: `${check.label}: ${err.message}`,
      degradedMarketingMode,
    });
  }
}

try {
  const proofRes = await fetch(resolveFromBase("/tools/zip-meta-map/"));
  if (proofRes.ok) {
    const html = await proofRes.text();
    if (html.includes("data-proof-section")) {
      console.log("  PASS zip-meta-map Public Proof section present");
      passed++;
    } else {
      console.error("  FAIL zip-meta-map Public Proof section missing");
      failed++;
    }
  } else {
    console.error(`  FAIL zip-meta-map page returned ${proofRes.status}`);
    failed++;
  }
} catch (err) {
  console.error(`  FAIL Public Proof check failed: ${err.message}`);
  failed++;
}

try {
  const pkRes = await fetch(resolveFromBase("/presskit/zip-meta-map/presskit.json"));
  if (pkRes.ok) {
    const pk = await pkRes.json();
    recordOutcome({
      label: "presskit.json contains githubFacts",
      ok: Boolean(pk.githubFacts && pk.githubFacts.observedAt),
      successMessage: "presskit.json contains githubFacts",
      failureMessage: "presskit.json missing githubFacts",
      degradedMarketingMode,
    });
  } else {
    recordOutcome({
      label: "presskit: machine-readable",
      ok: false,
      successMessage: "presskit.json contains githubFacts",
      failureMessage: `presskit.json returned ${pkRes.status}`,
      degradedMarketingMode,
    });
  }
} catch (err) {
  recordOutcome({
    label: "presskit.json contains githubFacts",
    ok: false,
    successMessage: "presskit.json contains githubFacts",
    failureMessage: `presskit githubFacts check failed: ${err.message}`,
    degradedMarketingMode,
  });
}

try {
  const pressRes = await fetch(resolveFromBase("/press/zip-meta-map/"));
  if (pressRes.ok) {
    const html = await pressRes.text();
    recordOutcome({
      label: "press page contains data-verified-claims",
      ok: html.includes("data-verified-claims"),
      successMessage: "press page contains data-verified-claims",
      failureMessage: "press page missing data-verified-claims",
      degradedMarketingMode,
    });
  } else {
    console.error(`  FAIL press page returned ${pressRes.status}`);
    failed++;
  }
} catch (err) {
  console.error(`  FAIL press page check failed: ${err.message}`);
  failed++;
}

try {
  const outreachRes = await fetch(resolveFromBase("/outreach/zip-meta-map/email-partner.md"));
  if (outreachRes.ok) {
    const text = await outreachRes.text();
    recordOutcome({
      label: "outreach email contains proof links",
      ok: text.includes("proof:") || text.includes(resolveFromBase("/press/")),
      successMessage: "outreach email contains proof links",
      failureMessage: "outreach email missing proof links",
      degradedMarketingMode,
    });
  } else {
    recordOutcome({
      label: "outreach: email-partner",
      ok: false,
      successMessage: "outreach email contains proof links",
      failureMessage: `outreach email returned ${outreachRes.status}`,
      degradedMarketingMode,
    });
  }
} catch (err) {
  recordOutcome({
    label: "outreach email contains proof links",
    ok: false,
    successMessage: "outreach email contains proof links",
    failureMessage: `outreach proof link check failed: ${err.message}`,
    degradedMarketingMode,
  });
}

try {
  const snippetRes = await fetch(resolveFromBase("/snippets/zip-meta-map.md"));
  if (snippetRes.ok) {
    const text = await snippetRes.text();
    recordOutcome({
      label: "snippet contains go-link source markers",
      ok: text.includes(resolveFromBase("/go/")),
      successMessage: "snippet contains go-link source markers",
      failureMessage: "snippet missing go-link source markers",
      degradedMarketingMode,
    });
  } else {
    recordOutcome({
      label: "snippets: zip-meta-map",
      ok: false,
      successMessage: "snippet contains go-link source markers",
      failureMessage: `snippet returned ${snippetRes.status}`,
      degradedMarketingMode,
    });
  }
} catch (err) {
  recordOutcome({
    label: "snippet contains go-link source markers",
    ok: false,
    successMessage: "snippet contains go-link source markers",
    failureMessage: `snippet source marker check failed: ${err.message}`,
    degradedMarketingMode,
  });
}

try {
  const targetsRes = await fetch(resolveFromBase("/targets/zip-meta-map/targets.json"));
  if (targetsRes.ok) {
    const data = await targetsRes.json();
    if (data.candidates && data.candidates.length > 0) {
      console.log(`  PASS targets.json: ${data.candidates.length} candidates (scoring v${data.scoringVersion})`);
    } else {
      console.warn("  WARN targets.json exists but has no candidates");
    }
  } else if (targetsRes.status === 404) {
    console.warn("  WARN targets.json not generated yet (404) - run gen-targets.mjs");
  } else {
    console.warn(`  WARN targets.json returned ${targetsRes.status}`);
  }
} catch (err) {
  console.warn(`  WARN targets check skipped: ${err.message}`);
}

try {
  const buildRes = await fetch(resolveFromBase("/_build.json"));
  if (buildRes.ok) {
    const build = await buildRes.json();
    console.log("\n  Build metadata:");
    console.log(`    commit:  ${build.commit}`);
    console.log(`    built:   ${build.builtAt}`);
    console.log(`    synced:  ${build.syncedAt || "n/a"}`);
    console.log(`    projects: ${build.projects}`);

    const age = Date.now() - new Date(build.builtAt).getTime();
    const hours = Math.round(age / 3600000);
    if (hours > 24) {
      console.warn(`    WARN Build is ${hours}h old`);
    } else {
      console.log(`    age: ${hours}h`);
      passed++;
    }
  } else {
    console.warn(`\n  WARN _build.json not found (${buildRes.status}) - skipping freshness check`);
  }
} catch (err) {
  console.warn(`\n  WARN _build.json check failed: ${err.message}`);
}

try {
  const securityPages = ["/", "/tools/", "/press/zip-meta-map/"];
  const dangerous = /(?:href|src|action)\s*=\s*["']?\s*(?:javascript|data|vbscript):/gi;
  let issues = 0;

  for (const page of securityPages) {
    try {
      const res = await fetch(resolveFromBase(page));
      if (!res.ok) {
        continue;
      }

      const html = await res.text();
      dangerous.lastIndex = 0;
      const matches = html.match(dangerous);
      if (matches) {
        console.warn(`  WARN ${page}: ${matches.length} dangerous URL(s) found`);
        issues += matches.length;
      }
    } catch {
      // Ignore individual page failures in the warning-only scan.
    }
  }

  if (issues === 0) {
    console.log(`  PASS security scan: no dangerous protocols in ${securityPages.length} sampled pages`);
  }
} catch (err) {
  console.warn(`  WARN security scan skipped: ${err.message}`);
}

console.log(`\n${passed} passed, ${failed} failed, ${warned} warned out of ${CHECKS.length + 5} checks (+ target/security warnings above)`);
if (failed > 0) {
  process.exit(1);
}
