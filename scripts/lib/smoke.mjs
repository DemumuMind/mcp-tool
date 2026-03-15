export const DEGRADED_MARKETING_LABELS = new Set([
  "presskit: zip-meta-map",
  "presskit: machine-readable",
  "snippets: zip-meta-map",
  "campaign: bundle.json",
  "campaign: README.md",
  "outreach: email-partner",
  "outreach: readme-snippet",
  "partner: zip bundle",
  "partner: manifest",
  "go-link: zmm-hn",
  "go-link: zmm-github",
  "marketir evidence screenshot",
  "presskit.json contains githubFacts",
  "links.json is empty",
  "press page contains data-verified-claims",
  "outreach email contains proof links",
  "snippet contains go-link source markers",
]);

export function detectDegradedMarketingMode(linksPayload) {
  return Array.isArray(linksPayload?.links) && linksPayload.links.length === 0;
}

export function isDegradedMarketingLabel(label) {
  return DEGRADED_MARKETING_LABELS.has(label);
}

export function classifySmokeOutcome({ label, ok, degradedMarketingMode }) {
  if (ok) {
    return { level: "pass" };
  }

  if (degradedMarketingMode && isDegradedMarketingLabel(label)) {
    return { level: "warn" };
  }

  return { level: "fail" };
}
