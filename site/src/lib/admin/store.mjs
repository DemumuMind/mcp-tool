import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import lockfile from "proper-lockfile";

const DEFAULT_STORE_URL = new URL("../../data/admin-control-plane.json", import.meta.url);
const SQLITE_COLLECTIONS = [
  "catalogDrafts",
  "submissions",
  "reviews",
  "overrideWorkItems",
  "approvals",
  "campaigns",
  "jobs",
  "opsRuns",
  "releases",
  "exports",
  "auditFindings",
  "auditEvents",
  "telemetrySnapshots",
  "notifications",
];

let sqliteModulePromise;
let pgModulePromise;
const LOCAL_LOCK_RETRY = {
  retries: 40,
  factor: 1.2,
  minTimeout: 25,
  maxTimeout: 250,
  randomize: false,
};
const SQLITE_MIGRATIONS = [
  {
    name: "001_admin_control_plane.sql",
    sql: `
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        password_hash TEXT,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_documents (
        collection_name TEXT NOT NULL,
        document_id TEXT NOT NULL,
        status TEXT,
        ordinal INTEGER NOT NULL DEFAULT 0,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (collection_name, document_id)
      );

      CREATE INDEX IF NOT EXISTS admin_documents_collection_ordinal_idx
        ON admin_documents (collection_name, ordinal);

      CREATE TABLE IF NOT EXISTS admin_singletons (
        key TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
];
const POSTGRES_MIGRATIONS = [
  {
    name: "001_admin_control_plane.sql",
    sql: `
      CREATE TABLE IF NOT EXISTS __ADMIN_CONTROL_PLANE_STATE__ (
        id SMALLINT,
        payload_json JSONB,
        version BIGINT,
        updated_at TIMESTAMPTZ
      );

      CREATE UNIQUE INDEX IF NOT EXISTS admin_control_plane_state_id_idx
        ON __ADMIN_CONTROL_PLANE_STATE__ (id);
    `,
  },
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function githubHeaders(token) {
  return {
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "demumumind-admin-control-plane",
  };
}

function normalizeSqlitePath(value) {
  if (!value) return null;
  if (/^postgres(ql)?:\/\//i.test(value)) return null;
  if (value.startsWith("sqlite:///")) return value.slice("sqlite:///".length);
  if (value.startsWith("sqlite://")) return value.slice("sqlite://".length);
  if (value.startsWith("sqlite:")) return value.slice("sqlite:".length);
  return value;
}

function normalizePostgresConnectionString(value) {
  if (!value) return null;
  return /^postgres(ql)?:\/\//i.test(value) ? value : null;
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function importSqlite() {
  if (!sqliteModulePromise) {
    sqliteModulePromise = (async () => {
      const module = await import("sql.js");
      const initSqlJs = module.default || module;
      const wasmPath = fileURLToPath(import.meta.resolve("sql.js/dist/sql-wasm.wasm"));
      return initSqlJs({
        locateFile() {
          return wasmPath;
        },
      });
    })();
  }

  return sqliteModulePromise;
}

async function importPg() {
  if (!pgModulePromise) {
    pgModulePromise = import("pg");
  }

  const module = await pgModulePromise;
  return module.default || module;
}

function selectSqliteRows(db, sql) {
  const statement = db.prepare(sql);
  const rows = [];

  try {
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }
  } finally {
    statement.free();
  }

  return rows;
}

function splitPostgresTablePath(value) {
  const parts = String(value || "").split(".");
  if (parts.length === 1) {
    return { schema: null, table: parts[0] };
  }
  if (parts.length === 2) {
    return { schema: parts[0], table: parts[1] };
  }
  throw new Error(`Invalid Postgres table name: ${value}`);
}

function quotePostgresIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid Postgres identifier: ${value}`);
  }
  return `"${value}"`;
}

function quotePostgresTablePath(value) {
  const { schema, table } = splitPostgresTablePath(value);
  return schema
    ? `${quotePostgresIdentifier(schema)}.${quotePostgresIdentifier(table)}`
    : quotePostgresIdentifier(table);
}

