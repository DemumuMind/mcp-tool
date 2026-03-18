import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST_CLIENT = path.join(ROOT, "site", "dist", "client");

function readDistFile(...segments) {
  return fs.readFileSync(path.join(DIST_CLIENT, ...segments), "utf8");
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

describe("public build artifacts", () => {
  it("keeps sitemap-0.xml free of admin and lab routes", () => {
    const sitemap = readDistFile("sitemap-0.xml");

    assert.ok(!sitemap.includes("/admin/"), "sitemap-0.xml must not publish /admin/ routes");
    assert.ok(!sitemap.includes("/api/admin/"), "sitemap-0.xml must not publish /api/admin/ routes");
    assert.ok(!sitemap.includes("/lab/"), "sitemap-0.xml must not publish /lab/ routes");
  });

  it("ships only public submission queue content", () => {
    const queueHtml = readDistFile("submit", "queue", "index.html");

    assert.ok(!queueHtml.includes("reviewNotes"), "public queue build must not expose reviewer notes");
    assert.ok(!queueHtml.includes("lastReviewedAt"), "public queue build must not expose review timestamps");
    assert.ok(!queueHtml.includes("sourcePr"), "public queue build must not expose internal PR metadata");
    assert.ok(!queueHtml.includes("reason"), "public queue build must not expose operator-only reasons");
  });

  it("does not publish server-only directories in the public bundle", () => {
    assert.equal(
      fs.existsSync(path.join(DIST_CLIENT, "admin")),
      false,
      "site/dist/client/admin should not exist in the published bundle",
    );
    assert.equal(
      fs.existsSync(path.join(DIST_CLIENT, "lab")),
      false,
      "site/dist/client/lab should not exist in the published bundle",
    );
  });

  it("does not publish the internal link registry as a static public artifact", () => {
    assert.equal(
      fs.existsSync(path.join(DIST_CLIENT, "links.json")),
      false,
      "site/dist/client/links.json should not exist in the published bundle",
    );
  });

  it("keeps proof pages free of tracking-registry and clearance disclosures", () => {
    const proofDir = path.join(DIST_CLIENT, "proof");
    const proofHtmlFiles = walk(proofDir).filter((filePath) => filePath.endsWith(".html"));

    assert.ok(proofHtmlFiles.length > 0, "expected at least one generated proof page");

    for (const filePath of proofHtmlFiles) {
      const html = fs.readFileSync(filePath, "utf8");
      assert.ok(!html.includes("Tracked outbound links"), `${path.basename(filePath)} must not expose tracked outbound links`);
      assert.ok(!html.includes("Clearance status"), `${path.basename(filePath)} must not expose clearance status`);
      assert.ok(!html.includes("Operational reference"), `${path.basename(filePath)} must not expose operational reference copy`);
    }
  });
});
