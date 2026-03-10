import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TOOLS_PAGE_PATH = path.join(ROOT, "site", "src", "pages", "tools", "index.astro");
const PROJECTS_PATH = path.join(ROOT, "site", "src", "data", "projects.json");
const OVERRIDES_PATH = path.join(ROOT, "site", "src", "data", "overrides.json");

const PROMOTED_REPOS = [
  "zip-meta-map",
  "soundboard-plugin",
  "LoKey-Typer",
  "Attestia",
  "InControl-Desktop",
  "mcp-voice-engine",
  "mcp-app-builder",
  "ai-jam-sessions",
  "a11y-assist",
  "a11y-ci",
];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

describe("tools catalog contract", () => {
  it("uses public visibility instead of registry-only visibility on the listing page", () => {
    const source = readText(TOOLS_PAGE_PATH);

    assert.match(
      source,
      /const publicProjects = \(projects as any\[\]\)\.filter\(\(project: any\) => !project\.unlisted\);/,
      "tools page should derive the public catalog from unlisted=false"
    );
    assert.match(
      source,
      /const hiddenProjects = \(projects as any\[\]\)\.filter\(\(project: any\) => project\.unlisted\);/,
      "tools page should track hidden backlog entries separately"
    );
    assert.match(
      source,
      /const languages = \[\.\.\.new Set\(publicProjects\.map\(\(project: any\) => project\.language\)\.filter\(Boolean\)\)\]\.sort\(\);/,
      "public language filters should be derived from visible catalog entries"
    );
    assert.match(
      source,
      /const kinds = \[\.\.\.new Set\(publicProjects\.map\(\(project: any\) => project\.kind\)\.filter\(Boolean\)\)\]\.sort\(\);/,
      "public kind filters should be derived from visible catalog entries"
    );
    assert.match(
      source,
      /data-unlisted=\{project\.unlisted \? "1" : "0"\}/,
      "tools cards should expose unlisted state for client-side filtering"
    );
    assert.match(
      source,
      /const matchesVisibility = includeHidden \|\| card\.dataset\.unlisted !== "1";/,
      "default filtering should hide only unlisted entries"
    );
    assert.match(
      source,
      /Show hidden backlog/,
      "visibility toggle should describe the hidden backlog rather than org-only repos"
    );
    assert.doesNotMatch(
      source,
      /Show org-only/,
      "old registry-only toggle copy should be removed"
    );
  });

  it("promotes curated org-only repos into the public catalog with metadata", () => {
    const projects = readJson(PROJECTS_PATH);
    const overrides = readJson(OVERRIDES_PATH);

    for (const repo of PROMOTED_REPOS) {
      const project = projects.find((entry) => entry.repo === repo);
      assert.ok(project, `${repo} should exist in projects.json`);
      assert.equal(project.unlisted, false, `${repo} should be public in the catalog`);
      assert.equal(project.registered, false, `${repo} should remain org-only`);
      assert.ok(project.kind, `${repo} should have a kind`);
      assert.ok(project.stability, `${repo} should have a stability label`);
      assert.ok(project.tagline && project.tagline.length >= 12, `${repo} should have a usable tagline`);

      const override = overrides[repo];
      assert.ok(override, `${repo} should have an override entry`);
      assert.equal(override.unlisted, false, `${repo} override should keep it public after regeneration`);
    }
  });
});
