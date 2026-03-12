import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildFrontDoorPlaceholderTargets,
  generateSvg,
  resolvePlaceholderFamily,
  shouldGeneratePlaceholder,
} from "../../scripts/gen-placeholders.mjs";

function makeProject(overrides = {}) {
  return {
    name: "Example Tool",
    repo: "example-tool",
    tagline: "Example tagline for placeholder generation.",
    description: "Example description for placeholder generation.",
    install: "npm install example-tool",
    stability: "stable",
    kind: "cli",
    ...overrides,
  };
}

describe("resolvePlaceholderFamily", () => {
  it("maps cli and library tools to the package family", () => {
    assert.equal(resolvePlaceholderFamily(makeProject({ kind: "cli" })), "package");
    assert.equal(resolvePlaceholderFamily(makeProject({ kind: "library" })), "package");
  });

  it("maps mcp servers to the protocol family", () => {
    assert.equal(resolvePlaceholderFamily(makeProject({ kind: "mcp-server" })), "protocol");
  });

  it("maps desktop and editor surfaces to the window family", () => {
    assert.equal(resolvePlaceholderFamily(makeProject({ kind: "desktop-app" })), "window");
    assert.equal(resolvePlaceholderFamily(makeProject({ kind: "vscode-extension" })), "window");
  });
});

describe("generateSvg", () => {
  it("renders family-specific markers for package tools", () => {
    const svg = generateSvg(makeProject({ kind: "cli" }));
    assert.match(svg, /data-family="package"/);
    assert.match(svg, /INSTALL/);
  });

  it("renders family-specific markers for protocol tools", () => {
    const svg = generateSvg(makeProject({ kind: "mcp-server" }));
    assert.match(svg, /data-family="protocol"/);
    assert.match(svg, /Protocol Surface/);
  });

  it("renders family-specific markers for window tools", () => {
    const svg = generateSvg(makeProject({ kind: "desktop-app" }));
    assert.match(svg, /data-family="window"/);
    assert.match(svg, /Window Surface/);
  });
});

describe("shouldGeneratePlaceholder", () => {
  it("never regenerates real screenshots", () => {
    assert.equal(shouldGeneratePlaceholder({ hasFile: true, hasReal: true, force: true }), false);
    assert.equal(shouldGeneratePlaceholder({ hasFile: false, hasReal: true, force: false }), false);
  });

  it("allows force regeneration for placeholders", () => {
    assert.equal(shouldGeneratePlaceholder({ hasFile: true, hasReal: false, force: true }), true);
  });
});

describe("buildFrontDoorPlaceholderTargets", () => {
  it("matches registry ids to projects by normalized repo/name and skips internal tools", () => {
    const projects = [
      makeProject({ name: "ClaimLedger", repo: "ClaimLedger", kind: "library" }),
      makeProject({ name: "WebSketch MCP", repo: "websketch-mcp", kind: "mcp-server" }),
    ];
    const registry = [
      { id: "claim-ledger", name: "ClaimLedger", tags: [] },
      { id: "websketch-mcp", name: "WebSketch MCP", tags: [] },
      { id: "internal-tool", name: "Internal Tool", tags: ["internal"] },
    ];

    const targets = buildFrontDoorPlaceholderTargets({ projects, registry, overrides: {} });
    const ids = targets.map((target) => target.id);

    assert.deepEqual(ids, ["claim-ledger", "websketch-mcp"]);
    assert.equal(targets[0].project.repo, "ClaimLedger");
    assert.equal(targets[0].outputName, "claim-ledger.png");
    assert.equal(targets[1].project.repo, "websketch-mcp");
  });

  it("falls back to registry metadata when no project entry exists", () => {
    const targets = buildFrontDoorPlaceholderTargets({
      projects: [makeProject()],
      registry: [{ id: "mcp-docs", name: "MCP Docs", description: "Registry-only surface", tags: [] }],
      overrides: {},
    });

    assert.equal(targets.length, 1);
    assert.equal(targets[0].id, "mcp-docs");
    assert.equal(targets[0].project.repo, "mcp-docs");
    assert.equal(targets[0].project.name, "MCP Docs");
  });
});