function normalizePostgresPayload(value) {
  if (value == null || typeof value !== "string") {
    return value ?? null;
  }
  return parseJson(value, null);
}

async function persistSqliteDatabase(config, db) {
  const tempPath = `${config.path}.tmp-${process.pid}`;
  await writeFile(tempPath, Buffer.from(db.export()));
  await rename(tempPath, config.path);
}

function normalizeMutationResult(result, fallbackStore) {
  if (result && typeof result === "object" && Object.prototype.hasOwnProperty.call(result, "store")) {
    return {
      data: result.data,
      store: result.store ?? fallbackStore,
    };
  }

  return {
    data: result,
    store: fallbackStore,
  };
}

async function withLocalStoreLock(config, callback) {
  const targetPath = `${config.path}.lock-target`;
  await mkdir(dirname(config.path), { recursive: true });
  await writeFile(targetPath, "", { flag: "a" });
  const release = await lockfile.lock(targetPath, {
    realpath: false,
    stale: 15000,
    retries: LOCAL_LOCK_RETRY,
  });

  try {
    return await callback();
  } finally {
    await release();
  }
}

async function openSqliteDatabase(config) {
  const SQL = await importSqlite();
  await mkdir(dirname(config.path), { recursive: true });

  let db;
  try {
    const existing = await readFile(config.path);
    db = new SQL.Database(existing);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    db = new SQL.Database();
  }

  db.exec("PRAGMA foreign_keys = ON;");

  await applySqliteMigrations(db);
  return db;
}

async function applySqliteMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _admin_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    selectSqliteRows(db, "SELECT name FROM _admin_migrations ORDER BY name ASC").map((row) => row.name)
  );

  for (const migration of SQLITE_MIGRATIONS) {
    if (applied.has(migration.name)) {
      continue;
    }

    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      db.run("INSERT INTO _admin_migrations (name, applied_at) VALUES (?, ?)", [
        migration.name,
        new Date().toISOString(),
      ]);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(`Failed to apply admin SQLite migration ${migration.name}: ${error.message}`);
    }
  }
}

function buildStoreFromSqliteRows(userRows, documentRows, singletonRows) {
  const hasPersistedState = userRows.length > 0 || documentRows.length > 0 || singletonRows.length > 0;
  if (!hasPersistedState) {
    return null;
  }

  const singletons = Object.fromEntries(
    singletonRows.map((row) => [row.key, parseJson(row.payload_json, null)])
  );
  const presentCollections = new Set(
    safeArray(singletons.collections).filter((collection) => SQLITE_COLLECTIONS.includes(collection))
  );
  const collections = Object.fromEntries([...presentCollections].map((collection) => [collection, []]));
  for (const row of documentRows) {
    if (!collections[row.collection_name]) {
      collections[row.collection_name] = [];
    }
    collections[row.collection_name].push(parseJson(row.payload_json, {}));
  }

  return {
    version: singletons.version || 1,
    users: userRows.map((row) => parseJson(row.payload_json, {})),
    ...collections,
    idempotencyLedger: singletons.idempotencyLedger || {},
    settings: singletons.settings || undefined,
  };
}

async function loadFromSqlite(config) {
  const db = await openSqliteDatabase(config);
  try {
    const userRows = selectSqliteRows(db, "SELECT payload_json FROM admin_users ORDER BY rowid ASC");
    const documentRows = selectSqliteRows(
      db,
      "SELECT collection_name, payload_json FROM admin_documents ORDER BY collection_name ASC, ordinal ASC"
    );
    const singletonRows = selectSqliteRows(
      db,
      "SELECT key, payload_json FROM admin_singletons ORDER BY key ASC"
    );

    return buildStoreFromSqliteRows(userRows, documentRows, singletonRows);
  } finally {
    db.close();
  }
}

