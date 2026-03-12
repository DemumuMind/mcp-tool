import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveCompatibilityProfile,
  derivePricingModel,
  deriveQualityScore,
  buildMarketplaceContent,
  meetsPrimaryListingBar,
  getMarketplaceContent,
} from "../../site/src/lib/content/marketplace.ts";

describe("marketplace content layer", () => {
  it("admits commercial MCP listings with official docs and homepage even without GitHub", () => {
    const listing = {
      name: "Hosted MCP Gateway",
      kind: "mcp-server",
      description: "Managed MCP gateway for enterprise teams.",
      homepage: "https://example.com",
      docsUrl: "https://example.com/docs",
      install: "Contact sales",
    };

    assert.equal(meetsPrimaryListingBar(listing), true);
    assert.equal(derivePricingModel(listing), "commercial");
  });

  it("rejects sparse listings from the primary catalog", () => {
    const sparse = {
      name: "Mystery MCP",
      kind: "mcp-server",
      description: "",
      homepage: "",
      docsUrl: "",
      install: "",
    };

    assert.equal(meetsPrimaryListingBar(sparse), false);
  });

  it("derives compatibility hints from platform keywords", () => {
    const compatibility = deriveCompatibilityProfile({
      name: "Claude VS Code Bridge",
      kind: "mcp-server",
      tags: ["claude-code", "vscode", "mcp"],
      description: "Connect Claude and VS Code workflows through MCP.",
    });

    assert.ok(compatibility.platforms.some((platform) => platform.slug === "claude"));
    assert.ok(compatibility.platforms.some((platform) => platform.slug === "vscode"));
  });

  it("scores complete, recent tools above archived sparse tools", () => {
    const rich = deriveQualityScore({
      name: "Rich Tool",
      kind: "mcp-server",
      description: "Useful MCP tool with docs, install, and screenshots.",
      homepage: "https://example.com",
      docsUrl: "https://example.com/docs",
      install: "npm install rich-tool",
      screenshot: "/screenshots/rich-tool.png",
      updatedAt: new Date().toISOString(),
      stars: 120,
      deprecated: false,
    });

    const archived = deriveQualityScore({
      name: "Archived Tool",
      kind: "mcp-server",
      description: "Old tool.",
      homepage: "https://example.com",
      docsUrl: "",
      install: "",
      updatedAt: "2022-01-01T00:00:00.000Z",
      stars: 0,
      deprecated: true,
    });

    assert.ok(rich.score > archived.score);
    assert.equal(rich.verified, true);
    assert.equal(archived.verified, false);
  });

  it("builds marketplace models for browse, categories, platforms, collections, docs, and stats", () => {
    const content = getMarketplaceContent();

    assert.ok(content.catalog.primary.length > 0, "primary catalog should not be empty");
    assert.ok(content.categories.length > 0, "categories should be generated");
    assert.ok(content.platforms.length > 0, "platforms should be generated");
    assert.ok(content.collections.length > 0, "collections should be generated");
    assert.ok(content.docs.length >= 4, "docs hub should expose seed documentation");
    assert.ok(content.stats.totalListings >= content.catalog.primary.length, "stats should summarize catalog size");
    assert.ok(content.catalog.primary.every((entry) => meetsPrimaryListingBar(entry)), "primary catalog should only include valid listings");
  });

  it("merges external commercial seed listings into the marketplace dataset", () => {
    const content = buildMarketplaceContent(
      [],
      [
        {
          slug: "hosted-mcp-gateway",
          name: "Hosted MCP Gateway",
          kind: "mcp-server",
          description: "Managed MCP routing for enterprise teams.",
          homepage: "https://example.com",
          docsUrl: "https://example.com/docs",
          install: "Contact sales",
          tags: ["mcp", "enterprise"],
          updatedAt: new Date().toISOString(),
        },
      ],
    );

    const entry = content.catalog.primary.find((item) => item.slug === "hosted-mcp-gateway");
    assert.ok(entry, "external seed listing should be included in the primary catalog");
    assert.equal(entry?.sourceType, "external");
    assert.equal(entry?.pricing, "commercial");
  });
});
