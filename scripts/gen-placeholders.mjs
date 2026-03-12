#!/usr/bin/env node

/**
 * Placeholder Screenshot Generator
 *
 * Generates typed placeholder PNGs and updates overrides.json with
 * screenshot + screenshotType fields.
 *
 * Usage:
 *   node scripts/gen-placeholders.mjs
 *   node scripts/gen-placeholders.mjs --dry-run
 *   node scripts/gen-placeholders.mjs --force
 *   node scripts/gen-placeholders.mjs --all-front-door --force
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeXml } from "./lib/sanitize.mjs";
import { resolveSiteUrl } from "./lib/config.mjs";
import { getToolStatus, loadRegistry as loadFrontDoorRegistry } from "./lib/front-door.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SITE_DATA = path.join(ROOT, "site", "src", "data");
const SCREENSHOTS_DIR = path.join(ROOT, "site", "public", "screenshots");
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const ALL_FRONT_DOOR = process.argv.includes("--all-front-door");

const WIDTH = 1280;
const HEIGHT = 640;

const BG = "#0d1117";
const BG_SURFACE = "#161b22";
const BORDER = "#30363d";
const TEXT = "#e6edf3";
const TEXT_MUTED = "#8b949e";
const SUCCESS = "#3fb950";
const WARN = "#d29922";
const DANGER = "#f85149";

const FAMILY_THEMES = {
  package: {
    accent: "#d29922",
    secondary: "#58a6ff",
    label: "Package Surface",
  },
  protocol: {
    accent: "#58a6ff",
    secondary: "#3fb950",
    label: "Protocol Surface",
  },
  window: {
    accent: "#a371f7",
    secondary: "#79c0ff",
    label: "Window Surface",
  },
};

const FIELD_ORDER = [
  "featured",
  "tags",
  "category",
  "stability",
  "kind",
  "install",
  "tagline",
  "goodFor",
  "notFor",
  "screenshot",
  "screenshotType",
  "needsHumanReview",
];

function loadJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(SITE_DATA, filename), "utf8"));
}

function selectFlagships(projects, collections, ignoreList) {
  const ignored = new Set(ignoreList);
  const collectionRepos = new Set();

  for (const collection of collections) {
    for (const repo of collection.repos) {
      if (!ignored.has(repo)) collectionRepos.add(repo);
    }
  }

  const flagships = new Set(collectionRepos);

  for (const project of projects) {
    if (project.featured && !ignored.has(project.repo)) {
      flagships.add(project.repo);
    }
  }

  const byStars = [...projects]
    .filter((project) => !ignored.has(project.repo))
    .sort((a, b) => (b.stars || 0) - (a.stars || 0));

  for (const project of byStars.slice(0, 10)) {
    flagships.add(project.repo);
  }

  return flagships;
}

function normalizeLookupKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function buildFrontDoorPlaceholderTargets({ projects, registry, overrides }) {
  const projectMap = new Map();

  for (const project of projects) {
    for (const key of [project.repo, project.name]) {
      const normalized = normalizeLookupKey(key);
      if (normalized && !projectMap.has(normalized)) {
        projectMap.set(normalized, project);
      }
    }
  }

  const targets = [];

  for (const tool of registry) {
    const matchedProject = projectMap.get(normalizeLookupKey(tool.id));
    const fallbackProject = {
      name: tool.name || tool.id,
      repo: tool.id,
      description: tool.description || "",
      tagline: tool.description || "",
      install: "",
      kind: "",
      stability: "experimental",
    };
    const project = matchedProject || fallbackProject;
    const override = overrides[project.repo] || overrides[tool.id] || {};
    const { isInternal } = getToolStatus(tool.id, tool, override);
    if (isInternal) continue;

    const screenshot = override.screenshot || `/screenshots/${tool.id}.png`;
    targets.push({
      id: tool.id,
      project,
      overrideKey: overrides[project.repo] ? project.repo : tool.id,
      outputName: path.basename(screenshot),
      override,
    });
  }

  targets.sort((a, b) => a.id.localeCompare(b.id));
  return targets;
}

function stabilityColor(stability) {
  if (stability === "stable") return SUCCESS;
  if (stability === "beta") return WARN;
  if (stability === "experimental") return DANGER;
  return TEXT_MUTED;
}

function truncate(str, max) {
  if (!str || str.length <= max) return str || "";
  return str.slice(0, max - 1) + "\u2026";
}

function wrapText(str, max = 44) {
  if (!str) return [];

  const words = str.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 2);
}

export function resolvePlaceholderFamily(project) {
  switch (project?.kind) {
    case "mcp-server":
      return "protocol";
    case "desktop-app":
    case "vscode-extension":
      return "window";
    default:
      return "package";
  }
}

function resolveFamilyTheme(project) {
  return FAMILY_THEMES[resolvePlaceholderFamily(project)] || FAMILY_THEMES.package;
}

export function shouldGeneratePlaceholder({ hasFile, hasReal, force }) {
  if (hasReal) return false;
  if (force) return true;
  return !hasFile;
}

function renderFamilyChrome(theme) {
  if (theme.label === "Protocol Surface") {
    return `
    <g data-family="protocol">
      <text x="108" y="106" font-family="'Courier New', monospace" font-size="12" letter-spacing="1.1" fill="${TEXT_MUTED}">${theme.label}</text>
      <path d="M 118 172 C 200 146, 290 150, 366 186" fill="none" stroke="${theme.accent}" stroke-width="2" opacity="0.55"/>
      <path d="M 942 458 C 1022 418, 1108 416, 1180 446" fill="none" stroke="${theme.secondary}" stroke-width="2" opacity="0.5"/>
      <circle cx="138" cy="166" r="9" fill="${theme.accent}" opacity="0.78"/>
      <circle cx="250" cy="150" r="11" fill="${theme.secondary}" opacity="0.74"/>
      <circle cx="366" cy="186" r="9" fill="${theme.accent}" opacity="0.7"/>
      <circle cx="942" cy="458" r="8" fill="${theme.accent}" opacity="0.72"/>
      <circle cx="1060" cy="416" r="11" fill="${theme.secondary}" opacity="0.74"/>
      <circle cx="1180" cy="446" r="9" fill="${theme.accent}" opacity="0.68"/>
      <rect x="100" y="196" width="210" height="88" rx="12" fill="${BG}" fill-opacity="0.55" stroke="${theme.accent}" stroke-opacity="0.35"/>
      <rect x="968" y="336" width="212" height="90" rx="12" fill="${BG}" fill-opacity="0.52" stroke="${theme.secondary}" stroke-opacity="0.32"/>
    </g>`;
  }

  if (theme.label === "Window Surface") {
    return `
    <g data-family="window">
      <text x="108" y="106" font-family="'Courier New', monospace" font-size="12" letter-spacing="1.1" fill="${TEXT_MUTED}">${theme.label}</text>
      <rect x="96" y="134" width="248" height="164" rx="14" fill="${BG}" fill-opacity="0.56" stroke="${theme.accent}" stroke-opacity="0.35"/>
      <rect x="96" y="134" width="248" height="26" rx="14" fill="${theme.accent}" fill-opacity="0.08"/>
      <circle cx="122" cy="147" r="4" fill="${theme.accent}" opacity="0.8"/>
      <circle cx="138" cy="147" r="4" fill="${theme.secondary}" opacity="0.75"/>
      <circle cx="154" cy="147" r="4" fill="${WARN}" opacity="0.78"/>
      <rect x="116" y="178" width="56" height="90" rx="8" fill="${theme.accent}" fill-opacity="0.08"/>
      <rect x="188" y="184" width="128" height="10" rx="4" fill="${TEXT_MUTED}" fill-opacity="0.42"/>
      <rect x="188" y="208" width="114" height="10" rx="4" fill="${TEXT_MUTED}" fill-opacity="0.22"/>
      <rect x="188" y="232" width="104" height="10" rx="4" fill="${TEXT_MUTED}" fill-opacity="0.22"/>
      <rect x="952" y="344" width="232" height="146" rx="14" fill="${BG}" fill-opacity="0.5" stroke="${theme.secondary}" stroke-opacity="0.3"/>
      <rect x="952" y="344" width="232" height="26" rx="14" fill="${theme.secondary}" fill-opacity="0.08"/>
      <rect x="972" y="388" width="80" height="12" rx="5" fill="${TEXT_MUTED}" fill-opacity="0.28"/>
      <rect x="972" y="412" width="150" height="10" rx="4" fill="${TEXT_MUTED}" fill-opacity="0.18"/>
      <rect x="972" y="434" width="134" height="10" rx="4" fill="${TEXT_MUTED}" fill-opacity="0.18"/>
    </g>`;
  }

  return `
    <g data-family="package">
      <text x="108" y="106" font-family="'Courier New', monospace" font-size="12" letter-spacing="1.1" fill="${TEXT_MUTED}">${theme.label}</text>
      <rect x="96" y="138" width="250" height="136" rx="14" fill="${BG}" fill-opacity="0.56" stroke="${theme.accent}" stroke-opacity="0.34"/>
      <rect x="96" y="138" width="250" height="24" rx="14" fill="${theme.accent}" fill-opacity="0.07"/>
      <circle cx="122" cy="150" r="4" fill="${theme.accent}" opacity="0.8"/>
      <circle cx="138" cy="150" r="4" fill="${theme.secondary}" opacity="0.72"/>
      <circle cx="154" cy="150" r="4" fill="${WARN}" opacity="0.8"/>
      <rect x="118" y="188" width="96" height="12" rx="4" fill="${TEXT_MUTED}" fill-opacity="0.34"/>
      <rect x="118" y="214" width="170" height="10" rx="4" fill="${TEXT_MUTED}" fill-opacity="0.18"/>
      <rect x="118" y="236" width="142" height="10" rx="4" fill="${TEXT_MUTED}" fill-opacity="0.18"/>
      <rect x="958" y="374" width="224" height="74" rx="12" fill="${BG}" fill-opacity="0.5" stroke="${theme.secondary}" stroke-opacity="0.28"/>
      <text x="980" y="404" font-family="'Courier New', monospace" font-size="13" fill="${TEXT_MUTED}">$ install package</text>
      <rect x="980" y="418" width="128" height="8" rx="4" fill="${TEXT_MUTED}" fill-opacity="0.18"/>
    </g>`;
}

export function generateSvg(project) {
  const name = escapeXml(project.name || project.repo);
  const family = resolvePlaceholderFamily(project);
  const theme = resolveFamilyTheme(project);
  const taglineLines = wrapText(
    truncate(project.tagline || project.description || "", 92),
    family === "window" ? 38 : 44,
  );
  const install = project.install ? escapeXml(project.install) : null;
  const stability = project.stability || "experimental";
  const stabColor = stabilityColor(stability);
  const kind = project.kind ? escapeXml(project.kind) : null;
  const url = escapeXml(resolveSiteUrl(`/tools/${project.repo}/`));

  let y = 180;

  const nameEl = `<text x="640" y="${y}" text-anchor="middle" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" font-size="48" font-weight="700" fill="${TEXT}">${name}</text>`;
  y += 60;

  const taglineEl =
    taglineLines.length > 0
      ? `<text x="640" y="${y}" text-anchor="middle" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" font-size="22" fill="${TEXT_MUTED}">${taglineLines
          .map(
            (line, index) =>
              `<tspan x="640" dy="${index === 0 ? 0 : 26}">${escapeXml(line)}</tspan>`,
          )
          .join("")}</text>`
      : "";
  if (taglineLines.length > 0) {
    y += 50 + (taglineLines.length - 1) * 24;
  }

  const badges = [];
  const badgeY = y + 5;
  const stabText = escapeXml(stability.toUpperCase());
  const stabWidth = stability.length * 10 + 20;
  badges.push({ text: stabText, color: stabColor, bg: stabColor + "1a", width: stabWidth });

  if (kind) {
    const kindText = escapeXml(kind.toUpperCase());
    const kindWidth = kind.length * 10 + 20;
    badges.push({ text: kindText, color: TEXT_MUTED, bg: TEXT_MUTED + "1a", width: kindWidth });
  }

  const totalBadgeWidth = badges.reduce((sum, badge) => sum + badge.width + 12, -12);
  let badgeX = 640 - totalBadgeWidth / 2;
  const badgeEls = badges
    .map((badge) => {
      const result =
        `<rect x="${badgeX}" y="${badgeY - 16}" width="${badge.width}" height="26" rx="4" fill="${badge.bg}"/>` +
        `<text x="${badgeX + badge.width / 2}" y="${badgeY + 3}" text-anchor="middle" font-family="'Courier New', monospace" font-size="13" font-weight="600" letter-spacing="0.5" fill="${badge.color}">${badge.text}</text>`;
      badgeX += badge.width + 12;
      return result;
    })
    .join("\n    ");
  y += 45;

  let installEl = "";
  if (install) {
    const installW = Math.max(install.length * 10 + 60, 300);
    const installX = 640 - installW / 2;
    installEl = `
    <rect x="${installX}" y="${y}" width="${installW}" height="44" rx="6" fill="${BG}" stroke="${BORDER}" stroke-width="1"/>
    <text x="${installX + 14}" y="${y + 17}" font-family="'Courier New', monospace" font-size="11" fill="${TEXT_MUTED}" text-transform="uppercase" letter-spacing="1">INSTALL</text>
    <text x="${installX + 14}" y="${y + 34}" font-family="'Courier New', monospace" font-size="15" fill="${TEXT}">${install}</text>`;
  }

  const urlEl = `<text x="640" y="${HEIGHT - 50}" text-anchor="middle" font-family="'Courier New', monospace" font-size="14" fill="${TEXT_MUTED}">${url}</text>`;

  const defs = `
    <defs>
      <linearGradient id="hero-accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${theme.accent}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="glow-left" cx="16%" cy="26%" r="34%">
        <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.13"/>
        <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow-right" cx="85%" cy="72%" r="38%">
        <stop offset="0%" stop-color="${theme.secondary}" stop-opacity="0.11"/>
        <stop offset="100%" stop-color="${theme.secondary}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${BORDER}" stroke-width="0.5" opacity="0.3"/>
      </pattern>
    </defs>`;

  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG_SURFACE}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow-left)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow-right)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>
  <rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="8" fill="none" stroke="${BORDER}" stroke-width="1"/>
  ${renderFamilyChrome(theme)}
  <rect x="470" y="124" width="340" height="2" rx="1" fill="url(#hero-accent)"/>
  ${nameEl}
  ${taglineEl}
  ${badgeEls}
  ${installEl}
  ${urlEl}
</svg>`;
}

function orderFields(obj) {
  const ordered = {};
  for (const key of FIELD_ORDER) {
    if (obj[key] !== undefined) ordered[key] = obj[key];
  }
  for (const key of Object.keys(obj)) {
    if (!FIELD_ORDER.includes(key)) ordered[key] = obj[key];
  }
  return ordered;
}

function stableOverrides(overrides) {
  const sorted = {};
  for (const key of Object.keys(overrides).sort()) {
    sorted[key] = orderFields(overrides[key]);
  }
  return sorted;
}

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    const { createRequire } = await import("node:module");
    const require = createRequire(path.join(ROOT, "site", "package.json"));
    return require("sharp");
  }
}

async function main() {
  const projects = loadJson("projects.json");
  const collections = loadJson("collections.json");
  const overrides = loadJson("overrides.json");
  const ignoreList = loadJson("automation.ignore.json");

  let candidateTargets = [];

  if (ALL_FRONT_DOOR) {
    const { registry } = loadFrontDoorRegistry(ROOT);
    candidateTargets = buildFrontDoorPlaceholderTargets({
      projects,
      registry,
      overrides,
    });
    console.log(`Front door targets: ${candidateTargets.length} tools`);
  } else {
    const flagships = selectFlagships(projects, collections, ignoreList);
    const projectMap = new Map(projects.map((project) => [project.repo, project]));
    console.log(`Flagships: ${flagships.size} tools`);

    candidateTargets = [...flagships]
      .map((repo) => {
        const project = projectMap.get(repo);
        if (!project) {
          console.log(`  skip ${repo} — not in projects.json`);
          return null;
        }

        return {
          id: repo,
          project,
          overrideKey: repo,
          outputName: `${repo}.png`,
          override: overrides[repo] || {},
        };
      })
      .filter(Boolean);
  }

  const toGenerate = [];
  for (const target of candidateTargets) {
    const screenshotPath = path.join(SCREENSHOTS_DIR, target.outputName);
    const hasFile = fs.existsSync(screenshotPath);
    const hasReal = target.override?.screenshotType === "real";

    if (hasReal) {
      console.log(`  skip ${target.id} — has real screenshot`);
      continue;
    }

    if (!shouldGeneratePlaceholder({ hasFile, hasReal, force: FORCE })) {
      console.log(`  skip ${target.id} — placeholder exists`);
      continue;
    }

    toGenerate.push(target);
  }

  if (toGenerate.length === 0) {
    console.log("Nothing to generate.");
    return;
  }

  console.log(`\nGenerating ${toGenerate.length} placeholder(s)...`);

  if (!DRY_RUN) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  let sharp;
  try {
    sharp = await loadSharp();
  } catch {
    console.error("ERROR: sharp not available. Install it:");
    console.error("  cd site && npm install --save-dev sharp");
    process.exit(1);
  }

  let generated = 0;
  let overridesChanged = false;

  for (const { project, outputName, overrideKey } of toGenerate) {
    const svg = generateSvg(project);
    const outPath = path.join(SCREENSHOTS_DIR, outputName);

    if (DRY_RUN) {
      console.log(`  [dry-run] would generate ${outputName}`);
    } else {
      await sharp(Buffer.from(svg))
        .png({ quality: 90 })
        .toFile(outPath);
      console.log(`  generated ${outputName}`);
    }

    if (!overrides[overrideKey]) overrides[overrideKey] = {};
    if (overrides[overrideKey].screenshotType !== "real") {
      overrides[overrideKey].screenshot = `/screenshots/${outputName}`;
      overrides[overrideKey].screenshotType = "placeholder";
      overridesChanged = true;
    }

    generated++;
  }

  if (overridesChanged && !DRY_RUN) {
    fs.writeFileSync(
      path.join(SITE_DATA, "overrides.json"),
      JSON.stringify(stableOverrides(overrides), null, 2) + "\n",
    );
    console.log(`\nUpdated overrides.json with ${generated} screenshot entries.`);
    console.log("Run sync-org-metadata.mjs to merge into projects.json.");
  } else if (DRY_RUN) {
    console.log(`\n[dry-run] Would update overrides.json with ${generated} screenshot entries.`);
  }

  console.log("Done.");
}

const IS_MAIN =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_MAIN) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
