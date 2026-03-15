import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const LAB_PAGES_DIR = path.join(REPO_ROOT, "site", "src", "pages", "lab");
const MIDDLEWARE_PATH = path.join(REPO_ROOT, "site", "src", "middleware.ts");
const PAGES_WORKFLOW_PATH = path.join(REPO_ROOT, ".github", "workflows", "pages.yml");
const ASTRO_CONFIG_PATH = path.join(REPO_ROOT, "site", "astro.config.mjs");

function getLabPages(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getLabPages(fullPath));
      continue;
    }

    if (entry.name.endsWith(".astro")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("Internal lab surface security", () => {
  it("marks every lab route as server-only so GitHub Pages cannot publish it", () => {
    const offenders = getLabPages(LAB_PAGES_DIR)
      .filter((filePath) => !/export const prerender = false;/.test(fs.readFileSync(filePath, "utf8")))
      .map((filePath) => path.relative(REPO_ROOT, filePath));

    assert.deepEqual(
      offenders,
      [],
      `lab routes must opt out of prerendering: ${offenders.join(", ")}`
    );
  });

  it("requires an authenticated admin session for /lab/ routes on server deployments", () => {
    const source = fs.readFileSync(MIDDLEWARE_PATH, "utf8");

    assert.match(source, /const LAB_PREFIX = withBase\("\/lab\/"\);/);
    assert.match(source, /const isLabPage = pathname\.startsWith\(LAB_PREFIX\);/);
    assert.match(source, /if \(!isAdminPage && !isAdminApi && !isLabPage\) \{/);
    assert.match(source, /if \(!adminUser && !isLoginRoute && !isSessionRoute\) \{/);
  });

  it("strips internal lab artifacts out of the GitHub Pages bundle before gh-pages publish", () => {
    const source = fs.readFileSync(PAGES_WORKFLOW_PATH, "utf8");

    assert.match(
      source,
      /rm -rf site\/dist\/client\/lab/,
      "pages workflow must remove internal lab artifacts from the public client bundle"
    );
  });

  it("excludes admin and lab routes from the public sitemap", () => {
    const source = fs.readFileSync(ASTRO_CONFIG_PATH, "utf8");

    assert.match(source, /!page\.includes\('\/lab\/'\)/);
    assert.match(source, /!page\.includes\('\/admin\/'\)/);
    assert.match(source, /!page\.includes\('\/api\/admin\/'\)/);
  });
});
