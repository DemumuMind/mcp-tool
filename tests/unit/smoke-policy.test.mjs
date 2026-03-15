import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifySmokeOutcome,
  detectDegradedMarketingMode,
  isDegradedMarketingLabel,
} from "../../scripts/lib/smoke.mjs";

describe("smoke policy", () => {
  it("detects degraded marketing mode only when links.json exists and is empty", () => {
    assert.equal(detectDegradedMarketingMode({ links: [] }), true);
    assert.equal(detectDegradedMarketingMode({ links: [{ id: "zmm-hn" }] }), false);
    assert.equal(detectDegradedMarketingMode(null), false);
    assert.equal(detectDegradedMarketingMode({}), false);
  });

  it("marks marketing artifact failures as warnings in degraded mode", () => {
    assert.equal(isDegradedMarketingLabel("presskit: zip-meta-map"), true);
    assert.equal(isDegradedMarketingLabel("partner: manifest"), true);
    assert.equal(isDegradedMarketingLabel("go-link: zmm-hn"), true);

    const outcome = classifySmokeOutcome({
      label: "presskit: zip-meta-map",
      ok: false,
      degradedMarketingMode: true,
    });

    assert.equal(outcome.level, "warn");
  });

  it("keeps core route failures as hard failures even in degraded mode", () => {
    const outcome = classifySmokeOutcome({
      label: "homepage",
      ok: false,
      degradedMarketingMode: true,
    });

    assert.equal(outcome.level, "fail");
  });

  it("keeps marketing artifact failures hard when degraded mode is not active", () => {
    const outcome = classifySmokeOutcome({
      label: "presskit: machine-readable",
      ok: false,
      degradedMarketingMode: false,
    });

    assert.equal(outcome.level, "fail");
  });
});
