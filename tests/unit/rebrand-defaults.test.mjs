import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readText(...segments) {
  return fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");
}

describe("DemumuMind canonical defaults", () => {
  it("sync and registry fetch scripts default to DemumuMind sources", () => {
    const syncScript = readText("scripts", "sync-org-metadata.mjs");
    const fetchRegistryScript = readText("scripts", "fetch-registry.mjs");

    assert.match(syncScript, /const ORG = process\.env\.ORG \|\| "DemumuMind";/);
    assert.match(fetchRegistryScript, /const REGISTRY_REPO = process\.env\.REGISTRY_REPO \|\| "DemumuMind\/mcp-tool-registry";/);
  });

  it("workflow defaults use DemumuMind repo, org, and bot identity", () => {
    const dailyRefresh = readText(".github", "workflows", "daily-refresh.yml");
    const syncWorkflow = readText(".github", "workflows", "sync-org-metadata.yml");

    assert.match(dailyRefresh, /user\.email "demumumind@users\.noreply\.github\.com"/);
    assert.match(syncWorkflow, /ORG: DemumuMind/);
    assert.match(syncWorkflow, /REGISTRY_REPO: DemumuMind\/mcp-tool-registry/);
  });

  it("promo-kit scripts point to DemumuMind package and docs locations", () => {
    const selftest = readText("packages", "promo-kit", "scripts", "kit-selftest.mjs");
    const trustReceipt = readText("packages", "promo-kit", "scripts", "gen-trust-receipt.mjs");

    assert.match(selftest, /https:\/\/github\.com\/DemumuMind\/mcp-tool\/blob\/main\/docs\/quickstart\.md#configure/);
    assert.match(trustReceipt, /@demumumind\/clearance-opinion-engine/);
  });
});
