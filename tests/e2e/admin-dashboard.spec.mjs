import { test, expect } from "@playwright/test";

const BASE_PATH = "/mcp-tool";
const USERS = {
  owner: { email: "owner@demumumind.internal", password: "OwnerPass1!" },
  operator: { email: "operator@demumumind.internal", password: "OperatorPass1!" },
  reviewer: { email: "reviewer@demumumind.internal", password: "ReviewerPass1!" },
  analyst: { email: "analyst@demumumind.internal", password: "AnalystPass1!" },
};

function route(pathname) {
  return `${BASE_PATH}${pathname}`;
}

async function apiGet(page, pathname) {
  const response = await page.request.get(route(pathname));
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.success).toBeTruthy();
  return payload.data;
}

async function login(page, role) {
  const credentials = USERS[role];
  await page.goto(route("/admin/login/"));
  await expect(page.getByTestId("admin-login-form")).toBeVisible();
  await page.getByTestId("admin-login-email").fill(credentials.email);
  await page.getByTestId("admin-login-password").fill(credentials.password);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/auth/session/") && response.request().method() === "POST"
  );
  await page.getByTestId("admin-login-submit").click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  await page.waitForURL(new RegExp(`${BASE_PATH}/admin/?$`));
  await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/admin/?$`));
}

async function logout(page) {
  await page.request.delete(route("/api/admin/auth/session/"));
  await page.context().clearCookies();
}

async function submitCommandForm(page, formLocator, buttonLabel, reason) {
  await formLocator.locator('textarea[name="reason"]').fill(reason);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/commands/") && response.request().method() === "POST"
  );
  await formLocator.getByRole("button", { name: buttonLabel }).click();
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.reload();
}

async function submitJsonForm(page, formLocator, submitLabel, urlPart, values) {
  for (const [name, value] of Object.entries(values)) {
    const field = formLocator.locator(`[name="${name}"]`);
    const tagName = await field.evaluate((element) => element.tagName.toLowerCase());
    if (tagName === "select") {
      await field.selectOption(String(value));
    } else {
      await field.fill(String(value));
    }
  }

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(urlPart) && response.request().method() === "POST"
  );
  await formLocator.getByRole("button", { name: submitLabel }).click();
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.reload();
}

test.describe.configure({ mode: "serial" });

test("operator moves a submission through request-info and accept flows", async ({ page }) => {
  await login(page, "operator");
  await page.goto(route("/admin/submissions/"));

  const card = page.getByTestId("submission-card-tool-compass");

  await submitCommandForm(
    page,
    card.getByTestId("submission-request-info-sub_1"),
    "Request info",
    "Need a fresher verification note before advancing."
  );

  let submissions = await apiGet(page, "/api/admin/submissions/");
  let submission = submissions.submissions.find((entry) => entry.slug === "tool-compass");
  expect(submission.status).toBe("needs-info");

  await submitCommandForm(
    page,
    page.getByTestId("submission-card-tool-compass").getByTestId("submission-accept-sub_1"),
    "Accept",
    "Verification note landed and the submission can move forward."
  );

  submissions = await apiGet(page, "/api/admin/submissions/");
  submission = submissions.submissions.find((entry) => entry.slug === "tool-compass");
  expect(submission.status).toBe("accepted");
  expect(submission.reviewedBy).toBe("usr_operator");
});

test("reviewer can stage a moderation override item", async ({ page }) => {
  await login(page, "reviewer");
  await page.goto(route("/admin/moderation/"));

  const form = page.getByTestId("override-editor");
  await submitJsonForm(page, form, "Save override item", "/api/admin/overrides/", {
    slug: "tool-compass",
    policy: "verification",
    severity: "high",
    status: "in_review",
    notes: "Verification receipt needs manual reviewer confirmation.",
    reason: "E2E override staging path.",
  });

  const moderation = await apiGet(page, "/api/admin/overrides/");
  const override = moderation.overrides.find((entry) => entry.slug === "tool-compass");

  expect(override).toBeTruthy();
  expect(override.severity).toBe("high");
  expect(override.policy).toBe("verification");
});

test("operator requests a promotion export rerun and reviewer approval queues the jobs", async ({ page }) => {
  const week = "2026-W52";

  await login(page, "operator");
  await page.goto(route("/admin/promotions/"));

  await submitJsonForm(page, page.getByTestId("campaign-editor"), "Save campaign", "/api/admin/promotions/", {
    week,
    status: "scheduled",
    slugs: "tool-compass, registry-stats",
    channels: "homepage, presskit",
    notes: "E2E campaign bundle.",
  });

  const promotions = await apiGet(page, "/api/admin/promotions/");
  const campaign = promotions.campaigns.find((entry) => entry.week === week);
  expect(campaign).toBeTruthy();

  await page.goto(route("/admin/promotions/"));
  await submitCommandForm(
    page,
    page.getByTestId("promotion-rerun-export"),
    "Rerun export",
    "Rebuild publish artifacts for the scheduled campaign."
  );

  let approvals = await apiGet(page, "/api/admin/approvals/");
  const approval = approvals.find((entry) => entry.entityId === campaign.id && entry.status === "pending");
  expect(approval).toBeTruthy();

  await page.goto(route("/admin/governance/"));
  await expect(page.getByTestId(`approval-item-${approval.id}`).getByRole("button", { name: "Approve" })).toBeDisabled();

  await logout(page);
  await login(page, "reviewer");
  await page.goto(route("/admin/governance/"));
  await submitCommandForm(
    page,
    page.getByTestId(`approval-item-${approval.id}`),
    "Approve",
    "Reviewed and safe to queue the export pipeline."
  );

  const ops = await apiGet(page, "/api/admin/jobs/");
  const queuedJobs = ops.jobs.filter((entry) => entry.scope === campaign.id && entry.status === "queued");
  expect(queuedJobs.length).toBeGreaterThan(0);
});

test("operator can queue and process ops work, then resolve notifications with audit captured", async ({ page }) => {
  const scope = "e2e-ops-recovery";

  await login(page, "operator");
  await page.goto(route("/admin/ops/"));

  const opsForm = page.getByTestId("ops-run-form");
  await submitJsonForm(page, opsForm, "Run ops action", "/api/admin/jobs/", {
    action: "queue",
    kind: "pipeline",
    scope,
    reason: "Exercise the recovery lane end-to-end.",
  });

  let ops = await apiGet(page, "/api/admin/jobs/");
  expect(ops.jobs.some((entry) => entry.scope === scope && entry.status === "queued")).toBeTruthy();

  await page.goto(route("/admin/ops/"));
  await submitJsonForm(page, page.getByTestId("ops-run-form"), "Run ops action", "/api/admin/jobs/", {
    action: "process",
    kind: "pipeline",
    scope,
    reason: "Process the queued recovery lane.",
  });

  ops = await apiGet(page, "/api/admin/jobs/");
  expect(ops.runs.some((entry) => String(entry.summary || "").includes(scope))).toBeTruthy();
  expect(ops.jobs.some((entry) => entry.scope === scope && entry.status === "completed")).toBeTruthy();

  const notification = ops.notifications.find((entry) => String(entry.summary || "").includes(scope));
  expect(notification).toBeTruthy();

  await page.goto(route("/admin/ops/"));
  await submitJsonForm(
    page,
    page.getByTestId(`notification-item-${notification.id}`),
    "Resolve",
    "/api/admin/notifications/",
    {}
  );

  const notifications = await apiGet(page, "/api/admin/notifications/");
  const resolved = notifications.find((entry) => entry.id === notification.id);
  expect(resolved.status).toBe("resolved");

  const activity = await apiGet(page, "/api/admin/activity/");
  expect(
    activity.some(
      (entry) => entry.kind === "job_completed" && String(entry.summary || "").includes(scope)
    )
  ).toBeTruthy();
});

test("role gating stays visible for analyst, reviewer, and operator", async ({ page }) => {
  await login(page, "analyst");
  await page.goto(route("/admin/catalog/"));
  await expect(page.getByTestId("catalog-editor").getByRole("button", { name: "Save staged draft" })).toBeDisabled();

  await logout(page);
  await login(page, "reviewer");
  await page.goto(route("/admin/settings/"));
  await expect(page.getByTestId("access-user-owner").getByRole("button", { name: "Rotate password" })).toBeDisabled();

  await logout(page);
  await login(page, "operator");
  await page.goto(route("/admin/governance/"));
  await expect(page.getByTestId("command-item-freeze_promotion").getByRole("button", { name: "Run action" })).toBeDisabled();
});
