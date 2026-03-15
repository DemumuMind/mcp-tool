import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const SITE_ROOT = path.join(REPO_ROOT, "site");
const LOADER_URL = pathToFileURL(path.join(SITE_ROOT, "src/lib/marketir/loader.mjs")).href;

let originalCwd;
let loader;

before(async () => {
  originalCwd = process.cwd();
  process.chdir(SITE_ROOT);
  loader = await import(`${LOADER_URL}?t=${Date.now()}`);
});

after(() => {
  process.chdir(originalCwd);
});

describe("marketir loader fallback", () => {
  it("falls back to project metadata for public proof tools when MarketIR snapshot is missing", () => {
    const tool = loader.getToolBySlug("zip-meta-map");

    assert.ok(tool, "expected fallback tool data for zip-meta-map");
    assert.equal(tool.name, "Zip Meta Map");
    assert.equal(tool.positioning.oneLiner, "Make repos and ZIPs self-describing for LLMs with CI-grade diffs.");
  });

  it("returns fallback proof data for public proof tools", () => {
    const proofData = loader.getProofData("zip-meta-map");

    assert.ok(proofData, "expected fallback proof data");
    assert.ok(Array.isArray(proofData.proven), "proven claims should be an array");
    assert.ok(Array.isArray(proofData.antiClaims), "antiClaims should be an array");
    assert.ok(proofData.proven.length > 0, "fallback should emit at least one proven claim");
    assert.ok(proofData.antiClaims.length > 0, "fallback should emit anti-claims from project metadata");
  });

  it("returns fallback press data and exposes the tool through getToolsWithPress", () => {
    const pressData = loader.getPressData("zip-meta-map");
    const toolsWithPress = loader.getToolsWithPress();

    assert.ok(pressData, "expected fallback press data");
    assert.ok(pressData.boilerplate?.projectDescription, "fallback press boilerplate should include a project description");
    assert.ok(
      toolsWithPress.some((entry) => entry.slug === "zip-meta-map"),
      "public proof tool should be exposed through getToolsWithPress"
    );
  });

  it("does not advertise missing generated press assets in fallback mode", () => {
    const assetLinks = loader.getPublicAssetLinks("zip-meta-map");

    assert.deepEqual(assetLinks, [], "missing public assets should not be advertised");
  });

  it("labels fallback provenance accurately when MarketIR data is absent", () => {
    const snapshot = loader.loadSnapshot();
    const snapshotMeta = loader.getSnapshotMeta(snapshot);

    assert.equal(snapshot?.sourceRepo, "project-fallback");
    assert.equal(snapshotMeta.snapshotLabel, "Project metadata snapshot");
    assert.equal(snapshotMeta.lockLabel, "Project metadata lock");
  });

  it("sanitizes external URLs to allowed schemes only", () => {
    assert.equal(loader.sanitizeExternalUrl("https://example.com/path"), "https://example.com/path");
    assert.equal(loader.sanitizeExternalUrl("javascript:alert(1)"), null);
  });
});
