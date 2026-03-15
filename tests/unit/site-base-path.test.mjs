import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { joinBasePath } from "../../site/src/lib/site-paths.ts";

describe("joinBasePath", () => {
  it("prefixes internal paths with a non-root base", () => {
    assert.equal(joinBasePath("/mcp-tool/", "/tools/"), "/mcp-tool/tools/");
    assert.equal(joinBasePath("/mcp-tool/", "/"), "/mcp-tool/");
  });

  it("leaves external URLs and fragments unchanged", () => {
    assert.equal(joinBasePath("/mcp-tool/", "https://github.com/DemumuMind"), "https://github.com/DemumuMind");
    assert.equal(joinBasePath("/mcp-tool/", "#verify"), "#verify");
  });

  it("leaves hrefs unchanged when base is root", () => {
    assert.equal(joinBasePath("/", "/tools/"), "/tools/");
    assert.equal(joinBasePath("/", "/favicon.svg"), "/favicon.svg");
  });
});
