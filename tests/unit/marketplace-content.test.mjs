import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveCompatibilityProfile,
  derivePricingModel,
  deriveQualityScore,
  buildMarketplaceContent,
  getTrendScore,
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

  it("respects explicit pricing overrides for hosted marketplace listings", () => {
    assert.equal(
      derivePricingModel({
        name: "Hosted Free MCP",
        homepage: "https://example.com",
        docsUrl: "https://example.com/docs",
        pricing: "free",
      }),
      "free",
    );
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

  it("detects newer hosted MCP client ecosystems from seed-style metadata", () => {
    const compatibility = deriveCompatibilityProfile({
      name: "Remote Workflow Hub",
      kind: "mcp-server",
      tags: ["chatgpt", "windsurf", "gemini", "remote-mcp"],
      description: "Hosted remote MCP for ChatGPT, Windsurf, and Gemini clients.",
    });

    assert.ok(compatibility.platforms.some((platform) => platform.slug === "chatgpt"));
    assert.ok(compatibility.platforms.some((platform) => platform.slug === "windsurf"));
    assert.ok(compatibility.platforms.some((platform) => platform.slug === "gemini"));
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

  it("includes real commercial and non-GitHub MCP products in the default seed catalog", () => {
    const content = getMarketplaceContent();
    const commercialSlugs = new Set(
      content.catalog.primary
        .filter((entry) => entry.sourceType === "external")
        .map((entry) => entry.slug),
    );

    assert.ok(commercialSlugs.has("github-mcp-server"));
    assert.ok(commercialSlugs.has("stripe-mcp"));
    assert.ok(commercialSlugs.has("zapier-mcp"));
    assert.ok(commercialSlugs.has("notion-mcp"));
    assert.ok(content.stats.commercialListings >= 4);
  });

  it("rewards wider supported-client coverage in marketplace scoring", () => {
    const base = deriveQualityScore({
      name: "Single Client MCP",
      kind: "mcp-server",
      description: "Managed MCP server.",
      homepage: "https://example.com",
      docsUrl: "https://example.com/docs",
      updatedAt: new Date().toISOString(),
      tags: ["mcp", "claude"],
    });

    const broad = deriveQualityScore({
      name: "Multi Client MCP",
      kind: "mcp-server",
      description: "Managed MCP server.",
      homepage: "https://example.com",
      docsUrl: "https://example.com/docs",
      updatedAt: new Date().toISOString(),
      tags: ["mcp", "claude", "chatgpt", "cursor", "windsurf"],
    });

    assert.ok(broad.score > base.score);
  });

  it("treats adoption readiness as a separate ranking advantage", () => {
    const docsOnly = deriveQualityScore({
      name: "Docs Only MCP",
      kind: "mcp-server",
      description: "Managed MCP server.",
      homepage: "https://example.com",
      docsUrl: "https://example.com/docs",
      updatedAt: new Date().toISOString(),
    });

    const adoptable = deriveQualityScore({
      name: "Adoptable MCP",
      kind: "mcp-server",
      description: "Managed MCP server.",
      homepage: "https://example.com",
      docsUrl: "https://example.com/docs",
      install: "npm install adoptable-mcp",
      goodFor: ["Production workflows", "Fast pilot rollouts"],
      updatedAt: new Date().toISOString(),
    });

    assert.ok(adoptable.breakdown.adoption > docsOnly.breakdown.adoption);
    assert.ok(adoptable.score > docsOnly.score);
  });

  it("rewards dedicated docs maturity above repo-readme docs", () => {
    const readmeDocs = deriveQualityScore({
      name: "Readme Docs MCP",
      repo: "readme-docs-mcp",
      kind: "mcp-server",
      description: "Managed MCP server with a repo readme only.",
      updatedAt: new Date().toISOString(),
    });

    const dedicatedDocs = deriveQualityScore({
      name: "Dedicated Docs MCP",
      kind: "mcp-server",
      description: "Managed MCP server with dedicated documentation.",
      homepage: "https://example.com",
      docsUrl: "https://docs.example.com/mcp",
      updatedAt: new Date().toISOString(),
    });

    assert.ok(dedicatedDocs.breakdown.docs > readmeDocs.breakdown.docs);
  });

  it("keeps hosted docs-first listings competitive without forcing install commands", () => {
    const hosted = deriveQualityScore({
      name: "Hosted MCP",
      kind: "mcp-server",
      description: "Hosted MCP service with official docs.",
      homepage: "https://example.com",
      docsUrl: "https://docs.example.com/mcp",
      pricing: "free",
      updatedAt: new Date().toISOString(),
      tags: ["mcp", "remote-mcp", "chatgpt"],
    });

    const sparseRepo = deriveQualityScore({
      name: "Sparse Repo MCP",
      repo: "sparse-repo-mcp",
      kind: "mcp-server",
      description: "Hosted MCP service with official docs.",
      updatedAt: new Date().toISOString(),
      tags: ["mcp"],
    });

    assert.ok(hosted.score > sparseRepo.score);
  });

  it("uses freshness and release momentum in trend scoring, not just stars", () => {
    const now = new Date().toISOString();
    const hot = getTrendScore({
      stars: 2,
      updatedAt: now,
      releasePublishedAt: now,
      compatibility: {
        platforms: [{ slug: "claude", title: "Claude", description: "" }],
        transports: ["STDIO"],
        runtimeSignals: ["Node.js"],
      },
      quality: {
        score: 86,
        verified: true,
      },
      featured: false,
      registered: true,
    });

    const stale = getTrendScore({
      stars: 2,
      updatedAt: "2024-01-01T00:00:00.000Z",
      releasePublishedAt: "2024-01-01T00:00:00.000Z",
      compatibility: {
        platforms: [{ slug: "terminal", title: "Terminal", description: "" }],
        transports: [],
        runtimeSignals: [],
      },
      quality: {
        score: 86,
        verified: true,
      },
      featured: false,
      registered: false,
    });

    assert.ok(hot > stale);
  });
});
