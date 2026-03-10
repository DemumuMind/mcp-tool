#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSiteUrl } from "./lib/config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "site", "dist");

const basePath = (() => {
  const pathname = new URL(getSiteUrl()).pathname.replace(/\/$/, "");
  return pathname && pathname !== "" ? pathname : "";
})();

if (!basePath || basePath === "/") {
  console.log("No project base path detected. Skipping dist postprocess.");
  process.exit(0);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return [fullPath];
  });
}

const htmlFiles = walk(DIST_DIR).filter((file) => file.endsWith(".html"));
let changedFiles = 0;

for (const file of htmlFiles) {
  const original = fs.readFileSync(file, "utf8");
  const updated = original.replace(
    /\b(href|src|action)=("|')\/(?!\/|mcp-tool\/)([^"'#?][^"']*)\2/g,
    (_match, attr, quote, target) => `${attr}=${quote}${basePath}/${target}${quote}`
  );

  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
    changedFiles++;
  }
}

console.log(`Postprocessed ${changedFiles} HTML file(s) for base path ${basePath}`);
