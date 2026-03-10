/**
 * MarketIR lookup layer with project-data fallbacks.
 *
 * During full marketing runs, data comes from src/data/marketir.
 * On lighter checkouts the MarketIR snapshot may be absent, so public proof
 * and press surfaces fall back to curated project metadata plus audit signals.
 */

import fs from "node:fs";
import path from "node:path";
import { validateUrl } from "../../../../scripts/lib/sanitize.mjs";

function getSiteDataDir() {
  return path.join(process.cwd(), "src", "data");
}

function getMarketirDataDir() {
  return path.join(getSiteDataDir(), "marketir");
}

function getPublicDir() {
  return path.join(process.cwd(), "public");
}

function readJson(baseDir, relPath) {
  const fullPath = path.join(baseDir, relPath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch {
    return null;
  }
}

function readSiteJson(relPath) {
  return readJson(getSiteDataDir(), relPath);
}

function readMarketirJson(relPath) {
  return readJson(getMarketirDataDir(), relPath);
}

function readPublicJson(relPath) {
  return readJson(getPublicDir(), relPath);
}

function listProjectRecords() {
  return readSiteJson("projects.json") || [];
}

function listAuditProofs() {
  return readSiteJson("audit/proofs.json") || [];
}

function listReleases() {
  return readSiteJson("releases.json") || [];
}

function listOverrides() {
  return readSiteJson("overrides.json") || {};
}

function getProjectRecord(slug) {
  return listProjectRecords().find((project) => project.repo === slug) || null;
}

function getAuditProofRecord(slug) {
  return listAuditProofs().find((proof) => proof.repo === slug) || null;
}

function getLatestRelease(slug) {
  return listReleases().find((release) => release.repo === slug) || null;
}

function buildFallbackSnapshot() {
  const trustReceipt = readPublicJson("trust.json");
  const buildMeta = readPublicJson("_build.json");
  const fetchedAt = trustReceipt?.generatedAt || buildMeta?.builtAt || null;
  const lockSha256 =
    trustReceipt?.trustReceiptHash ||
    trustReceipt?.commit ||
    buildMeta?.commit ||
    "fallback";

  if (!fetchedAt && lockSha256 === "fallback") {
    return null;
  }

  return {
    sourceRepo: "project-fallback",
    branch: "main",
    lockSha256,
    fetchedAt,
  };
}

function fileExistsInPublic(relPath) {
  return fs.existsSync(path.join(getPublicDir(), relPath));
}

export function sanitizeExternalUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    return validateUrl(raw, { label: "external URL" });
  } catch {
    return null;
  }
}

function buildFallbackProofData(slug) {
  const project = getProjectRecord(slug);
  if (!project) return null;

  const auditProof = getAuditProofRecord(slug);
  const latestRelease = getLatestRelease(slug);
  const proven = [];

  if (project.install) {
    proven.push({
      id: "fallback.install",
      statement: `Install path is published: ${project.install}`,
      status: "proven",
      notes: "Derived from curated project metadata.",
      evidence: [
        {
          id: "ev.install.readme",
          type: "link",
          url: `https://github.com/DemumuMind/${slug}#readme`,
        },
      ],
    });
  }

  if (latestRelease?.url && latestRelease?.tag) {
    proven.push({
      id: "fallback.release",
      statement: `Latest tagged release is ${latestRelease.tag}.`,
      status: "proven",
      notes: "Derived from the release feed.",
      evidence: [
        {
          id: "ev.release.tag",
          type: "link",
          url: latestRelease.url,
        },
      ],
    });
  }

  if (auditProof?.proofs?.length > 0) {
    proven.push({
      id: "fallback.audit",
      statement: `Detected build signals: ${auditProof.proofs.join(", ")}.`,
      status: "proven",
      notes: auditProof.verified ? "Marked verified in the audit snapshot." : "Derived from the audit snapshot.",
      evidence: [
        {
          id: "ev.audit.repo",
          type: "link",
          url: `https://github.com/DemumuMind/${slug}`,
        },
      ],
    });
  }

  const aspirational = (project.goodFor || []).map((item, index) => ({
    id: `fallback.goodfor.${index}`,
    statement: item,
    status: "aspirational",
    notes: "Editorial positioning from project metadata.",
    evidence: [],
  }));

  const antiClaims = (project.notFor || []).map((item) => ({ statement: item }));

  return {
    proven,
    aspirational,
    antiClaims,
  };
}

function buildFallbackPressData(slug) {
  const project = getProjectRecord(slug);
  if (!project) return null;

  return {
    boilerplate: {
      projectDescription: project.description || project.tagline || "",
      founderBio: null,
      preferredNouns: [project.name, project.kind].filter(Boolean),
      forbiddenPhrases: [],
    },
    quotes: [],
    comparables: [],
    partnerOffers: [],
    contacts: [
      {
        method: "GitHub",
        value: `https://github.com/DemumuMind/${slug}`,
        label: `${project.name} repository`,
      },
    ],
  };
}

