import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCanonicalCompareHref,
  buildComparisonModel,
  getComparisonPairs,
  getCompatibilitySortScore,
  getRelatedTools,
} from "../../site/src/lib/content/marketplace.ts";

describe("marketplace comparisons", () => {
  it("builds a compare model between two marketplace tools", () => {
    const comparison = buildComparisonModel("comfy-headless", "backpropagate");

    assert.equal(comparison.left.slug, "comfy-headless");
    assert.equal(comparison.right.slug, "backpropagate");
    assert.equal(typeof comparison.summary, "string");
    assert.ok(comparison.summary.length > 20);
    assert.ok(Array.isArray(comparison.sections.compatibility));
    assert.ok(Array.isArray(comparison.sections.adoption));
    assert.ok(comparison.compareTitle.includes("vs"));
    assert.ok(Array.isArray(comparison.scorecard));
    assert.ok(comparison.scorecard.length >= 4);
    assert.ok(comparison.scorecard.every((item) => item.label && item.insight));
    assert.ok(Array.isArray(comparison.recommendations.left));
    assert.ok(Array.isArray(comparison.recommendations.right));
  });

  it("canonicalizes compare hrefs so mirrored routes collapse to one path", () => {
    assert.equal(
      buildCanonicalCompareHref("comfy-headless", "backpropagate"),
      buildCanonicalCompareHref("backpropagate", "comfy-headless"),
    );
  });

  it("produces canonical comparison pairs without mirrored duplicates", () => {
    const pairs = getComparisonPairs();
    const mirroredKeys = new Set(
      pairs.map((pair) => `${pair.left.slug}|${pair.right.slug}`),
    );

    assert.ok(pairs.length > 0);
    for (const pair of pairs) {
      assert.ok(pair.left.slug < pair.right.slug, "pairs should be lexically canonicalized");
      assert.equal(mirroredKeys.has(`${pair.right.slug}|${pair.left.slug}`), false);
    }
  });

  it("filters related tools more aggressively than generic platform overlap", () => {
    const related = getRelatedTools("comfy-headless");
    const slugs = related.map((item) => item.entry.slug);

    assert.ok(slugs.includes("backpropagate"));
    assert.ok(!slugs.includes("xrpl-camp"));
    assert.ok(!slugs.includes("sovereignty"));
    assert.ok(related.every((item) => item.compareHref.includes("/compare/")));
    assert.ok(related.every((item) => item.reason.length > 0));
  });

  it("scores explicit client integrations above generic platform buckets", () => {
    const genericOnly = getCompatibilitySortScore({
      compatibility: {
        platforms: [
          { slug: "any-mcp-client", title: "Any MCP Client", description: "" },
          { slug: "terminal", title: "Terminal", description: "" },
        ],
      },
    });
    const explicit = getCompatibilitySortScore({
      compatibility: {
        platforms: [
          { slug: "claude", title: "Claude Ecosystem", description: "" },
          { slug: "chatgpt", title: "ChatGPT", description: "" },
        ],
      },
    });

    assert.ok(explicit > genericOnly);
  });
});
