import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const originalExit = process.exit;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

let captured;
let exitCalled;

beforeEach(() => {
  captured = [];
  exitCalled = null;
  process.exit = (code) => { exitCalled = code; };
  console.error = (...args) => { captured.push({ stream: "error", text: args.join(" ") }); };
  console.warn = (...args) => { captured.push({ stream: "warn", text: args.join(" ") }); };
});

afterEach(() => {
  process.exit = originalExit;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

function output(stream) {
  return captured.filter((c) => c.stream === stream).map((c) => c.text).join("\n");
}

// Dynamic import so mocks for process.exit are in place before any call.
// errors.mjs has no module-level side effects besides computing useColor,
// so a static import would also work, but lazy import is safer.
async function loadErrors() {
  return import("../../scripts/lib/errors.mjs");
}

// fail
describe("fail", () => {
  it("prints code and headline to stderr", async () => {
    const { fail } = await loadErrors();
    fail("MKT.DATA.MISSING", "overrides.json not found");
    const out = output("error");
    assert.ok(out.includes("MKT.DATA.MISSING"), "should contain error code");
    assert.ok(out.includes("overrides.json not found"), "should contain headline");
  });

  it("calls process.exit with default code 1", async () => {
    const { fail } = await loadErrors();
    fail("MKT.DATA.MISSING", "boom");
    assert.equal(exitCalled, 1);
  });

  it("calls process.exit with custom exitCode", async () => {
    const { fail } = await loadErrors();
    fail("MKT.AUTH.DENIED", "forbidden", { exitCode: 42 });
    assert.equal(exitCalled, 42);
  });

  it("includes fix text when provided", async () => {
    const { fail } = await loadErrors();
    fail("MKT.FETCH.NETWORK", "timeout", { fix: "Check your connection." });
    const out = output("error");
    assert.ok(out.includes("fix:"), "should contain fix label");
    assert.ok(out.includes("Check your connection."), "should contain fix text");
  });

  it("includes path text when provided", async () => {
    const { fail } = await loadErrors();
    fail("MKT.DATA.MISSING", "file gone", { path: "site/src/data/overrides.json" });
    const out = output("error");
    assert.ok(out.includes("file:"), "should contain file label");
    assert.ok(out.includes("site/src/data/overrides.json"), "should contain path");
  });

  it("includes nerd text when provided", async () => {
    const { fail } = await loadErrors();
    fail("MKT.HASH.MISMATCH", "hash bad", { nerd: "Expected sha256:abc" });
    const out = output("error");
    assert.ok(out.includes("nerd:"), "should contain nerd label");
    assert.ok(out.includes("Expected sha256:abc"), "should contain nerd text");
  });

  it("includes all optional fields together", async () => {
    const { fail } = await loadErrors();
    fail("MKT.GEN.INVALID", "gen failed", {
      fix: "Re-run the generator.",
      path: "/tmp/out.json",
      nerd: "Schema validation error at $.items[0]",
      exitCode: 2,
    });
    const out = output("error");
    assert.ok(out.includes("MKT.GEN.INVALID"));
    assert.ok(out.includes("gen failed"));
    assert.ok(out.includes("Re-run the generator."));
    assert.ok(out.includes("/tmp/out.json"));
    assert.ok(out.includes("Schema validation error at $.items[0]"));
    assert.equal(exitCalled, 2);
  });
});

// warn
describe("warn", () => {
  it("prints code and headline to stderr via console.warn", async () => {
    const { warn } = await loadErrors();
    warn("MKT.FETCH.QUOTA", "rate limited");
    const out = output("warn");
    assert.ok(out.includes("MKT.FETCH.QUOTA"), "should contain warning code");
    assert.ok(out.includes("rate limited"), "should contain headline");
  });

  it("does not call process.exit", async () => {
    const { warn } = await loadErrors();
    warn("MKT.FETCH.NETWORK", "transient error");
    assert.equal(exitCalled, null, "warn must not exit");
  });

  it("includes fix text when provided", async () => {
    const { warn } = await loadErrors();
    warn("MKT.AUTH.DENIED", "no token", { fix: "Set GITHUB_TOKEN." });
    const out = output("warn");
    assert.ok(out.includes("fix:"));
    assert.ok(out.includes("Set GITHUB_TOKEN."));
  });

  it("includes path text when provided", async () => {
    const { warn } = await loadErrors();
    warn("MKT.DATA.INVALID", "bad shape", { path: "data/tools.json" });
    const out = output("warn");
    assert.ok(out.includes("file:"));
    assert.ok(out.includes("data/tools.json"));
  });

  it("includes nerd text when provided", async () => {
    const { warn } = await loadErrors();
    warn("MKT.FETCH.NETWORK", "DNS fail", { nerd: "getaddrinfo ENOTFOUND" });
    const out = output("warn");
    assert.ok(out.includes("nerd:"));
    assert.ok(out.includes("getaddrinfo ENOTFOUND"));
  });

  it("includes all optional fields together", async () => {
    const { warn } = await loadErrors();
    warn("MKT.DATA.INVALID", "schema drift", {
      fix: "Update the schema.",
      path: "schemas/tool.json",
      nerd: "additionalProperties not allowed",
    });
    const out = output("warn");
    assert.ok(out.includes("MKT.DATA.INVALID"));
    assert.ok(out.includes("schema drift"));
    assert.ok(out.includes("Update the schema."));
    assert.ok(out.includes("schemas/tool.json"));
    assert.ok(out.includes("additionalProperties not allowed"));
    assert.equal(exitCalled, null, "warn must not exit");
  });

  it("does not include fix/path/nerd lines when not provided", async () => {
    const { warn } = await loadErrors();
    warn("MKT.GEN.MISSING", "no output");
    const out = output("warn");
    assert.ok(!out.includes("fix:"), "should omit fix line");
    assert.ok(!out.includes("file:"), "should omit file line");
    assert.ok(!out.includes("nerd:"), "should omit nerd line");
  });
});