function buildFallbackTool(slug) {
  const project = getProjectRecord(slug);
  if (!project) return null;

  return {
    name: project.name,
    positioning: {
      oneLiner: project.tagline || project.description || "",
    },
    press: buildFallbackPressData(slug),
  };
}

/**
 * Load the full snapshot metadata (sourceRepo, branch, lockSha256, fetchedAt).
 */
export function loadSnapshot() {
  return readMarketirJson("marketir.snapshot.json") || buildFallbackSnapshot();
}

export function getSnapshotMeta(snapshot) {
  if (snapshot?.sourceRepo === "project-fallback") {
    return {
      sourceLabel: "Project metadata",
      snapshotLabel: "Project metadata snapshot",
      lockLabel: "Project metadata lock",
    };
  }

  return {
    sourceLabel: "MarketIR",
    snapshotLabel: "MarketIR snapshot",
    lockLabel: "MarketIR lock",
  };
}

/**
 * Load the evidence manifest and return a Map of evidenceId -> entry.
 */
export function loadEvidenceMap() {
  const manifest = readMarketirJson("manifests/evidence.manifest.json");
  if (!manifest?.entries) return new Map();

  const evidenceMap = new Map();
  for (const entry of manifest.entries) {
    evidenceMap.set(entry.id, entry);
  }
  return evidenceMap;
}

/**
 * Load a tool by slug from MarketIR or curated fallback data.
 */
export function getToolBySlug(slug) {
  return readMarketirJson(`data/tools/${slug}.json`) || buildFallbackTool(slug);
}

/**
 * Get proven claims for a tool, with evidence entries resolved.
 * Returns { proven: [], aspirational: [], antiClaims: [] } or null.
 */
export function getProofData(slug) {
  const tool = readMarketirJson(`data/tools/${slug}.json`);
  if (!tool) {
    return buildFallbackProofData(slug);
  }

  const evidenceMap = loadEvidenceMap();
  const proven = [];
  const aspirational = [];

  for (const claim of tool.claims || []) {
    const resolved = {
      id: claim.id,
      statement: claim.statement,
      status: claim.status,
      notes: claim.notes || null,
      evidence: [],
    };

    for (const reference of claim.evidenceRefs || []) {
      const evidence = evidenceMap.get(reference);
      if (evidence) {
        resolved.evidence.push({
          ...evidence,
          url: sanitizeExternalUrl(evidence.url),
        });
      }
    }

    if (claim.status === "proven") {
      proven.push(resolved);
    } else if (claim.status === "aspirational") {
      aspirational.push(resolved);
    }
  }

  return {
    proven,
    aspirational,
    antiClaims: tool.antiClaims || [],
  };
}

/**
 * Get the press block for a tool, or null if it has none.
 */
export function getPressData(slug) {
  const tool = getToolBySlug(slug);
  if (!tool?.press) return null;

  return {
    ...tool.press,
    contacts: (tool.press.contacts || []).map((contact) => ({
      ...contact,
      href: sanitizeExternalUrl(contact.value),
    })),
  };
}

export function getPublicAssetLinks(slug) {
  const candidates = [
    { kind: "presskit", label: "Press kit", href: `/presskit/${slug}/`, publicPath: `presskit/${slug}/index.html` },
    { kind: "machine-readable", label: "Machine-readable", href: `/presskit/${slug}/presskit.json`, publicPath: `presskit/${slug}/presskit.json` },
    { kind: "outreach", label: "Outreach pack", href: `/outreach/${slug}/email-partner.md`, publicPath: `outreach/${slug}/email-partner.md` },
    { kind: "partners", label: "Partner bundle", href: `/partners/${slug}/partner-pack.zip`, publicPath: `partners/${slug}/partner-pack.zip` },
  ];

  return candidates.filter((candidate) => fileExistsInPublic(candidate.publicPath));
}

/**
 * Get all tool slugs that have a usable press block.
 * Returns [{ slug, tool }].
 */
export function getToolsWithPress() {
  const marketirIndex = readMarketirJson("data/marketing.index.json");
  if (marketirIndex?.tools) {
    const results = [];
    for (const { ref } of marketirIndex.tools) {
      const slug = ref.replace("tools/", "").replace(".json", "");
      const tool = readMarketirJson(`data/${ref}`);
      if (tool?.press) {
        results.push({ slug, tool });
      }
    }
    return results;
  }

  return listProjectRecords()
    .filter((project) => project.publicProof === true || listOverrides()[project.repo]?.publicProof === true)
    .map((project) => ({
      slug: project.repo,
      tool: getToolBySlug(project.repo),
    }))
    .filter((entry) => entry.tool?.press);
}