async function saveToSqlite(config, store) {
  const db = await openSqliteDatabase(config);
  const updatedAt = new Date().toISOString();

  try {
    db.exec("BEGIN");

    try {
      db.exec("DELETE FROM admin_users;");
      db.exec("DELETE FROM admin_documents;");
      db.exec("DELETE FROM admin_singletons;");

      const insertUserSql = `
        INSERT INTO admin_users (id, email, role, status, password_hash, payload_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      for (const user of safeArray(store.users)) {
        db.run(
          insertUserSql,
          [
          user.id,
          String(user.email || "").toLowerCase(),
          user.role || "Analyst",
          user.status || "active",
          user.passwordHash || null,
          JSON.stringify(user),
          updatedAt,
          ]
        );
      }

      const insertDocumentSql = `
        INSERT INTO admin_documents (collection_name, document_id, status, ordinal, payload_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      for (const collection of SQLITE_COLLECTIONS) {
        safeArray(store[collection]).forEach((entry, index) => {
          db.run(
            insertDocumentSql,
            [
            collection,
            entry.id || `${collection}_${index}`,
            entry.status || null,
            index,
            JSON.stringify(entry),
            updatedAt,
            ]
          );
        });
      }

      const insertSingletonSql = `
        INSERT INTO admin_singletons (key, payload_json, updated_at)
        VALUES (?, ?, ?)
      `;
      db.run(insertSingletonSql, ["version", JSON.stringify(store.version || 1), updatedAt]);
      db.run(insertSingletonSql, ["settings", JSON.stringify(store.settings || {}), updatedAt]);
      db.run(insertSingletonSql, [
        "idempotencyLedger",
        JSON.stringify(store.idempotencyLedger || {}),
        updatedAt,
      ]);
      db.run(insertSingletonSql, [
        "collections",
        JSON.stringify(
          SQLITE_COLLECTIONS.filter((collection) => Object.prototype.hasOwnProperty.call(store, collection))
        ),
        updatedAt,
      ]);

      db.exec("COMMIT");
      await persistSqliteDatabase(config, db);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
}

async function loadFromFile(config) {
  const content = await readFile(config.path, "utf8");
  return JSON.parse(content);
}

async function saveToFile(config, store) {
  await writeFile(config.path, JSON.stringify(store, null, 2) + "\n", "utf8");
}

async function loadFromGithub(config) {
  const response = await fetch(
    `${config.apiUrl}/repos/${config.repo}/contents/${config.path}?ref=${config.branch}`,
    { headers: githubHeaders(config.token) }
  );

  if (response.status === 404) {
    return { data: null, sha: null };
  }
  if (!response.ok) {
    throw new Error(`GitHub admin store load failed (${response.status})`);
  }

  const body = await response.json();
  const content = Buffer.from(body.content, "base64").toString("utf8");
  return {
    data: JSON.parse(content),
    sha: body.sha,
  };
}

async function saveToGithub(config, store, expectedSha = undefined) {
  if (expectedSha === undefined) {
    const current = await loadFromGithub(config);
    expectedSha = current.sha || null;
  }

  const body = {
    message: "chore: update admin control plane store",
    content: Buffer.from(JSON.stringify(store, null, 2) + "\n", "utf8").toString("base64"),
    branch: config.branch,
    ...(expectedSha ? { sha: expectedSha } : {}),
  };

  const response = await fetch(
    `${config.apiUrl}/repos/${config.repo}/contents/${config.path}`,
    {
      method: "PUT",
      headers: githubHeaders(config.token),
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = new Error(`GitHub admin store save failed (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
}

async function getPostgresPool(config) {
  if (config.pgPool) {
    return config.pgPool;
  }

  const { Pool } = await importPg();
  return new Pool({
    connectionString: config.connectionString,
    max: Number(config.maxConnections || 10),
  });
}

async function applyPostgresMigrations(client, config) {
  const { schema } = splitPostgresTablePath(config.table);
  if (schema) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quotePostgresIdentifier(schema)};`);
  }

  for (const migration of POSTGRES_MIGRATIONS) {
    const sql = migration.sql.replaceAll(
      "__ADMIN_CONTROL_PLANE_STATE__",
      quotePostgresTablePath(config.table)
    );
    await client.query(sql);
  }
}

async function loadFromPostgres(config) {
  const pool = await getPostgresPool(config);
  const client = await pool.connect();

  try {
    await applyPostgresMigrations(client, config);
    const tableName = quotePostgresTablePath(config.table);
    const result = await client.query(
      `SELECT payload_json, version FROM ${tableName} WHERE id = $1`,
      [1]
    );

    if (!result.rowCount) {
      return { data: null, version: 0 };
    }

    return {
      data: normalizePostgresPayload(result.rows[0].payload_json),
      version: Number(result.rows[0].version || 0),
    };
  } finally {
    client.release();
  }
}

async function saveToPostgres(config, store, expectedVersion = undefined) {
  const pool = await getPostgresPool(config);
  const client = await pool.connect();

  try {
    await applyPostgresMigrations(client, config);
    const tableName = quotePostgresTablePath(config.table);
    const payload = JSON.stringify(store ?? null);

    if (expectedVersion === undefined) {
      await client.query(
        `
          INSERT INTO ${tableName} (id, payload_json, version, updated_at)
          VALUES ($1, $2::jsonb, 1, NOW())
          ON CONFLICT (id) DO UPDATE
          SET payload_json = EXCLUDED.payload_json,
              version = ${tableName}.version + 1,
              updated_at = NOW()
        `,
        [1, payload]
      );
      return;
    }

    const result = await client.query(
      `
        INSERT INTO ${tableName} (id, payload_json, version, updated_at)
        VALUES ($1, $2::jsonb, 1, NOW())
        ON CONFLICT (id) DO UPDATE
        SET payload_json = EXCLUDED.payload_json,
            version = ${tableName}.version + 1,
            updated_at = NOW()
        WHERE ${tableName}.version = $3
        RETURNING version
      `,
      [1, payload, expectedVersion]
    );

    if (!result.rowCount) {
      const error = new Error("Postgres admin store save failed (409)");
      error.statusCode = 409;
      throw error;
    }
  } finally {
    client.release();
  }
}

async function mutatePostgresStore(config, mutator, seedFactory) {
  const pool = await getPostgresPool(config);
  const client = await pool.connect();

  try {
    await applyPostgresMigrations(client, config);
    const tableName = quotePostgresTablePath(config.table);
    await client.query("BEGIN");

    try {
      const result = await client.query(
        `SELECT payload_json FROM ${tableName} WHERE id = $1 FOR UPDATE`,
        [1]
      );
      const currentStore = result.rowCount ? normalizePostgresPayload(result.rows[0].payload_json) : null;
      const workingStore =
        currentStore ??
        (typeof seedFactory === "function" ? await seedFactory() : null);
      const normalized = normalizeMutationResult(await mutator(workingStore), workingStore);
      const payload = JSON.stringify(normalized.store ?? null);

      if (result.rowCount) {
        await client.query(
          `
            UPDATE ${tableName}
            SET payload_json = $1::jsonb,
                version = version + 1,
                updated_at = NOW()
            WHERE id = $2
          `,
          [payload, 1]
        );
      } else {
        await client.query(
          `
            INSERT INTO ${tableName} (id, payload_json, version, updated_at)
            VALUES ($1, $2::jsonb, 1, NOW())
          `,
          [1, payload]
        );
      }

      await client.query("COMMIT");
      return normalized;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client.release();
  }
}

async function loadStoreForConfig(config) {
  if (config.backend === "sqlite") {
    return { store: await loadFromSqlite(config), versionToken: null };
  }
  if (config.backend === "postgres") {
    const result = await loadFromPostgres(config);
    return { store: result.data, versionToken: result.version || 0 };
  }
  if (config.backend === "github") {
    const result = await loadFromGithub(config);
    return { store: result.data, versionToken: result.sha || null };
  }
  return { store: await loadFromFile(config), versionToken: null };
}

async function saveStoreForConfig(config, store, { versionToken = undefined } = {}) {
  if (config.backend === "sqlite") {
    await saveToSqlite(config, store);
    return;
  }
  if (config.backend === "postgres") {
    await saveToPostgres(config, store, versionToken);
    return;
  }
  if (config.backend === "github") {
    await saveToGithub(config, store, versionToken);
    return;
  }
  await saveToFile(config, store);
}

export function resolveAdminStoreConfig(env = process.env, options = {}) {
  const explicitSqlitePath = normalizeSqlitePath(env.ADMIN_STATE_SQLITE_PATH);
  if (explicitSqlitePath) {
    return {
      backend: "sqlite",
      path: explicitSqlitePath,
    };
  }

  const postgresUrl = normalizePostgresConnectionString(env.ADMIN_STATE_POSTGRES_URL || env.ADMIN_DATABASE_URL);
  if (postgresUrl) {
    return {
      backend: "postgres",
      connectionString: postgresUrl,
      table: env.ADMIN_STATE_POSTGRES_TABLE || "admin_control_plane_state",
      pgPool: options.pgPool || null,
    };
  }

  const sqlitePath = normalizeSqlitePath(env.ADMIN_DATABASE_URL);
  if (sqlitePath) {
    return {
      backend: "sqlite",
      path: sqlitePath,
    };
  }

  if (env.ADMIN_STATE_GITHUB_REPO && env.ADMIN_STATE_GITHUB_TOKEN) {
    return {
      backend: "github",
      repo: env.ADMIN_STATE_GITHUB_REPO,
      branch: env.ADMIN_STATE_GITHUB_BRANCH || "main",
      path: env.ADMIN_STATE_GITHUB_PATH || "control-plane/admin-control-plane.json",
      token: env.ADMIN_STATE_GITHUB_TOKEN,
      apiUrl: env.ADMIN_STATE_GITHUB_API_URL || "https://api.github.com",
    };
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "A durable backend is required in production. Configure ADMIN_STATE_SQLITE_PATH, ADMIN_DATABASE_URL (postgres://...), or ADMIN_STATE_GITHUB_REPO and ADMIN_STATE_GITHUB_TOKEN."
    );
  }

  return {
    backend: "file",
    path: env.ADMIN_STATE_FILE || fileURLToPath(DEFAULT_STORE_URL),
  };
}

export async function loadRawAdminStore(env = process.env, options = {}) {
  const config = resolveAdminStoreConfig(env, options);
  const { store } = await loadStoreForConfig(config);
  return store;
}

export async function saveRawAdminStore(store, env = process.env, options = {}) {
  const config = resolveAdminStoreConfig(env, options);
  if (config.backend === "github" || config.backend === "postgres") {
    await saveStoreForConfig(config, store);
    return;
  }

  await withLocalStoreLock(config, async () => {
    await saveStoreForConfig(config, store);
  });
}

export async function mutateRawAdminStore(mutator, env = process.env, options = {}) {
  const seedFactory = options.seedFactory;
  const config = resolveAdminStoreConfig(env, options);

  if (config.backend === "postgres") {
    return mutatePostgresStore(config, mutator, seedFactory);
  }

  if (config.backend === "github") {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { store: currentStore, versionToken } = await loadStoreForConfig(config);
      const workingStore =
        currentStore ??
        (typeof seedFactory === "function" ? await seedFactory() : null);

      const normalized = normalizeMutationResult(await mutator(workingStore), workingStore);

      try {
        await saveStoreForConfig(config, normalized.store, { versionToken });
        return normalized;
      } catch (error) {
        if ((error?.statusCode === 409 || error?.statusCode === 422) && attempt < 4) {
          continue;
        }
        throw error;
      }
    }
  }

  return withLocalStoreLock(config, async () => {
    let currentStore = null;
    try {
      currentStore = await loadRawAdminStore(env);
    } catch {
      currentStore = null;
    }

    const workingStore =
      currentStore ??
      (typeof seedFactory === "function" ? await seedFactory() : null);
    const normalized = normalizeMutationResult(await mutator(workingStore), workingStore);
    await saveStoreForConfig(config, normalized.store);
    return normalized;
  });
}
