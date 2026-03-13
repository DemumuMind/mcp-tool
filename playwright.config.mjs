import { defineConfig } from "@playwright/test";

const port = Number(process.env.ADMIN_E2E_PORT || 4321);
const baseURL = `http://127.0.0.1:${port}`;
process.env.ADMIN_E2E_PORT = String(port);
delete process.env.NO_COLOR;

const webServerEnv = { ...process.env };
const webServerCommand =
  process.platform === "win32"
    ? 'powershell -NoProfile -Command "Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue; node scripts/admin-e2e-server.mjs"'
    : "env -u NO_COLOR node scripts/admin-e2e-server.mjs";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  outputDir: "artifacts/playwright-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
    },
  ],
  webServer: {
    command: webServerCommand,
    url: `${baseURL}/mcp-tool/admin/login/`,
    env: webServerEnv,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
