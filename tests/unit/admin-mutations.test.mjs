import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

async function loadControlPlaneModule() {
  const modulePath = path.join(ROOT, "site", "src", "lib", "admin", "control-plane.mjs");
  return import(pathToFileURL(modulePath).href);
}

async function loadStoreModule() {
  const modulePath = path.join(ROOT, "site", "src", "lib", "admin", "store.mjs");
  return import(pathToFileURL(modulePath).href);
}

function createBaseStore(overrides = {}) {
  return {
    version: 1,
    users: [],
    submissions: [],
    catalogDrafts: [],
    reviews: [],
    overrideWorkItems: [],
    approvals: [],
    campaigns: [],
    jobs: [],
    opsRuns: [],
    releases: [],
    exports: [],
    auditFindings: [],
    auditEvents: [],
    telemetrySnapshots: [],
    notifications: [],
    idempotencyLedger: {},
    settings: {
      freezePromotion: false,
      environmentMode: "internal",
      safetyCaps: { maxNamesPerRun: 50, failMode: "fail-closed", maxDailyExports: 3 },
    },
    ...overrides,
  };
}

let tempDir;
let sqlitePath;
let originalSqlitePath;
let originalNodeEnv;

beforeEach(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-admin-mutations-"));
  sqlitePath = path.join(tempDir, "admin.sqlite");
  originalSqlitePath = process.env.ADMIN_STATE_SQLITE_PATH;
  originalNodeEnv = process.env.NODE_ENV;
  process.env.ADMIN_STATE_SQLITE_PATH = sqlitePath;
  process.env.NODE_ENV = "production";

  const { saveRawAdminStore } = await loadStoreModule();
  await saveRawAdminStore(createBaseStore(), { ADMIN_STATE_SQLITE_PATH: sqlitePath });
});

