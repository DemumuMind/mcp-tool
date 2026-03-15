import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyBrowseState,
  buildBrowseHref,
  getBrowsePresetModel,
  getBrowsePresetModels,
  getMarketplaceContent,
} from "../../site/src/lib/content/marketplace.ts";

describe("marketplace browse presets", () => {
  it("builds a hosted preset that targets external listings instead of pricing only", () => {
    const preset = getBrowsePresetModel("hosted");

    assert.ok(preset);
    assert.equal(preset?.state.source, "external");
    assert.equal(buildBrowseHref(preset?.state || {}), "/tools/?source=external");
  });

  it("returns preset landing models with sample tools", () => {
    const presets = getBrowsePresetModels();

    assert.ok(presets.length >= 4);
    assert.ok(presets.every((preset) => preset.featuredTools.length > 0));
  });

  it("applies hosted preset state to yield only external listings", () => {
    const preset = getBrowsePresetModel("hosted");
    const results = applyBrowseState(getMarketplaceContent().catalog.primary, preset?.state || {});

    assert.ok(results.length > 0);
    assert.ok(results.every((entry) => entry.sourceType === "external"));
  });
});
