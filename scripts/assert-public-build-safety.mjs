#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { resolve } from "node:path";

const FORBIDDEN_DIRS = [
  "admin",
  path.join("api", "admin"),
  "lab",
];

const FORBIDDEN_FILES = [
  "links.json",
];

const FORBIDDEN_ROUTE_SNIPPETS = [
  "/admin/",
  "/api/admin/",
  "/lab/",
];

const FORBIDDEN_HTML_DISCLOSURE_SNIPPETS = [
  "Tracked outbound links",
  "Clearance status",
  "Operational reference",
];

const FORBIDDEN_JSON_DISCLOSURE_SNIPPETS = [
  "\"trackedLinks\"",
];

function walk(dir, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    visitor(fullPath, entry);
    if (entry.isDirectory()) {
      walk(fullPath, visitor);
    }
  }
}

export function assertPublicBuildSafety(distDir) {
  if (!distDir) {
    throw new Error("distDir is required");
  }

  const resolvedDistDir = resolve(distDir);
  if (!fs.existsSync(resolvedDistDir)) {
    throw new Error(`dist directory not found: ${resolvedDistDir}`);
  }

  const errors = [];

  for (const relativeDir of FORBIDDEN_DIRS) {
    if (fs.existsSync(path.join(resolvedDistDir, relativeDir))) {
      errors.push(`unexpected server-only artifact directory: ${relativeDir}`);
    }
  }

  for (const relativeFile of FORBIDDEN_FILES) {
    if (fs.existsSync(path.join(resolvedDistDir, relativeFile))) {
      errors.push(`unexpected sensitive public artifact: ${relativeFile}`);
    }
  }

  walk(resolvedDistDir, (fullPath, entry) => {
    if (!entry.isFile()) {
      return;
    }

    const relativePath = path.relative(resolvedDistDir, fullPath);
    const content = fs.readFileSync(fullPath, "utf8");

    if (/^sitemap.*\.xml$/i.test(entry.name)) {
      for (const snippet of FORBIDDEN_ROUTE_SNIPPETS) {
        if (content.includes(snippet)) {
          errors.push(`forbidden route snippet "${snippet}" found in ${path.basename(fullPath)}`);
        }
      }
      return;
    }

    if (/\.html$/i.test(entry.name)) {
      for (const snippet of FORBIDDEN_HTML_DISCLOSURE_SNIPPETS) {
        if (content.includes(snippet)) {
          errors.push(`forbidden disclosure snippet "${snippet}" found in ${relativePath}`);
        }
      }
      return;
    }

    if (/\.json$/i.test(entry.name)) {
      for (const snippet of FORBIDDEN_JSON_DISCLOSURE_SNIPPETS) {
        if (content.includes(snippet)) {
          errors.push(`forbidden disclosure snippet "${snippet}" found in ${relativePath}`);
        }
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(`public build safety check failed:\n- ${errors.join("\n- ")}`);
  }

  return { ok: true, distDir: resolvedDistDir };
}

const isMain = process.argv[1] && resolve(process.argv[1]).endsWith("assert-public-build-safety.mjs");
if (isMain) {
  try {
    const distDir = process.argv[2] || path.join("site", "dist", "client");
    const result = assertPublicBuildSafety(distDir);
    console.log(`Public build safety OK: ${result.distDir}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
