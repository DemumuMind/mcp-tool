import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const MODULE_PATH = resolve(ROOT, "site", "src", "lib", "telemetry-preview.mjs");
const PAGE_PATH = resolve(ROOT, "site", "src", "pages", "lab", "telemetry-export.astro");
const SECURITY_MODEL_PATH = resolve(ROOT, "docs", "SECURITY-MODEL.md");

describe("telemetry preview rendering", () => {
  it("does not keep an unused telemetry preview helper module", () => {
    assert.equal(
      existsSync(MODULE_PATH),
      false,
      "expected site/src/lib/telemetry-preview.mjs to be removed after DOM-based rendering"
    );
  });

  it("telemetry export page does not use innerHTML for preview rendering", () => {
    const source = readFileSync(PAGE_PATH, "utf8");
    assert.ok(!source.includes(".innerHTML"));
  });

  it("telemetry export page uses textContent-based DOM rendering", () => {
    const source = readFileSync(PAGE_PATH, "utf8");
    assert.ok(source.includes("document.createElement('tr')"));
    assert.ok(source.includes("textContent = String(event?.type ?? '')"));
    assert.ok(source.includes("tbody.replaceChildren(...rows)"));
  });

  it("security model documents DOM-node rendering instead of the deleted helper", () => {
    const source = readFileSync(SECURITY_MODEL_PATH, "utf8");
    assert.ok(!source.includes("telemetry-preview.mjs"));
    assert.ok(source.includes("DOM node construction"));
  });
});