afterEach(() => {
  if (typeof originalSqlitePath === "string") {
    process.env.ADMIN_STATE_SQLITE_PATH = originalSqlitePath;
  } else {
    delete process.env.ADMIN_STATE_SQLITE_PATH;
  }

  if (typeof originalNodeEnv === "string") {
    process.env.NODE_ENV = originalNodeEnv;
  } else {
    delete process.env.NODE_ENV;
  }

  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("admin mutation safety", () => {
  it("preserves existing catalog draft fields when patching by slug", async () => {
    const { saveRawAdminStore } = await loadStoreModule();
    const { saveCatalogDraft } = await loadControlPlaneModule();

    await saveRawAdminStore(
      createBaseStore({
        catalogDrafts: [
          {
            id: "draft_tool_compass",
            slug: "tool-compass",
            name: "Tool Compass",
            tagline: "Existing staged copy",
            category: "devtools",
            featured: true,
            publicProof: true,
            tags: ["search", "ops"],
            status: "in_review",
            reason: "Current homepage slot",
            ownerId: "usr_owner",
            createdAt: "2026-03-10T10:00:00.000Z",
            updatedAt: "2026-03-10T10:00:00.000Z",
          },
        ],
      }),
      { ADMIN_STATE_SQLITE_PATH: sqlitePath }
    );

    const result = await saveCatalogDraft(
      {
        slug: "tool-compass",
        reason: "Updated launch rationale",
      },
      { actorId: "usr_operator" }
    );

    assert.equal(result.state.catalogDrafts.length, 1);
    assert.equal(result.data.id, "draft_tool_compass");
    assert.equal(result.data.tagline, "Existing staged copy");
    assert.equal(result.data.category, "devtools");
    assert.equal(result.data.featured, true);
    assert.equal(result.data.publicProof, true);
    assert.deepEqual(result.data.tags, ["search", "ops"]);
    assert.equal(result.data.status, "in_review");
    assert.equal(result.data.reason, "Updated launch rationale");
  });

  it("preserves existing campaign fields when patching by week", async () => {
    const { saveRawAdminStore } = await loadStoreModule();
    const { saveCampaign } = await loadControlPlaneModule();

    await saveRawAdminStore(
      createBaseStore({
        campaigns: [
          {
            id: "cmp_2026_w11",
            week: "2026-W11",
            status: "scheduled",
            slugs: ["tool-compass", "registry-stats"],
            channels: ["presskit", "homepage"],
            notes: "Existing bundle note",
            ownerId: "usr_owner",
            createdAt: "2026-03-10T10:00:00.000Z",
            updatedAt: "2026-03-10T10:00:00.000Z",
          },
        ],
      }),
      { ADMIN_STATE_SQLITE_PATH: sqlitePath }
    );

    const result = await saveCampaign(
      {
        week: "2026-W11",
        status: "approved",
      },
      { actorId: "usr_operator" }
    );

    assert.equal(result.state.campaigns.length, 1);
    assert.equal(result.data.id, "cmp_2026_w11");
    assert.deepEqual(result.data.slugs, ["tool-compass", "registry-stats"]);
    assert.deepEqual(result.data.channels, ["presskit", "homepage"]);
    assert.equal(result.data.notes, "Existing bundle note");
    assert.equal(result.data.status, "approved");
  });

  it("accepts scheduled as a valid campaign status from the live promotions workflow", async () => {
    const { saveCampaign } = await loadControlPlaneModule();

    const result = await saveCampaign(
      {
        week: "2026-W52",
        status: "scheduled",
        slugs: ["tool-compass", "registry-stats"],
        channels: ["homepage", "presskit"],
        notes: "Queued for the weekly export window.",
      },
      { actorId: "usr_operator" }
    );

    assert.equal(result.data.week, "2026-W52");
    assert.equal(result.data.status, "scheduled");
    assert.deepEqual(result.data.slugs, ["tool-compass", "registry-stats"]);
    assert.deepEqual(result.data.channels, ["homepage", "presskit"]);
  });

  it("updates an existing quality finding instead of duplicating it", async () => {
    const { saveRawAdminStore, loadRawAdminStore } = await loadStoreModule();
    const { saveAuditFinding } = await loadControlPlaneModule();

    await saveRawAdminStore(
      createBaseStore({
        auditFindings: [
          {
            id: "finding_readme_health",
            module: "quality",
            title: "README health regression",
            summary: "Install docs no longer match current flow.",
            slug: "ledger-suite",
            severity: "high",
            status: "open",
            ownerId: "usr_owner",
            createdAt: "2026-03-09T09:00:00.000Z",
            updatedAt: "2026-03-09T09:00:00.000Z",
          },
        ],
      }),
      { ADMIN_STATE_SQLITE_PATH: sqlitePath }
    );

    const result = await saveAuditFinding(
      {
        id: "finding_readme_health",
        title: "README health regression",
        slug: "ledger-suite",
        status: "resolved",
      },
      { actorId: "usr_operator" }
    );
    const persisted = await loadRawAdminStore({ ADMIN_STATE_SQLITE_PATH: sqlitePath });

    assert.equal(persisted.auditFindings.length, 1);
    assert.equal(result.data.id, "finding_readme_health");
    assert.equal(result.data.status, "resolved");
    assert.equal(result.data.summary, "Install docs no longer match current flow.");
    assert.equal(result.data.createdAt, "2026-03-09T09:00:00.000Z");
  });

  it("rejects invalid mutation enum values and malformed telemetry scores", async () => {
    const {
      saveOverrideWorkItem,
      saveCampaign,
      saveAuditFinding,
      saveTelemetrySnapshot,
      queueAdminJob,
    } = await loadControlPlaneModule();
    const { loadRawAdminStore } = await loadStoreModule();

    await assert.rejects(
      () => saveOverrideWorkItem({ slug: "ledger-suite", policy: "random", severity: "warning" }, { actorId: "usr_operator" }),
      /invalid override policy/i
    );
    await assert.rejects(
      () => saveCampaign({ week: "2026-W11", status: "launched" }, { actorId: "usr_operator" }),
      /invalid campaign status/i
    );
    await assert.rejects(
      () => saveAuditFinding({ title: "README health regression", severity: "severe" }, { actorId: "usr_operator" }),
      /invalid finding severity/i
    );
    await assert.rejects(
      () => saveTelemetrySnapshot({ label: "Verification rate", anomalyScore: "abc" }, { actorId: "usr_operator" }),
      /invalid anomaly score/i
    );
    await assert.rejects(
      () => queueAdminJob({ action: "launch", kind: "pipeline", scope: "2026-W11" }, { actorId: "usr_operator" }),
      /invalid job action/i
    );

    const persisted = await loadRawAdminStore({ ADMIN_STATE_SQLITE_PATH: sqlitePath });
    assert.equal(persisted.overrideWorkItems.length, 0);
    assert.equal(persisted.campaigns.length, 0);
    assert.equal(persisted.auditFindings.length, 0);
    assert.equal(persisted.telemetrySnapshots.length, 0);
    assert.equal(persisted.jobs.length, 0);
  });
});
