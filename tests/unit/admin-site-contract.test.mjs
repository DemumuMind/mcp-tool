import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readText(...segments) {
  return fs.readFileSync(path.join(ROOT, ...segments), "utf8");
}

function exists(...segments) {
  return fs.existsSync(path.join(ROOT, ...segments));
}

describe("admin site contract", () => {
  it("enables Astro node adapter for hybrid rendering", () => {
    const astroConfig = readText("site", "astro.config.mjs");
    const sitePackage = JSON.parse(readText("site", "package.json"));
    const adminPage = readText("site", "src", "pages", "admin", "index.astro");
    const sessionApi = readText("site", "src", "pages", "api", "admin", "auth", "session.ts");

    assert.match(astroConfig, /@astrojs\/node/, "site should import the official node adapter");
    assert.match(astroConfig, /output:\s*['"]server['"]/, "site should use server output");
    assert.match(astroConfig, /adapter:\s*node\(/, "site should configure the node adapter");
    assert.ok(sitePackage.dependencies?.["@astrojs/node"], "site package should depend on @astrojs/node");
    assert.match(adminPage, /export const prerender = false;/, "admin overview should stay on-demand");
    assert.match(sessionApi, /export const prerender = false;/, "admin session API should stay on-demand");
  });

  it("guards admin surfaces via middleware and typed session locals", () => {
    assert.equal(exists("site", "src", "middleware.ts"), true, "site/src/middleware.ts should exist");
    assert.equal(exists("site", "src", "env.d.ts"), true, "site/src/env.d.ts should exist");
    assert.equal(exists("site", "src", "lib", "admin", "session-cookie.mjs"), true, "signed cookie session helper should exist");

    const middleware = readText("site", "src", "middleware.ts");
    const envDecl = readText("site", "src", "env.d.ts");
    const sessionApi = readText("site", "src", "pages", "api", "admin", "auth", "session.ts");

    assert.match(middleware, /withBase\(\"\/admin\/\"\)/, "middleware should guard base-aware /admin routes");
    assert.match(middleware, /withBase\(\"\/api\/admin\/\"\)/, "middleware should guard base-aware /api\/admin routes");
    assert.match(middleware, /withBase\(\"\/admin\/login\/\"\)/, "middleware should redirect unauthenticated requests to the base-aware login route");
    assert.match(middleware, /cookies/, "middleware should read signed admin cookies");
    assert.ok(!/context\.session/.test(middleware), "middleware should not depend on filesystem-backed Astro sessions");
    assert.ok(!/session\?\./.test(sessionApi), "auth session API should not depend on Astro session storage");
    assert.match(envDecl, /interface SessionData/, "env types should define session data");
    assert.match(envDecl, /interface Locals/, "env types should define request locals");
  });

  it("prevents the node adapter from auto-enabling filesystem session storage", () => {
    const astroConfig = readText("site", "astro.config.mjs");

    assert.match(
      astroConfig,
      /session:\s*\{[\s\S]*driver:\s*['"]memory['"]/,
      "astro config should explicitly use a non-filesystem session driver"
    );
  });

  it("ships a dedicated admin app shell with all planned domain routes", () => {
    const routes = [
      ["site", "src", "pages", "admin", "index.astro"],
      ["site", "src", "pages", "admin", "login.astro"],
      ["site", "src", "pages", "admin", "catalog", "index.astro"],
      ["site", "src", "pages", "admin", "submissions", "index.astro"],
      ["site", "src", "pages", "admin", "moderation", "index.astro"],
      ["site", "src", "pages", "admin", "promotions", "index.astro"],
      ["site", "src", "pages", "admin", "quality", "index.astro"],
      ["site", "src", "pages", "admin", "ops", "index.astro"],
      ["site", "src", "pages", "admin", "telemetry", "index.astro"],
      ["site", "src", "pages", "admin", "governance", "index.astro"],
      ["site", "src", "pages", "admin", "settings", "index.astro"],
      ["site", "src", "layouts", "AdminLayout.astro"],
    ];

    const missing = routes.filter((segments) => !exists(...segments)).map((segments) => segments.join("/"));
    assert.deepEqual(missing, [], `missing admin routes/layout: ${missing.join(", ")}`);
  });

  it("binds the admin pages to live control-plane data instead of static-only copy", () => {
    const overview = readText("site", "src", "pages", "admin", "index.astro");
    const submissions = readText("site", "src", "pages", "admin", "submissions", "index.astro");
    const governance = readText("site", "src", "pages", "admin", "governance", "index.astro");
    const login = readText("site", "src", "pages", "admin", "login.astro");

    assert.match(overview, /getBoundAdminPage|buildAdminSnapshot|loadAdminState|getModuleData/, "overview should read live control-plane state");
    assert.match(submissions, /getBoundAdminPage|loadAdminState|getModuleData/, "submissions page should read live control-plane state");
    assert.match(governance, /getBoundAdminPage|loadAdminState|getModuleData|buildPublicArtifactPreview/, "governance page should read live release/export state");
    assert.match(login, /<form|fetch\(|\/api\/admin\/auth\/session\//, "login should be backed by the live auth session API");
    assert.ok(!/disabled/.test(login), "login inputs should be interactive");
  });

  it("exposes internal API surfaces for auth, dashboards, operations, and exports", () => {
    const apiRoutes = [
      ["site", "src", "pages", "api", "admin", "auth", "session.ts"],
      ["site", "src", "pages", "api", "admin", "dashboard", "summary.ts"],
      ["site", "src", "pages", "api", "admin", "dashboard", "queues.ts"],
      ["site", "src", "pages", "api", "admin", "tools.ts"],
      ["site", "src", "pages", "api", "admin", "submissions.ts"],
      ["site", "src", "pages", "api", "admin", "reviews.ts"],
      ["site", "src", "pages", "api", "admin", "overrides.ts"],
      ["site", "src", "pages", "api", "admin", "promotions.ts"],
      ["site", "src", "pages", "api", "admin", "campaigns.ts"],
      ["site", "src", "pages", "api", "admin", "worthy.ts"],
      ["site", "src", "pages", "api", "admin", "releases.ts"],
      ["site", "src", "pages", "api", "admin", "audit", "findings.ts"],
      ["site", "src", "pages", "api", "admin", "ops", "runs.ts"],
      ["site", "src", "pages", "api", "admin", "jobs.ts"],
      ["site", "src", "pages", "api", "admin", "notifications.ts"],
      ["site", "src", "pages", "api", "admin", "telemetry.ts"],
      ["site", "src", "pages", "api", "admin", "approvals.ts"],
      ["site", "src", "pages", "api", "admin", "activity.ts"],
      ["site", "src", "pages", "api", "admin", "exports.ts"],
      ["site", "src", "pages", "api", "admin", "commands.ts"],
      ["site", "src", "pages", "api", "admin", "users", "credentials.ts"],
    ];

    const missing = apiRoutes.filter((segments) => !exists(...segments)).map((segments) => segments.join("/"));
    assert.deepEqual(missing, [], `missing admin api routes: ${missing.join(", ")}`);
  });

  it("wires mutate workflows through awaited command handling and interactive admin workspaces", () => {
    const commandsApi = readText("site", "src", "pages", "api", "admin", "commands.ts");
    const catalog = readText("site", "src", "pages", "admin", "catalog", "index.astro");
    const governance = readText("site", "src", "pages", "admin", "governance", "index.astro");
    const moderation = readText("site", "src", "pages", "admin", "moderation", "index.astro");
    const promotions = readText("site", "src", "pages", "admin", "promotions", "index.astro");
    const quality = readText("site", "src", "pages", "admin", "quality", "index.astro");
    const ops = readText("site", "src", "pages", "admin", "ops", "index.astro");
    const submissions = readText("site", "src", "pages", "admin", "submissions", "index.astro");
    const settings = readText("site", "src", "pages", "admin", "settings", "index.astro");
    const telemetry = readText("site", "src", "pages", "admin", "telemetry", "index.astro");

    assert.match(commandsApi, /await applyAdminCommand\(/, "commands API should await durable state mutations");
    assert.match(catalog, /CatalogWorkspace|CatalogWorkbench|CatalogEditor/, "catalog page should ship an interactive workspace");
    assert.match(governance, /GovernanceWorkspace|ApprovalInbox|CommandCenter/, "governance page should ship an interactive workspace");
    assert.match(moderation, /ModerationWorkspace|OverrideWorkbench|ReviewDesk/, "moderation page should ship an interactive workspace");
    assert.match(promotions, /PromotionsWorkspace|CampaignPlanner|PromotionWorkbench/, "promotions page should ship an interactive workspace");
    assert.match(quality, /QualityWorkspace|RemediationQueue|FindingWorkbench/, "quality page should ship an interactive workspace");
    assert.match(ops, /OpsWorkspace|JobConsole|NotificationInbox/, "ops page should ship an interactive workspace");
    assert.match(submissions, /SubmissionWorkspace|SubmissionBoard|SubmissionQueue/, "submissions page should ship an interactive workflow surface");
    assert.match(settings, /AccessWorkspace|PasswordRotation|\/api\/admin\/users\/credentials\//, "settings page should expose access and credential management");
    assert.match(telemetry, /TelemetryWorkspace|SignalsWorkbench|AnomalyDesk/, "telemetry page should ship an interactive workspace");
  });

  it("requires idempotency keys for direct admin mutation routes and limits user inventory access", () => {
    const toolsApi = readText("site", "src", "pages", "api", "admin", "tools.ts");
    const overridesApi = readText("site", "src", "pages", "api", "admin", "overrides.ts");
    const promotionsApi = readText("site", "src", "pages", "api", "admin", "promotions.ts");
    const findingsApi = readText("site", "src", "pages", "api", "admin", "audit", "findings.ts");
    const telemetryApi = readText("site", "src", "pages", "api", "admin", "telemetry.ts");
    const jobsApi = readText("site", "src", "pages", "api", "admin", "jobs.ts");
    const notificationsApi = readText("site", "src", "pages", "api", "admin", "notifications.ts");
    const credentialsApi = readText("site", "src", "pages", "api", "admin", "users", "credentials.ts");
    const rolesApi = readText("site", "src", "pages", "api", "admin", "users", "roles.ts");
    const settingsPage = readText("site", "src", "pages", "admin", "settings", "index.astro");

    for (const source of [toolsApi, overridesApi, promotionsApi, findingsApi, telemetryApi, jobsApi, notificationsApi, credentialsApi]) {
      assert.match(source, /requireIdempotencyKey\(/, "direct mutation routes should require idempotency keys");
    }

    assert.match(rolesApi, /withAdminApi\("settings\.manageUsers"/, "users/roles should be limited to manageUsers");
    assert.match(settingsPage, /hasCapability\(Astro\.locals\.adminUser\.role, "settings\.manageUsers"\)/, "settings page should gate user inventory");
    assert.match(settingsPage, /users=\{canManageUsers \? moduleData\.users : \[\]\}/, "settings page should strip user inventory for read-only roles");
  });

  it("lets operators load existing admin records back into workspace editors", () => {
    const catalogWorkspace = readText("site", "src", "components", "admin", "CatalogWorkspace.astro");
    const moderationWorkspace = readText("site", "src", "components", "admin", "ModerationWorkspace.astro");
    const promotionsWorkspace = readText("site", "src", "components", "admin", "PromotionsWorkspace.astro");
    const qualityWorkspace = readText("site", "src", "components", "admin", "QualityWorkspace.astro");
    const telemetryWorkspace = readText("site", "src", "components", "admin", "TelemetryWorkspace.astro");
    const runtime = readText("site", "src", "components", "admin", "AdminClientRuntime.astro");

    assert.match(catalogWorkspace, /name="id"/, "catalog editor should carry an existing draft id");
    assert.match(moderationWorkspace, /name="id"/, "moderation editor should carry an existing override id");
    assert.match(promotionsWorkspace, /name="id"/, "promotions editor should carry an existing campaign id");
    assert.match(qualityWorkspace, /name="id"/, "quality editor should carry an existing finding id");
    assert.match(telemetryWorkspace, /name="id"/, "telemetry editor should carry an existing snapshot id");
    assert.match(runtime, /data-admin-populate-form/, "admin runtime should support loading existing records into a form");
    assert.match(runtime, /getAttribute\("action"\)/, "admin runtime should resolve form actions from attributes so named controls cannot shadow the endpoint");
  });

  it("keeps GitHub Pages on the static client bundle while admin runtime stays server-side", () => {
    const workflow = readText(".github", "workflows", "pages.yml");

    assert.match(
      workflow,
      /touch site\/dist\/client\/\.nojekyll[\s\S]*git push --force origin gh-pages/,
      "pages deployment should publish the prerendered client bundle only"
    );
  });

  it("sanitizes webserver color env so Playwright runs do not emit NO_COLOR/FORCE_COLOR warnings", () => {
    const playwrightConfig = readText("playwright.config.mjs");
    const e2eServer = readText("scripts", "admin-e2e-server.mjs");

    assert.match(playwrightConfig, /delete process\.env\.NO_COLOR;/, "playwright config should sanitize the runner env before tests start");
    assert.match(playwrightConfig, /Remove-Item Env:NO_COLOR|env -u NO_COLOR/, "playwright webServer command should clear NO_COLOR before Node starts");
    assert.match(playwrightConfig, /env:\s*webServerEnv/, "playwright webServer should pass the sanitized env explicitly");
    assert.match(e2eServer, /delete serverEnv\.NO_COLOR;/, "the admin e2e server should keep child Node processes on the sanitized env");
  });
});
