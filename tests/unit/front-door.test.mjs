import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadRegistry, getToolStatus } from "../../scripts/lib/front-door.mjs";

let tmpDir;
const originalReadFileSync = fs.readFileSync;

beforeEach(() => {
  tmpDir = join(tmpdir(), `test-front-door-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  fs.readFileSync = originalReadFileSync;
  rmSync(tmpDir, { recursive: true, force: true });
});

function registryDir() {
  return join(tmpDir, "site", "src", "data", "registry");
}

function dataDir() {
  return join(tmpDir, "site", "src", "data");
}

function seedRegistry(data) {
  mkdirSync(registryDir(), { recursive: true });
  writeFileSync(join(registryDir(), "registry.index.json"), JSON.stringify(data), "utf8");
}

function seedOverrides(data) {
  mkdirSync(dataDir(), { recursive: true });
  writeFileSync(join(dataDir(), "overrides.json"), JSON.stringify(data), "utf8");
}

// ── loadRegistry ────────────────────────────────────────────

describe("loadRegistry", () => {
  it("loads valid registry with no overrides file", () => {
    const tools = [{ id: "tool-a", name: "Tool A" }];
    seedRegistry(tools);
    const { registry, overrides } = loadRegistry(tmpDir);
    assert.deepEqual(registry, tools);
    assert.deepEqual(overrides, {});
  });

  it("loads valid registry and valid overrides", () => {
    const tools = [{ id: "tool-a" }];
    const ovr = { "tool-a": { featured: true } };
    seedRegistry(tools);
    seedOverrides(ovr);
    const { registry, overrides } = loadRegistry(tmpDir);
    assert.deepEqual(registry, tools);
    assert.deepEqual(overrides, ovr);
  });

  it("throws when registry file does not exist", () => {
    assert.throws(
      () => loadRegistry(tmpDir),
      (err) => err.message.includes("Registry not found"),
    );
  });

  it("throws descriptive error when registry contains malformed JSON", () => {
    mkdirSync(registryDir(), { recursive: true });
    writeFileSync(join(registryDir(), "registry.index.json"), "{{not json}}", "utf8");
    assert.throws(
      () => loadRegistry(tmpDir),
      (err) => err.message.includes("Failed to parse registry"),
    );
  });

  it("throws descriptive error when overrides contains malformed JSON", () => {
    seedRegistry([{ id: "tool-a" }]);
    mkdirSync(dataDir(), { recursive: true });
    writeFileSync(join(dataDir(), "overrides.json"), "{bad json!!", "utf8");
    assert.throws(
      () => loadRegistry(tmpDir),
      (err) => err.message.includes("Failed to parse overrides"),
    );
  });

  it("throws descriptive read error when registry file cannot be opened", () => {
    mkdirSync(join(registryDir(), "registry.index.json"), { recursive: true });
    assert.throws(
      () => loadRegistry(tmpDir),
      (err) => err.message.includes("Failed to read registry"),
    );
  });

  it("throws descriptive read error when overrides file cannot be opened", () => {
    seedRegistry([{ id: "tool-a" }]);
    mkdirSync(dataDir(), { recursive: true });
    mkdirSync(join(dataDir(), "overrides.json"), { recursive: true });
    assert.throws(
      () => loadRegistry(tmpDir),
      (err) => err.message.includes("Failed to read overrides"),
    );
  });

  it("treats EACCES while reading registry as a read error, not a parse error", () => {
    seedRegistry([{ id: "tool-a" }]);
    fs.readFileSync = (filePath, ...args) => {
      if (String(filePath).endsWith("registry.index.json")) {
        const error = new Error("permission denied");
        error.code = "EACCES";
        throw error;
      }
      return originalReadFileSync.call(fs, filePath, ...args);
    };

    assert.throws(
      () => loadRegistry(tmpDir),
      (err) =>
        err.message.includes("Failed to read registry") &&
        err.message.includes("permission denied"),
    );
  });
});

// ── getToolStatus ───────────────────────────────────────────

describe("getToolStatus", () => {
  it("marks tool as front-door by default", () => {
    const status = getToolStatus("tool-a", { tags: [] }, {});
    assert.equal(status.isFrontDoor, true);
    assert.equal(status.isInternal, false);
    assert.equal(status.isFeatured, false);
  });

  it("marks tool as internal when override category is internal", () => {
    const status = getToolStatus("tool-a", { tags: [] }, { category: "internal" });
    assert.equal(status.isInternal, true);
    assert.equal(status.isFrontDoor, false);
  });

  it("marks tool as internal when tags include internal", () => {
    const status = getToolStatus("tool-a", { tags: ["internal"] }, {});
    assert.equal(status.isInternal, true);
    assert.equal(status.isFrontDoor, false);
  });

  it("marks tool as featured when override has featured true", () => {
    const status = getToolStatus("tool-a", { tags: [] }, { featured: true });
    assert.equal(status.isFeatured, true);
    assert.equal(status.isFrontDoor, true);
  });
});
