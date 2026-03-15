import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { joinBasePath } from "../../site/src/lib/site-paths.ts";

describe("site path helpers", () => {
  it("leaves external URLs unchanged", () => {
    assert.equal(joinBasePath("/mcp-tool/", "https://example.com/foo"), "https://example.com/foo");
  });

  it("leaves hash links unchanged", () => {
    assert.equal(joinBasePath("/mcp-tool/", "#verify"), "#verify");
  });

  it("prefixes root-relative links with the project base path", () => {
    assert.equal(joinBasePath("/mcp-tool/", "/tools/"), "/mcp-tool/tools/");
    assert.equal(joinBasePath("/mcp-tool/", "/"), "/mcp-tool/");
  });

  it("does not modify links when there is no project base path", () => {
    assert.equal(joinBasePath("/", "/tools/"), "/tools/");
    assert.equal(joinBasePath("", "/tools/"), "/tools/");
  });
});
