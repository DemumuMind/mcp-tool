import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";
import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const ROOT = process.cwd();

async function loadStoreModule() {
  const modulePath = path.join(ROOT, "site", "src", "lib", "admin", "store.mjs");
  return import(pathToFileURL(modulePath).href);
}

async function loadSessionModule() {
  const modulePath = path.join(ROOT, "site", "src", "lib", "admin", "session-cookie.mjs");
  return import(pathToFileURL(modulePath).href);
}

async function loadAuthModule() {
  const modulePath = path.join(ROOT, "site", "src", "lib", "admin", "session.mjs");
  return import(pathToFileURL(modulePath).href);
}

describe("admin persistence", () => {
  it("prefers a SQLite-backed durable store when configured", async () => {
    const { resolveAdminStoreConfig } = await loadStoreModule();

    const config = resolveAdminStoreConfig({
      ADMIN_STATE_SQLITE_PATH: "C:/state/admin-control-plane.sqlite",
      ADMIN_STATE_GITHUB_REPO: "DemumuMind/admin-state",
      ADMIN_STATE_GITHUB_TOKEN: "token",
    });

    assert.equal(config.backend, "sqlite");
    assert.match(config.path, /admin-control-plane\.sqlite$/);
  });

  it("prefers a durable GitHub-backed state store when production env is configured", async () => {
    const { resolveAdminStoreConfig } = await loadStoreModule();

    const config = resolveAdminStoreConfig({
      ADMIN_STATE_GITHUB_REPO: "DemumuMind/admin-state",
      ADMIN_STATE_GITHUB_TOKEN: "token",
      ADMIN_STATE_GITHUB_PATH: "control-plane/admin.json",
      ADMIN_STATE_GITHUB_BRANCH: "ops-state"
    });

    assert.equal(config.backend, "github");
    assert.equal(config.repo, "DemumuMind/admin-state");
    assert.equal(config.branch, "ops-state");
    assert.equal(config.path, "control-plane/admin.json");
  });

  it("prefers a Postgres-backed durable store when ADMIN_DATABASE_URL points at postgres", async () => {
    const { resolveAdminStoreConfig } = await loadStoreModule();

    const config = resolveAdminStoreConfig({
      ADMIN_DATABASE_URL: "postgres://admin:secret@db.example.com:5432/demumumind",
    });

    assert.equal(config.backend, "postgres");
    assert.equal(config.connectionString, "postgres://admin:secret@db.example.com:5432/demumumind");
    assert.equal(config.table, "admin_control_plane_state");
  });

  it("roundtrips store state through the SQLite backend", async () => {
    const { saveRawAdminStore, loadRawAdminStore } = await loadStoreModule();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-admin-store-"));
    const sqlitePath = path.join(tempDir, "admin.sqlite");
    const store = {
      version: 2,
      users: [
        {
          id: "usr_owner",
          email: "owner@demumumind.internal",
          name: "Alex Orlov",
          role: "Owner",
          status: "active",
          passwordHash: "hash",
        },
      ],
      submissions: [{ id: "sub_1", slug: "tool-compass", status: "in_review" }],
      approvals: [{ id: "apr_1", status: "pending", entityType: "release", entityId: "rel_1" }],
      catalogDrafts: [{ id: "draft_1", slug: "tool-compass", status: "draft", tagline: "staged" }],
      jobs: [],
      opsRuns: [],
      reviews: [],
      overrideWorkItems: [],
      campaigns: [],
      releases: [],
      exports: [],
      auditFindings: [],
      auditEvents: [],
      telemetrySnapshots: [],
      notifications: [{ id: "note_1", kind: "job", title: "Queued", status: "unread" }],
      idempotencyLedger: {},
      settings: {
        freezePromotion: false,
        environmentMode: "internal",
        safetyCaps: { maxNamesPerRun: 50, failMode: "fail-closed", maxDailyExports: 3 },
      },
    };

    await saveRawAdminStore(store, { ADMIN_STATE_SQLITE_PATH: sqlitePath });
    const loaded = await loadRawAdminStore({ ADMIN_STATE_SQLITE_PATH: sqlitePath });
    const sqliteHeader = fs.readFileSync(sqlitePath).subarray(0, 16).toString("utf8");

    assert.deepEqual(loaded, store);
    assert.equal(sqliteHeader, "SQLite format 3\u0000");
  });

  it("mutates seeded state through the Postgres backend when a pool is provided", async () => {
    const { newDb } = await import("pg-mem");
    const { mutateRawAdminStore, loadRawAdminStore } = await loadStoreModule();
    const db = newDb();
    const { Pool } = db.adapters.createPg();
    const pool = new Pool();
    const env = {
      ADMIN_DATABASE_URL: "postgres://admin:secret@db.example.com:5432/demumumind",
    };

    try {
      const result = await mutateRawAdminStore(
        async (store) => {
          store.notifications.push({
            id: "note_pg",
            kind: "ops",
            title: "Postgres mutation",
            status: "unread",
          });
          return store.notifications.length;
        },
        env,
        {
          pgPool: pool,
          seedFactory: () => ({
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
          }),
        }
      );

      const loaded = await loadRawAdminStore(env, { pgPool: pool });

      assert.equal(result.data, 1);
      assert.deepEqual(
        loaded.notifications.map((entry) => entry.id),
        ["note_pg"]
      );
    } finally {
      await pool.end();
    }
  });

  it("does not emit an experimental warning when using the SQLite backend", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-admin-sqlite-warning-"));
    const sqlitePath = path.join(tempDir, "admin.sqlite");
    const script = `
      import path from "node:path";
      import { pathToFileURL } from "node:url";

      const modulePath = path.join(process.cwd(), "site", "src", "lib", "admin", "store.mjs");
      const { saveRawAdminStore, loadRawAdminStore } = await import(pathToFileURL(modulePath).href);

      const store = {
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
          safetyCaps: { maxNamesPerRun: 50, failMode: "fail-closed", maxDailyExports: 3 }
        }
      };

      await saveRawAdminStore(store, process.env);
      await loadRawAdminStore(process.env);
    `;

    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        ADMIN_STATE_SQLITE_PATH: sqlitePath,
        NODE_ENV: "production",
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.doesNotMatch(result.stderr || "", /ExperimentalWarning/i);
  });

  it("serializes concurrent store mutations across processes", async () => {
    const { saveRawAdminStore, loadRawAdminStore } = await loadStoreModule();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-admin-store-lock-"));
    const sqlitePath = path.join(tempDir, "admin.sqlite");
    const barrierPath = path.join(tempDir, "start.signal");
    const workerScript = `
      import path from "node:path";
      import { pathToFileURL } from "node:url";
      import fs from "node:fs/promises";

      const modulePath = path.join(process.cwd(), "site", "src", "lib", "admin", "store.mjs");
      const { mutateRawAdminStore } = await import(pathToFileURL(modulePath).href);

      while (true) {
        try {
          await fs.access(process.env.BARRIER_PATH);
          break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
      }

      await mutateRawAdminStore(async (store) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        store.notifications.push({
          id: process.env.NOTIFICATION_ID,
          kind: "ops",
          title: process.env.NOTIFICATION_ID,
          status: "unread",
        });
      }, process.env);
    `;

    await saveRawAdminStore(
      {
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
      },
      { ADMIN_STATE_SQLITE_PATH: sqlitePath }
    );

    const runWorker = (notificationId) =>
      new Promise((resolve) => {
        const child = spawn(process.execPath, ["--input-type=module", "--eval", workerScript], {
          cwd: ROOT,
          env: {
            ...process.env,
            ADMIN_STATE_SQLITE_PATH: sqlitePath,
            NODE_ENV: "production",
            BARRIER_PATH: barrierPath,
            NOTIFICATION_ID: notificationId,
          },
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
          stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString();
        });
        child.on("exit", (code) => {
          resolve({ code, stdout, stderr });
        });
      });

    const first = runWorker("note_a");
    const second = runWorker("note_b");
    fs.writeFileSync(barrierPath, "go\n", "utf8");
    const [firstResult, secondResult] = await Promise.all([first, second]);

    assert.equal(firstResult.code, 0, firstResult.stderr || firstResult.stdout);
    assert.equal(secondResult.code, 0, secondResult.stderr || secondResult.stdout);

    const loaded = await loadRawAdminStore({ ADMIN_STATE_SQLITE_PATH: sqlitePath });
    assert.deepEqual(
      loaded.notifications.map((entry) => entry.id).sort(),
      ["note_a", "note_b"]
    );
  });

  it("falls back to a file backend only when durable env is absent", async () => {
    const { resolveAdminStoreConfig } = await loadStoreModule();

    const config = resolveAdminStoreConfig({});

    assert.equal(config.backend, "file");
    assert.match(config.path, /admin-control-plane\.json$/);
  });

  it("fails closed in production when no durable backend is configured", async () => {
    const { resolveAdminStoreConfig } = await loadStoreModule();

    assert.throws(
      () => resolveAdminStoreConfig({ NODE_ENV: "production" }),
      /durable backend/i
    );
  });

  it("signs and verifies stateless admin session cookies", async () => {
    const { signAdminSessionCookie, verifyAdminSessionCookie } = await loadSessionModule();

    const token = signAdminSessionCookie(
      {
        id: "usr_owner",
        name: "Alex Orlov",
        email: "owner@demumumind.internal",
        role: "Owner",
        csrfToken: "csrf-1"
      },
      "super-secret"
    );

    const decoded = verifyAdminSessionCookie(token, "super-secret");

    assert.equal(decoded.id, "usr_owner");
    assert.equal(decoded.role, "Owner");
    assert.equal(decoded.csrfToken, "csrf-1");
  });

  it("authenticates admin users against stored password hashes", async () => {
    const { saveRawAdminStore } = await loadStoreModule();
    const { authenticateAdminUser, hashAdminPassword } = await loadAuthModule();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-admin-auth-"));
    const sqlitePath = path.join(tempDir, "admin.sqlite");
    const passwordHash = await hashAdminPassword("S3curePass!");

    await saveRawAdminStore(
      {
        version: 1,
        users: [
          {
            id: "usr_owner",
            email: "owner@demumumind.internal",
            name: "Alex Orlov",
            role: "Owner",
            status: "active",
            passwordHash,
          },
        ],
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
      },
      { ADMIN_STATE_SQLITE_PATH: sqlitePath }
    );

    const originalPath = process.env.ADMIN_STATE_SQLITE_PATH;
    const originalNodeEnv = process.env.NODE_ENV;

    process.env.ADMIN_STATE_SQLITE_PATH = sqlitePath;
    process.env.NODE_ENV = "production";

    try {
      const success = await authenticateAdminUser("owner@demumumind.internal", "S3curePass!");
      const failure = await authenticateAdminUser("owner@demumumind.internal", "wrong-password");

      assert.equal(success.ok, true);
      assert.equal(success.user?.role, "Owner");
      assert.equal(failure.ok, false);
      assert.match(failure.error, /invalid admin credentials/i);
    } finally {
      if (typeof originalPath === "string") {
        process.env.ADMIN_STATE_SQLITE_PATH = originalPath;
      } else {
        delete process.env.ADMIN_STATE_SQLITE_PATH;
      }

      if (typeof originalNodeEnv === "string") {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    }
  });

  it("can bootstrap a password into an empty SQLite store from the seeded internal users", async () => {
    const { authenticateAdminUser, setAdminUserPassword } = await loadAuthModule();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-admin-bootstrap-"));
    const sqlitePath = path.join(tempDir, "admin.sqlite");
    const originalPath = process.env.ADMIN_STATE_SQLITE_PATH;
    const originalNodeEnv = process.env.NODE_ENV;

    process.env.ADMIN_STATE_SQLITE_PATH = sqlitePath;
    process.env.NODE_ENV = "production";

    try {
      await setAdminUserPassword("owner@demumumind.internal", "BootstrappedPass1!");
      const result = await authenticateAdminUser("owner@demumumind.internal", "BootstrappedPass1!");

      assert.equal(result.ok, true);
      assert.equal(result.user?.email, "owner@demumumind.internal");
    } finally {
      if (typeof originalPath === "string") {
        process.env.ADMIN_STATE_SQLITE_PATH = originalPath;
      } else {
        delete process.env.ADMIN_STATE_SQLITE_PATH;
      }

      if (typeof originalNodeEnv === "string") {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    }
  });
});
