import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const SITE_SRC = path.join(REPO_ROOT, "site", "src");

function getSourceFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (fullPath.includes(`${path.sep}pages${path.sep}lab`)) continue;
      files.push(...getSourceFiles(fullPath));
      continue;
    }

    if (/\.(astro|mjs|js|ts|css)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("Public link safety", () => {
  it("requires rel=noopener for target=_blank links outside deferred lab pages", () => {
    const offenders = [];
    const targetBlankTagPattern = /<a\b[^>]*target="_blank"[^>]*>/gms;

    for (const filePath of getSourceFiles(SITE_SRC)) {
      const source = fs.readFileSync(filePath, "utf8");
      const matches = source.match(targetBlankTagPattern) || [];
      const unsafeTags = matches.filter((tag) => !/rel="[^"]*noopener/.test(tag));
      if (unsafeTags.length > 0) {
        offenders.push(path.relative(REPO_ROOT, filePath));
      }
    }

    assert.deepEqual(offenders, [], `target=_blank links missing rel=noopener in: ${offenders.join(", ")}`);
  });
});
