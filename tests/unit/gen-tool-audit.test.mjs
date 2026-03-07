import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  buildMatrixProjects,
  buildProofData,
  resolveToolAuditPaths,
} from "../../scripts/lib/tool-audit.mjs";

describe("resolveToolAuditPaths", () => {
  it("writes truth-matrix inside the marketing repo audit directory", () => {
    const scriptDir = path.join("C:", "workspace", "repo", "mcp-tool", "scripts");
    const paths = resolveToolAuditPaths(scriptDir);

    assert.equal(paths.shopRoot, path.join("C:", "workspace", "repo", "mcp-tool"));
    assert.equal(paths.workspaceRoot, path.join("C:", "workspace", "repo"));
    assert.equal(
      paths.truthMatrixPath,
      path.join("C:", "workspace", "repo", "mcp-tool", "audit", "truth-matrix.json")
    );
  });
});

describe("buildMatrixProjects", () => {
  it("preserves previous audit state when the repo is unavailable locally", () => {
    const projects = [
      { name: "Known Tool", repo: "known-tool", kind: "library", stability: "stable", unlisted: false },
      { name: "New Tool", repo: "new-tool", kind: "cli", stability: "beta", unlisted: false },
    ];

    const previousMatrixProjects = [
      {
        name: "Known Tool",
        path: "known-tool",
        type: "library",
        status: "stable",
        unlisted: false,
        audit: {
          ci: true,
          build: true,
          readme: true,
          license: true,
          proofs: ["npm", "ci"],
        },
      },
    ];

    const currentAuditsByRepo = new Map([
      [
        "new-tool",
        {
          ci: false,
          build: true,
          readme: true,
          license: true,
          proofs: ["npm"],
        },
      ],
    ]);

    const matrixProjects = buildMatrixProjects({
      projects,
      previousMatrixProjects,
      currentAuditsByRepo,
    });

    assert.deepEqual(matrixProjects, [
      {
        name: "Known Tool",
        path: "known-tool",
        type: "library",
        status: "stable",
        unlisted: false,
        audit: {
          ci: true,
          build: true,
          readme: true,
          license: true,
          proofs: ["npm", "ci"],
        },
      },
      {
        name: "New Tool",
        path: "new-tool",
        type: "cli",
        status: "beta",
        unlisted: false,
        audit: {
          ci: false,
          build: true,
          readme: true,
          license: true,
          proofs: ["npm"],
        },
      },
    ]);
  });

  it("reconstructs minimal audit state from previous proof data when truth matrix is unavailable", () => {
    const projects = [
      { name: "Known Tool", repo: "known-tool", kind: "library", stability: "stable", unlisted: false },
    ];

    const matrixProjects = buildMatrixProjects({
      projects,
      previousMatrixProjects: [],
      previousProofs: [
        {
          repo: "known-tool",
          proofs: ["npm", "ci"],
          verified: true,
          concept: false,
        },
      ],
      currentAuditsByRepo: new Map(),
    });

    assert.deepEqual(buildProofData(matrixProjects), [
      {
        repo: "known-tool",
        proofs: ["npm", "ci"],
        verified: true,
        concept: false,
      },
    ]);
  });

  it("prefers previous proof state over stale previous matrix state for unavailable repos", () => {
    const projects = [
      { name: "Known Tool", repo: "known-tool", kind: "library", stability: "stable", unlisted: false },
    ];

    const matrixProjects = buildMatrixProjects({
      projects,
      previousMatrixProjects: [
        {
          name: "Known Tool",
          path: "known-tool",
          type: "library",
          status: "stable",
          unlisted: false,
          audit: {
            ci: false,
            build: false,
            readme: false,
            license: false,
            proofs: [],
          },
        },
      ],
      previousProofs: [
        {
          repo: "known-tool",
          proofs: ["npm", "ci"],
          verified: true,
          concept: false,
        },
      ],
      currentAuditsByRepo: new Map(),
    });

    assert.deepEqual(buildProofData(matrixProjects), [
      {
        repo: "known-tool",
        proofs: ["npm", "ci"],
        verified: true,
        concept: false,
      },
    ]);
  });

  it("omits unavailable repos with no current or historical audit evidence", () => {
    const projects = [
      { name: "Unknown Tool", repo: "unknown-tool", kind: "library", stability: "stable", unlisted: false },
    ];

    const matrixProjects = buildMatrixProjects({
      projects,
      previousMatrixProjects: [],
      previousProofs: [],
      currentAuditsByRepo: new Map(),
    });

    assert.deepEqual(matrixProjects, []);
  });

  it("treats all-false previous matrix audit as missing evidence", () => {
    const projects = [
      { name: "Unknown Tool", repo: "unknown-tool", kind: "library", stability: "stable", unlisted: false },
    ];

    const matrixProjects = buildMatrixProjects({
      projects,
      previousMatrixProjects: [
        {
          name: "Unknown Tool",
          path: "unknown-tool",
          type: "library",
          status: "stable",
          unlisted: false,
          audit: {
            ci: false,
            build: false,
            readme: false,
            license: false,
            proofs: [],
          },
        },
      ],
      previousProofs: [],
      currentAuditsByRepo: new Map(),
    });

    assert.deepEqual(matrixProjects, []);
  });
});

describe("buildProofData", () => {
  it("derives proof pills from merged matrix projects without dropping preserved verification", () => {
    const proofData = buildProofData([
      {
        path: "known-tool",
        audit: { ci: true, build: true, proofs: ["npm", "ci"] },
      },
      {
        path: "new-tool",
        audit: { ci: false, build: true, proofs: ["npm"] },
      },
    ]);

    assert.deepEqual(proofData, [
      {
        repo: "known-tool",
        proofs: ["npm", "ci"],
        verified: true,
        concept: false,
      },
      {
        repo: "new-tool",
        proofs: ["npm"],
        verified: false,
        concept: true,
      },
    ]);
  });
});
