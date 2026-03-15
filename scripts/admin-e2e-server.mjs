import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setAdminUserPassword } from "../site/src/lib/admin/session.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.ADMIN_E2E_PORT || 4321);
const sqlitePath = process.env.ADMIN_E2E_SQLITE_PATH || path.join(ROOT, "artifacts", "e2e", "admin-control-plane.sqlite");

const E2E_USERS = [
  { email: "owner@demumumind.internal", password: "OwnerPass1!" },
  { email: "operator@demumumind.internal", password: "OperatorPass1!" },
  { email: "reviewer@demumumind.internal", password: "ReviewerPass1!" },
  { email: "analyst@demumumind.internal", password: "AnalystPass1!" },
];

const serverEnv = {
  ...process.env,
  NODE_ENV: "development",
  ADMIN_STATE_SQLITE_PATH: sqlitePath,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || "e2e-admin-session-secret",
  PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || `http://127.0.0.1:${port}/mcp-tool/`,
};
delete serverEnv.NO_COLOR;

async function prepareStore() {
  await mkdir(path.dirname(sqlitePath), { recursive: true });
  await rm(sqlitePath, { force: true });
  await rm(`${sqlitePath}.lock-target`, { force: true });

  for (const user of E2E_USERS) {
    await setAdminUserPassword(user.email, user.password, serverEnv);
  }
}

function forwardSignal(child, signal) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}

async function runCommand(command, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
    child.on("error", reject);
  });
}

await prepareStore();
await runCommand("npm", ["--prefix", "site", "run", "build"], serverEnv);

const child = spawn(
  process.execPath,
  [path.join(ROOT, "site", "dist", "server", "entry.mjs")],
  {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...serverEnv,
      HOST: "127.0.0.1",
      PORT: String(port),
    },
  }
);

forwardSignal(child, "SIGINT");
forwardSignal(child, "SIGTERM");

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
