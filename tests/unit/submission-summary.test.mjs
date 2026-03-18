import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  compareSubmissionSummaryProjection,
  projectSubmissionToSummary,
} from "../../scripts/lib/submission-summary.mjs";

function makeIntake(overrides = {}) {
  return {
    tool: {
      name: "Zip Meta Map",
      slug: "zip-meta-map",
      repo: "https://github.com/DemumuMind/zip-meta-map",
    },
    category: "devtools",
    kind: "cli",
    pitch: "Map zip archives into metadata snapshots with repeatable outputs.",
    goodFor: ["Metadata snapshots"],
    proof: [
      {
        label: "CI",
        url: "https://github.com/DemumuMind/zip-meta-map/actions",
        whatItProves: "Tests pass on every push",
      },
    ],
    maintainer: {
      handle: "@zip-meta-map",
    },
    submission: {
      lane: "promo",
      submittedAt: "2026-03-15T18:46:27.270Z",
      pr: "https://github.com/DemumuMind/mcp-tool/pull/42",
    },
    ...overrides,
  };
}

describe("projectSubmissionToSummary", () => {
  it("projects intake data into a public-safe queue row while preserving review state", () => {
    const projected = projectSubmissionToSummary(
      makeIntake(),
      {
        slug: "zip-meta-map",
        status: "needs-info",
        updatedAt: "2026-03-16T09:12:00.000Z",
        reviewNotes: "internal only",
        sourcePr: "https://github.com/DemumuMind/mcp-tool/pull/999",
      },
    );

    assert.deepEqual(projected, {
      slug: "zip-meta-map",
      status: "needs-info",
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
    });
  });
});

describe("compareSubmissionSummaryProjection", () => {
  it("flags missing and drifted summary rows against canonical intake files", () => {
    const comparison = compareSubmissionSummaryProjection(
      [makeIntake()],
      {
        submissions: [
          {
            slug: "zip-meta-map",
            status: "pending",
            lane: "promo",
            submittedAt: "2026-03-15T18:46:27.270Z",
            tool: {
              name: "Zip Meta Map",
              slug: "zip-meta-map",
              repo: "https://github.com/DemumuMind/zip-meta-map",
            },
            category: "devtools",
            kind: "cli",
            pitch: "Stale copy that should be refreshed",
            pr: "https://github.com/DemumuMind/mcp-tool/pull/42",
          },
          {
            slug: "orphan-summary-row",
            status: "pending",
            lane: "promo",
            submittedAt: "2026-03-10T00:00:00.000Z",
          },
        ],
      },
    );

    assert.equal(comparison.ok, false);
    assert.ok(comparison.errors.some((error) => error.includes("projection mismatch")));
    assert.ok(comparison.errors.some((error) => error.includes("orphan-summary-row")));
  });
});
