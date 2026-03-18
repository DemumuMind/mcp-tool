import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifySmokeOutcome,
  DEGRADED_MARKETING_LABELS,
} from "../../scripts/lib/smoke.mjs";

describe("smoke classification", () => {
  it("downgrades optional generated marketing surfaces to warnings", () => {
    for (const label of DEGRADED_MARKETING_LABELS) {
      assert.deepEqual(
        classifySmokeOutcome({ label, ok: false, degradedMarketingMode: false }),
        { level: "warn" },
        `${label} should be warning-only when the core public site is healthy`,
      );
    }
  });

  it("keeps mandatory public-core checks as failures", () => {
    assert.deepEqual(
      classifySmokeOutcome({ label: "homepage", ok: false, degradedMarketingMode: false }),
      { level: "fail" },
    );
    assert.deepEqual(
      classifySmokeOutcome({ label: "submission queue", ok: false, degradedMarketingMode: false }),
      { level: "fail" },
    );
  });
});
