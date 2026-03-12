import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fail, warn } from "../../scripts/lib/errors.mjs";

let capturedError;
let capturedWarn;
let exitCode;
const originalError = console.error;
const originalWarn = console.warn;
const originalExit = process.exit;

beforeEach(() => {
  capturedError = "";
  capturedWarn = "";
  exitCode = null;
  console.error = (...args) => { capturedError = args.join(" "); };
  console.warn = (...args) => { capturedWarn = args.join(" "); };
  process.exit = (code) => { exitCode = code; };
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
  process.exit = originalExit;
});

// ── fail ────────────────────────────────────────────────────

describe("fail", () => {
  it("prints error code and headline to stderr", () => {
    fail("MKT.DATA.MISSING", "file not found");
    assert.ok(capturedError.includes("MKT.DATA.MISSING"), "should include error code");
    assert.ok(capturedError.includes("file not found"), "should include headline");
    assert.equal(capturedWarn, "", "should not write to console.warn");
  });

  it("calls process.exit with default code 1", () => {
    fail("MKT.DATA.MISSING", "file not found");
    assert.equal(exitCode, 1);
  });

  it("calls process.exit with custom exit code", () => {
    fail("MKT.AUTH.DENIED", "no token", { exitCode: 2 });
    assert.equal(exitCode, 2);
  });

  it("includes fix text when provided", () => {
    fail("MKT.DATA.MISSING", "overrides.json not found", {
      fix: "Run sync-org-metadata first.",
    });
    assert.ok(capturedError.includes("fix:"), "should include fix label");
    assert.ok(capturedError.includes("Run sync-org-metadata first."), "should include fix text");
  });

  it("includes file path when provided", () => {
    fail("MKT.DATA.MISSING", "not found", {
      path: "site/src/data/overrides.json",
    });
    assert.ok(capturedError.includes("file:"), "should include file label");
    assert.ok(capturedError.includes("site/src/data/overrides.json"), "should include path");
  });

  it("includes nerd detail when provided", () => {
    fail("MKT.FETCH.NETWORK", "DNS failure", {
      nerd: "ENOTFOUND for api.github.com",
    });
    assert.ok(capturedError.includes("nerd:"), "should include nerd label");
    assert.ok(capturedError.includes("ENOTFOUND for api.github.com"), "should include nerd text");
  });

  it("includes all options together", () => {
    fail("MKT.DATA.INVALID", "bad JSON", {
      fix: "Check the file syntax.",
      path: "data/registry.json",
      nerd: "Unexpected token at position 42",
      exitCode: 3,
    });
    assert.ok(capturedError.includes("MKT.DATA.INVALID"));
    assert.ok(capturedError.includes("bad JSON"));
    assert.ok(capturedError.includes("Check the file syntax."));
    assert.ok(capturedError.includes("data/registry.json"));
    assert.ok(capturedError.includes("Unexpected token at position 42"));
    assert.equal(exitCode, 3);
  });

  it("omits fix/path/nerd lines when not provided", () => {
    fail("MKT.GEN.MISSING", "no output");
    assert.ok(!capturedError.includes("fix:"), "should not include fix line");
    assert.ok(!capturedError.includes("file:"), "should not include file line");
    assert.ok(!capturedError.includes("nerd:"), "should not include nerd line");
  });
});

// ── warn ────────────────────────────────────────────────────

describe("warn", () => {
  it("prints warning code and headline to console.warn", () => {
    warn("MKT.FETCH.DENIED", "Traffic API returned 403");
    assert.ok(capturedWarn.includes("MKT.FETCH.DENIED"), "should include warning code");
    assert.ok(capturedWarn.includes("Traffic API returned 403"), "should include headline");
    assert.equal(capturedError, "", "should not write to console.error");
  });

  it("does not call process.exit", () => {
    warn("MKT.FETCH.QUOTA", "rate limited");
    assert.equal(exitCode, null, "warn should not call process.exit");
  });

  it("includes fix text when provided", () => {
    warn("MKT.FETCH.DENIED", "403", {
      fix: "Set GITHUB_TOKEN with repo scope.",
    });
    assert.ok(capturedWarn.includes("fix:"));
    assert.ok(capturedWarn.includes("Set GITHUB_TOKEN with repo scope."));
  });

  it("includes file path when provided", () => {
    warn("MKT.DATA.INVALID", "bad shape", {
      path: "data/overrides.json",
    });
    assert.ok(capturedWarn.includes("file:"));
    assert.ok(capturedWarn.includes("data/overrides.json"));
  });

  it("includes nerd detail when provided", () => {
    warn("MKT.FETCH.DENIED", "403", {
      nerd: "Traffic endpoint requires push access.",
    });
    assert.ok(capturedWarn.includes("nerd:"));
    assert.ok(capturedWarn.includes("Traffic endpoint requires push access."));
  });

  it("includes all options together", () => {
    warn("MKT.HASH.MISMATCH", "checksum wrong", {
      fix: "Re-run the fetch script.",
      path: "lockfile.json",
      nerd: "Expected abc123, got def456",
    });
    assert.ok(capturedWarn.includes("MKT.HASH.MISMATCH"));
    assert.ok(capturedWarn.includes("checksum wrong"));
    assert.ok(capturedWarn.includes("Re-run the fetch script."));
    assert.ok(capturedWarn.includes("lockfile.json"));
    assert.ok(capturedWarn.includes("Expected abc123, got def456"));
  });

  it("omits fix/path/nerd lines when not provided", () => {
    warn("MKT.GEN.MISSING", "no output");
    assert.ok(!capturedWarn.includes("fix:"));
    assert.ok(!capturedWarn.includes("file:"));
    assert.ok(!capturedWarn.includes("nerd:"));
  });
});
