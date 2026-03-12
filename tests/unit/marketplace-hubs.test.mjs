import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_COMPARE_PAIRS,
  getBrowsePresetModel,
  getBrowsePresetModels,
  getCompareHubModel,
  getComparisonPairs,
} from "../../site/src/lib/content/marketplace.ts";

describe("marketplace hubs", () => {
  it("caps compare pair generation to a fixed upper bound", () => {
    const pairs = getComparisonPairs();

    assert.ok(pairs.length > 0);
    assert.ok(pairs.length <= MAX_COMPARE_PAIRS);
  });

  it("builds a compare hub model with grouped category and platform lanes", () => {
    const hub = getCompareHubModel();

    assert.ok(hub.totalPairs > 0);
    assert.ok(hub.totalPages >= 1);
    assert.ok(hub.featuredPairs.length > 0);
    assert.ok(hub.groups.length > 0);
    assert.ok(hub.groups.some((group) => group.kind === "category"));
    assert.ok(hub.groups.some((group) => group.kind === "platform"));
  });

  it("builds hosted and builder preset models from marketplace content", () => {
    const presets = getBrowsePresetModels();
    const hosted = getBrowsePresetModel("hosted");
    const builders = getBrowsePresetModel("builders");

    assert.ok(presets.length >= 4);
    assert.ok(hosted);
    assert.ok(builders);
    assert.equal(hosted?.state.source, "external");
    assert.ok(hosted?.count > 0);
    assert.ok(hosted?.featuredTools.length > 0);
    assert.ok(hosted?.featuredTools.every((tool) => tool.sourceType === "external"));
    assert.equal(builders?.state.pricing, "open-source");
    assert.ok(typeof builders?.browseHref === "string" && builders.browseHref.startsWith("/tools/?"));
  });
});
