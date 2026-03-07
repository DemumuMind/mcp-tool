import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const SCRIPT_PATH = path.join(import.meta.dirname, "..", "..", "scripts", "sync-org-metadata.mjs");

const tempDirs = [];

function makeTempRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), "sync-org-metadata-"));
  tempDirs.push(dir);

  mkdirSync(path.join(dir, "site", "src", "data", "registry"), { recursive: true });

  writeJson(path.join(dir, "site", "src", "data", "overrides.json"), {});
  writeJson(path.join(dir, "site", "src", "data", "automation.ignore.json"), []);
  writeJson(path.join(dir, "site", "src", "data", "registry", "aliases.json"), {});

  return dir;
}

function writeJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeMockFetch(dir, handlers) {
  const mockPath = path.join(dir, "mock-fetch.mjs");
  const source = `
const handlers = ${JSON.stringify(handlers, null, 2)};

globalThis.fetch = async function mockFetch(url) {
  const key = String(url);
  if (!(key in handlers)) {
    throw new Error("Unexpected fetch: " + key);
  }

  const { status = 200, body } = handlers[key];
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  };
};
`;

  writeFileSync(mockPath, source, "utf8");
  return mockPath;
}

function runSync(dir, handlers) {
  const mockPath = writeMockFetch(dir, handlers);
  execFileSync(process.execPath, ["--import", pathToFileURL(mockPath).href, SCRIPT_PATH], {
    cwd: dir,
    env: { ...process.env, ORG: "DemumuMind" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("sync-org-metadata", () => {
  it("keeps missing registry repos only in cleanup queue and out of projects.json", () => {
    const dir = makeTempRepo();

    writeJson(path.join(dir, "site", "src", "data", "registry", "registry.json"), {
      schema_version: "1.0",
      tools: [
        {
          id: "ghost-tool",
          name: "Ghost Tool",
          repo: "https://github.com/DemumuMind/ghost-tool",
          description: "Should stay in cleanup only",
          tags: ["ghost"],
        },
      ],
    });

    runSync(dir, {
      "https://api.github.com/orgs/DemumuMind/repos?per_page=100&page=1&type=public&sort=updated": {
        body: [],
      },
    });

    const projects = readJson(path.join(dir, "site", "src", "data", "projects.json"));
    const cleanup = readJson(path.join(dir, "site", "src", "data", "registry", "cleanup.json"));

    assert.equal(
      projects.some((project) => project.repo === "ghost-tool"),
      false,
      "missing registry repo should not be published to projects.json"
    );
    assert.deepEqual(cleanup.missing, [
      {
        registryId: "ghost-tool",
        repoName: "ghost-tool",
        repo: "https://github.com/DemumuMind/ghost-tool",
        action: "verify repo exists or remove from registry",
      },
    ]);
  });

  it("keeps archived registry repos published as deprecated", () => {
    const dir = makeTempRepo();

    writeJson(path.join(dir, "site", "src", "data", "registry", "registry.json"), {
      schema_version: "1.0",
      tools: [
        {
          id: "retired-tool",
          name: "Retired Tool",
          repo: "https://github.com/DemumuMind/retired-tool",
          description: "Archived but still known",
          tags: ["archive"],
        },
      ],
    });

    runSync(dir, {
      "https://api.github.com/orgs/DemumuMind/repos?per_page=100&page=1&type=public&sort=updated": {
        body: [
          {
            name: "retired-tool",
            full_name: "DemumuMind/retired-tool",
            archived: true,
            pushed_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-01T00:00:00Z",
            stargazers_count: 3,
            language: "TypeScript",
            topics: ["archive"],
            description: "Archived tool",
          },
        ],
      },
    });

    const projects = readJson(path.join(dir, "site", "src", "data", "projects.json"));
    const cleanup = readJson(path.join(dir, "site", "src", "data", "registry", "cleanup.json"));
    const archived = projects.find((project) => project.repo === "retired-tool");

    assert.ok(archived, "archived registry repo should still be published");
    assert.equal(archived.registered, true);
    assert.equal(archived.unlisted, false);
    assert.equal(archived.deprecated, true);
    assert.equal(cleanup.archived.length, 1);
    assert.equal(cleanup.missing.length, 0);
  });

  it("skips ignored registry ids before warnings and cleanup generation", () => {
    const dir = makeTempRepo();

    writeJson(path.join(dir, "site", "src", "data", "automation.ignore.json"), ["ghost-tool"]);
    writeJson(path.join(dir, "site", "src", "data", "registry", "registry.json"), {
      schema_version: "1.0",
      tools: [
        {
          id: "ghost-tool",
          name: "Ghost Tool",
          repo: "https://github.com/DemumuMind/ghost-tool",
          description: "Ignored locally",
          tags: ["ghost"],
        },
      ],
    });

    runSync(dir, {
      "https://api.github.com/orgs/DemumuMind/repos?per_page=100&page=1&type=public&sort=updated": {
        body: [],
      },
    });

    const projects = readJson(path.join(dir, "site", "src", "data", "projects.json"));
    const cleanup = readJson(path.join(dir, "site", "src", "data", "registry", "cleanup.json"));
    const stats = readJson(path.join(dir, "site", "src", "data", "org-stats.json"));

    assert.equal(projects.length, 0);
    assert.equal(cleanup.totalIssues, 0);
    assert.equal(cleanup.missing.length, 0);
    assert.equal(stats.registryHealth.warnings, 0);
    assert.equal(stats.registryHealth.ignoredRepos, 1);
  });
});
