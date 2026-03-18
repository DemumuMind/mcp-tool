import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { assertPublicBuildSafety } from "../../scripts/assert-public-build-safety.mjs";

const ROOT = process.cwd();

function readText(...segments) {
  return fs.readFileSync(path.join(ROOT, ...segments), "utf8");
}

function makeDist(files) {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "public-build-"));

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }

  return dir;
}

describe("public build safety", () => {
  it("rejects sitemap artifacts that mention admin or lab routes", () => {
    const dir = makeDist({
      "sitemap-0.xml": [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<urlset>",
        "<url><loc>https://example.test/mcp-tool/admin/</loc></url>",
        "<url><loc>https://example.test/mcp-tool/lab/ops/</loc></url>",
        "</urlset>",
      ].join(""),
    });

    assert.throws(
      () => assertPublicBuildSafety(dir),
      /sitemap-0\.xml/i,
      "sitemap validation should fail when server-only routes leak into the public artifact"
    );
  });

  it("rejects unexpected admin directories in the published client bundle", () => {
    const dir = makeDist({
      "sitemap-0.xml": '<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>',
      "admin/index.html": "<html>admin</html>",
    });

    assert.throws(
      () => assertPublicBuildSafety(dir),
      /admin/i,
      "public bundle validation should fail when admin artifacts exist under dist/client"
    );
  });

  it("accepts a safe public bundle", () => {
    const dir = makeDist({
      "index.html": "<html>ok</html>",
      "robots.txt": "Sitemap: https://example.test/mcp-tool/sitemap-index.xml",
      "sitemap-0.xml": [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<urlset>",
        "<url><loc>https://example.test/mcp-tool/</loc></url>",
        "<url><loc>https://example.test/mcp-tool/submit/queue/</loc></url>",
        "</urlset>",
      ].join(""),
    });

    assert.doesNotThrow(() => assertPublicBuildSafety(dir));
  });

  it("runs public build safety checks before publishing gh-pages", () => {
    const workflow = readText(".github", "workflows", "pages.yml");

    assert.match(
      workflow,
      /node scripts\/assert-public-build-safety\.mjs site\/dist\/client/,
      "pages workflow should validate dist/client before publishing"
    );
    assert.match(
      workflow,
      /Remove internal lab artifacts from public bundle[\s\S]*assert-public-build-safety\.mjs site\/dist\/client[\s\S]*Publish gh-pages branch/,
      "bundle safety validation should happen after pruning and before gh-pages publish"
    );
    assert.match(
      workflow,
      /node --test tests\/build-artifacts\/\*\.test\.mjs/,
      "pages workflow should run build-artifact tests against the generated client bundle"
    );
  });

  it("keeps smoke checks scoped to public surfaces that should exist after hardening", () => {
    const smoke = readText("scripts", "smoke-test.mjs");

    assert.match(
      smoke,
      /submit\/queue\//,
      "smoke test should probe the public submission queue after deploy"
    );
    assert.ok(
      !smoke.includes("/lab/marketir/") &&
        !smoke.includes("/lab/signals/") &&
        !smoke.includes("/lab/targets/") &&
        !smoke.includes("/lab/ops/") &&
        !smoke.includes("/lab/clearance/") &&
        !smoke.includes("/links.json"),
      "smoke test should not expect removed lab routes in the public GitHub Pages bundle"
    );
  });

  it("rejects public bundles that include links.json or lab clearance artifacts", () => {
    const dir = makeDist({
      "links.json": '{"links":[]}',
      "lab/clearance/tool-compass.json": '{"overallScore":91}',
    });

    assert.throws(
      () => assertPublicBuildSafety(dir),
      /links\.json|lab/i,
    );
  });

  it("rejects proof pages that still contain tracking or clearance disclosure copy", () => {
    const dir = makeDist({
      "proof/tool-compass/index.html": "<html><body>Tracked outbound links Clearance status Operational reference</body></html>",
    });

    assert.throws(
      () => assertPublicBuildSafety(dir),
      /Tracked outbound links|Clearance status|Operational reference/,
    );
  });
});
