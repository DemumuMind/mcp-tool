import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const LAB_PAGES_DIR = path.join(REPO_ROOT, "site", "src", "pages", "lab");

const FORBIDDEN_PATTERNS = [
  /#388bfd/i,
  /#58a6ff/i,
  /#3fb950/i,
  /#d29922/i,
  /#bc8cff/i,
  /Internal Preview/,
  /вЂў/,
  /[🧾❤️🛡️📈🧭⚙️🧪🎛️📣⭐🧵🎹📦📊🌱📡🎯]/u,
];

function getFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFiles(fullPath));
      continue;
    }
    if (entry.name.endsWith(".astro")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("Lab visual contract", () => {
  it("lab pages avoid old palette literals, old preview label, and emoji-card navigation", () => {
    const offenders = [];

    for (const filePath of getFiles(LAB_PAGES_DIR)) {
      const source = fs.readFileSync(filePath, "utf8");
      if (FORBIDDEN_PATTERNS.some((pattern) => pattern.test(source))) {
        offenders.push(path.relative(REPO_ROOT, filePath));
      }
    }

    assert.deepEqual(offenders, [], `lab pages still use forbidden visual leftovers: ${offenders.join(", ")}`);
  });
});
