import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readJson(...segments) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), ...segments), "utf8"));
}

describe("DemumuMind canonical brand metadata", () => {
  it("kit.config.json uses DemumuMind as the canonical site, org, and repo identity", () => {
    const config = readJson("kit.config.json");

    assert.equal(config.org.name, "DemumuMind");
    assert.equal(config.org.account, "DemumuMind");
    assert.equal(config.org.url, "https://github.com/DemumuMind");
    assert.equal(config.site.title, "DemumuMind");
    assert.equal(config.site.url, "http://localhost:4321/");
    assert.equal(config.repo.marketing, "DemumuMind/mcp-tool");
  });

  it("root package.json no longer uses the old mcp-tool-shop package name", () => {
    const pkg = readJson("package.json");

    assert.equal(pkg.name, "mcp-tool");
    assert.ok(!JSON.stringify(pkg).includes("mcp-tool-shop"));
  });

  it("promo-kit package metadata uses the @demumumind scope and DemumuMind repo URLs", () => {
    const pkg = readJson("packages", "promo-kit", "package.json");

    assert.equal(pkg.name, "@demumumind/promo-kit");
    assert.equal(pkg.repository.url, "https://github.com/DemumuMind/mcp-tool.git");
    assert.equal(pkg.homepage, "https://github.com/DemumuMind/mcp-tool/tree/main/packages/promo-kit");
    assert.equal(pkg.bugs.url, "https://github.com/DemumuMind/mcp-tool/issues");
    assert.match(pkg.author, /DemumuMind/);
  });
});
