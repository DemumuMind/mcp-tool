import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  partitionPublicQueue,
  sanitizePublicSubmission,
} from "../../site/src/lib/submissions/public-queue.mjs";

function makeSubmission(overrides = {}) {
  return {
    slug: "zip-meta-map",
    status: "pending",
    lane: "promo",
    submittedAt: "2026-03-15T18:46:27.270Z",
    updatedAt: "2026-03-16T09:12:00.000Z",
    tool: {
      name: "Zip Meta Map",
      slug: "zip-meta-map",
      repo: "https://github.com/DemumuMind/zip-meta-map",
    },
    category: "devtools",
    kind: "cli",
    pitch: "Map zip archives into metadata snapshots with repeatable outputs.",
    pr: "https://github.com/DemumuMind/mcp-tool/pull/42",
    ...overrides,
  };
}

describe("sanitizePublicSubmission", () => {
  it("drops reviewer-only and unknown fields from queue records", () => {
    const sanitized = sanitizePublicSubmission(
      makeSubmission({
        reviewNotes: "Internal escalation detail",
        lastReviewedAt: "2026-03-16T11:11:11.000Z",
        sourcePr: "https://github.com/DemumuMind/mcp-tool/pull/999",
        reason: "operator-only note",
        maintainerEmail: "hidden@example.com",
      }),
    );

    assert.deepEqual(Object.keys(sanitized).sort(), [
      "category",
      "kind",
      "lane",
      "pitch",
      "pr",
      "slug",
      "status",
      "submittedAt",
      "tool",
      "updatedAt",
    ]);
    assert.equal("reviewNotes" in sanitized, false);
    assert.equal("lastReviewedAt" in sanitized, false);
    assert.equal("sourcePr" in sanitized, false);
    assert.equal("reason" in sanitized, false);
    assert.equal("maintainerEmail" in sanitized, false);
  });
});

describe("partitionPublicQueue", () => {
  it("groups noisy records by public status without exposing reviewer-only fields", () => {
    const grouped = partitionPublicQueue([
      makeSubmission({
        status: "needs-info",
        reviewNotes: "Need more proof",
      }),
      makeSubmission({
        slug: "alpha-proof",
        status: "accepted",
        lane: "experiment",
      }),
    ]);

    assert.equal(grouped.needsInfo.length, 1);
    assert.equal(grouped.accepted.length, 1);
    assert.equal(grouped.needsInfo[0].slug, "zip-meta-map");
    assert.equal("reviewNotes" in grouped.needsInfo[0], false);
    assert.equal(grouped.accepted[0].lane, "experiment");
  });
});
