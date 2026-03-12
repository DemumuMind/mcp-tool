import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildComparisonModel, getRelatedTools } from "../../site/src/lib/content/marketplace.ts";

describe("marketplace comparisons", () => {
  it("builds a compare model between two marketplace tools", () => {
    const comparison = buildComparisonModel("comfy-headless", "backpropagate");

    assert.equal(comparison.left.slug, "comfy-headless");
    assert.equal(comparison.right.slug, "backpropagate");
    assert.ok(Array.isArray(comparison.sections.compatibility));
    assert.ok(Array.isArray(comparison.sections.adoption));
    assert.ok(comparison.compareTitle.includes("vs"));
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
});
