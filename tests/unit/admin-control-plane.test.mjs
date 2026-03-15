import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

async function loadAdminModule() {
  const modulePath = path.join(ROOT, "site", "src", "lib", "admin", "control-plane.mjs");
  return import(pathToFileURL(modulePath).href);
}

describe("admin control plane", () => {
  it("exposes a four-role RBAC model with strict mutation limits", async () => {
    const { ROLE_CAPABILITIES, hasCapability } = await loadAdminModule();

    assert.deepEqual(Object.keys(ROLE_CAPABILITIES), ["Owner", "Operator", "Reviewer", "Analyst"]);
    assert.equal(hasCapability("Owner", "settings.manageUsers"), true);
    assert.equal(hasCapability("Operator", "settings.manageUsers"), false);
    assert.equal(hasCapability("Reviewer", "approvals.review"), true);
    assert.equal(hasCapability("Analyst", "catalog.edit"), false);
    assert.equal(hasCapability("Analyst", "dashboard.read"), true);
  });

  it("enforces lifecycle transitions and mandatory reasons for risk actions", async () => {
    const { transitionLifecycle } = await loadAdminModule();

    const inReview = transitionLifecycle(
      { kind: "submission", status: "draft" },
      { action: "submit_for_review", actorId: "usr_owner" }
    );
    assert.equal(inReview.status, "in_review");
    assert.equal(inReview.reviewedBy, "usr_owner");

    assert.throws(
      () =>
        transitionLifecycle(
          { kind: "release", status: "published" },
          { action: "rollback", actorId: "usr_owner" }
        ),
      /reason/i
    );

    const rolledBack = transitionLifecycle(
      { kind: "release", status: "published" },
      { action: "rollback", actorId: "usr_owner", reason: "Receipt mismatch" }
    );
    assert.equal(rolledBack.status, "rolled_back");
    assert.equal(rolledBack.reason, "Receipt mismatch");
  });

  it("routes high-risk commands into approvals and records idempotent audit envelopes", async () => {
    const { issueCommandEnvelope, canRunCommand } = await loadAdminModule();

    const envelope = issueCommandEnvelope({
      actorId: "usr_operator",
      actorRole: "Operator",
      command: "release.publish",
      entityType: "release",
      entityId: "rel_2026w11",
      reason: "Ready for Friday window",
      idempotencyKey: "idem-001",
    });

    assert.equal(envelope.requiresApproval, true);
    assert.equal(envelope.approval.request.status, "pending");
    assert.equal(envelope.auditEvent.kind, "command_requested");
    assert.equal(envelope.auditEvent.idempotencyKey, "idem-001");

    const exportEnvelope = issueCommandEnvelope({
      actorId: "usr_operator",
      actorRole: "Operator",
      command: "rerun_export",
      entityType: "campaign",
      entityId: "cmp_2026w11",
      reason: "Rebuild the publish bundle before the scheduled window",
      idempotencyKey: "idem-002",
    });

    assert.equal(exportEnvelope.command, "export.rerun");
    assert.equal(exportEnvelope.requiresApproval, true);
    assert.equal(exportEnvelope.approval.request.entityId, "cmp_2026w11");
    assert.equal(canRunCommand("Analyst", "freeze_promotion"), false);
    assert.equal(canRunCommand("Owner", "freeze_promotion"), true);
  });

  it("sanitizes settings users and blocks self-approval or unauthorized approval roles", async () => {
    const { getModuleData, applyCommandToStore } = await loadAdminModule();

    const settings = await getModuleData("settings", {
      users: [
        {
          id: "usr_owner",
          email: "owner@demumumind.internal",
          name: "Alex",
          role: "Owner",
          status: "active",
          passwordHash: "secret",
        },
      ],
      settings: { freezePromotion: false, safetyCaps: { maxNamesPerRun: 50, failMode: "fail-closed", maxDailyExports: 3 } },
    });

    assert.deepEqual(settings.users, [
      {
        id: "usr_owner",
        email: "owner@demumumind.internal",
        name: "Alex",
        role: "Owner",
      },
    ]);

    const approvalStore = {
      version: 1,
      users: [],
      submissions: [],
      reviews: [],
      overrideWorkItems: [],
      approvals: [
        {
          id: "apr_publish",
          module: "governance",
          title: "Publish release",
          status: "pending",
          priority: "critical",
          entityType: "release",
          entityId: "rel_2026w11",
          requestedBy: "usr_owner",
          requiredRoles: ["Reviewer"],
          deferredCommand: {
            command: "release.publish",
            entityType: "release",
            entityId: "rel_2026w11",
            reason: "Friday publish window",
          },
        },
      ],
      campaigns: [],
      jobs: [],
      releases: [
        {
          id: "rel_2026w11",
          status: "approved",
          window: "2026-03-14",
          createdAt: "2026-03-12T10:25:00.000Z",
          requestedBy: "usr_owner",
        },
      ],
      exports: [],
      auditEvents: [],
      telemetrySnapshots: [],
      notifications: [],
      catalogDrafts: [],
      idempotencyLedger: {},
      settings: {
        freezePromotion: false,
        environmentMode: "internal",
        safetyCaps: { maxNamesPerRun: 50, failMode: "fail-closed", maxDailyExports: 3 },
      },
    };

    assert.throws(
      () =>
        applyCommandToStore(approvalStore, {
          actorId: "usr_owner",
          actorRole: "Owner",
          command: "approval.approve",
          entityType: "approval",
          entityId: "apr_publish",
          reason: "Self-approving",
          idempotencyKey: "idem-self-approve",
        }),
      /cannot approve your own request/i
    );

    assert.throws(
      () =>
        applyCommandToStore(
          {
            ...approvalStore,
            approvals: [{ ...approvalStore.approvals[0], requestedBy: "usr_operator" }],
          },
          {
            actorId: "usr_owner",
            actorRole: "Owner",
            command: "approval.approve",
            entityType: "approval",
            entityId: "apr_publish",
            reason: "Owner but not required reviewer",
            idempotencyKey: "idem-wrong-role",
          }
        ),
      /insufficient approval role/i
    );
  });

  it("builds an executive dashboard and public export previews from seeded state", async () => {
    const { buildAdminSnapshot, buildPublicArtifactPreview } = await loadAdminModule();

    const state = {
      users: [{ id: "usr_owner", role: "Owner", name: "Alex" }],
      tools: [{ slug: "tool-compass", name: "Tool Compass", lifecycle: "published", category: "devtools" }],
      submissions: [{ id: "sub_1", slug: "new-tool", status: "in_review", priority: "high" }],
      approvals: [{ id: "apr_1", status: "pending", priority: "critical", module: "governance" }],
      promotions: [{ week: "2026-W11", status: "scheduled", slugs: ["tool-compass"] }],
      exports: [{ id: "exp_1", status: "verified", artifactType: "promo-queue.json" }],
      opsRuns: [{ id: "ops_1", status: "failed", durationMs: 3000, createdAt: "2026-03-12T12:00:00.000Z" }],
      auditFindings: [{ id: "find_1", severity: "high", status: "open" }],
      telemetrySnapshots: [{ id: "tel_1", anomalyScore: 0.92 }],
    };

    const snapshot = buildAdminSnapshot(state);
    assert.equal(snapshot.kpis.tools.total, 1);
    assert.equal(snapshot.kpis.approvals.pending, 1);
    assert.equal(snapshot.commandCenter[0].action, "freeze_promotion");
    assert.equal(snapshot.topAlerts[0].severity, "critical");

    const preview = buildPublicArtifactPreview(state);
    assert.ok(preview.artifacts.some((artifact) => artifact.fileName === "promo-queue.json"));
    assert.ok(preview.artifacts.some((artifact) => artifact.fileName === "submissions.json"));
    assert.equal(preview.receipt.status, "preview_ready");
  });

  it("executes approval decisions into export work instead of leaving requests stranded", async () => {
    const { applyCommandToStore } = await loadAdminModule();

    const store = {
      users: [],
      submissions: [],
      reviews: [],
      overrideWorkItems: [],
      approvals: [
        {
          id: "apr_publish",
          module: "governance",
          title: "Publish release",
          status: "pending",
          priority: "critical",
          entityType: "release",
          entityId: "rel_2026w11",
          requestedBy: "usr_operator",
          requiredRoles: ["Reviewer", "Owner"],
          deferredCommand: {
            command: "release.publish",
            entityType: "release",
            entityId: "rel_2026w11",
            reason: "Friday publish window"
          }
        }
      ],
      campaigns: [],
      jobs: [],
      releases: [
        {
          id: "rel_2026w11",
          status: "approved",
          window: "2026-03-14",
          createdAt: "2026-03-12T10:25:00.000Z",
          requestedBy: "usr_operator"
        }
      ],
      exports: [],
      auditEvents: [],
      telemetrySnapshots: [],
      settings: {
        freezePromotion: false,
        environmentMode: "internal",
        safetyCaps: { maxNamesPerRun: 50, failMode: "fail-closed", maxDailyExports: 3 }
      }
    };

    const result = applyCommandToStore(store, {
      actorId: "usr_owner",
      actorRole: "Owner",
      command: "approval.approve",
      entityType: "approval",
      entityId: "apr_publish",
      reason: "All sign-offs complete",
      idempotencyKey: "idem-approve-1"
    });

    assert.equal(result.store.approvals[0].status, "approved");
    assert.equal(result.store.exports.length, 1);
    assert.equal(result.store.exports[0].status, "verified");
    assert.equal(result.store.releases[0].status, "published");
  });

  it("defers rerun export jobs until a reviewer approves the queued request", async () => {
    const { applyCommandToStore } = await loadAdminModule();

    const store = {
      version: 1,
      users: [],
      submissions: [],
      reviews: [],
      overrideWorkItems: [],
      approvals: [],
      campaigns: [
        {
          id: "cmp_2026w52",
          week: "2026-W52",
          status: "scheduled",
          channels: ["homepage", "presskit"],
          slugs: ["tool-compass", "registry-stats"],
          ownerId: "usr_operator",
        },
      ],
      jobs: [],
      releases: [],
      exports: [],
      auditEvents: [],
      telemetrySnapshots: [],
      notifications: [],
      catalogDrafts: [],
      idempotencyLedger: {},
      settings: {
        freezePromotion: false,
        environmentMode: "internal",
        safetyCaps: { maxNamesPerRun: 50, failMode: "fail-closed", maxDailyExports: 3 },
      },
    };

    const requested = applyCommandToStore(store, {
      actorId: "usr_operator",
      actorRole: "Operator",
      command: "rerun_export",
      entityType: "campaign",
      entityId: "cmp_2026w52",
      reason: "Rebuild the publish artifacts for the scheduled campaign",
      idempotencyKey: "idem-rerun-request",
    });

    assert.equal(requested.store.approvals.length, 1);
    assert.equal(requested.store.approvals[0].status, "pending");
    assert.equal(requested.store.jobs.length, 0);

    const approved = applyCommandToStore(requested.store, {
      actorId: "usr_reviewer",
      actorRole: "Reviewer",
      command: "approval.approve",
      entityType: "approval",
      entityId: requested.store.approvals[0].id,
      reason: "Export rerun reviewed and safe to queue",
      idempotencyKey: "idem-rerun-approve",
    });

    assert.equal(approved.store.approvals[0].status, "approved");
    assert.ok(approved.store.jobs.some((job) => job.scope === "cmp_2026w52" && job.status === "queued"));
  });

  it("treats repeated idempotency keys as a no-op for stateful commands", async () => {
    const { applyCommandToStore } = await loadAdminModule();

    const initialStore = {
      users: [],
      submissions: [],
      reviews: [],
      overrideWorkItems: [],
      approvals: [],
      campaigns: [],
      jobs: [],
      releases: [],
      exports: [],
      auditEvents: [],
      telemetrySnapshots: [],
      idempotencyLedger: {},
      settings: {
        freezePromotion: false,
        environmentMode: "internal",
        safetyCaps: { maxNamesPerRun: 50, failMode: "fail-closed", maxDailyExports: 3 }
      }
    };

    const first = applyCommandToStore(initialStore, {
      actorId: "usr_operator",
      actorRole: "Operator",
      command: "freeze_promotion",
      entityType: "system",
      entityId: "freeze",
      reason: "Risk gate",
      idempotencyKey: "idem-freeze-1"
    });

    const second = applyCommandToStore(first.store, {
      actorId: "usr_operator",
      actorRole: "Operator",
      command: "freeze_promotion",
      entityType: "system",
      entityId: "freeze",
      reason: "Risk gate",
      idempotencyKey: "idem-freeze-1"
    });

    assert.equal(first.store.approvals.length, 1);
    assert.equal(second.store.approvals.length, 1);
    assert.equal(Object.keys(second.store.idempotencyLedger).length, 1);
  });

  it("applies live submission workflow commands to the intake queue", async () => {
    const { applyCommandToStore, canRunCommand } = await loadAdminModule();

    const store = {
      users: [],
      submissions: [
        {
          id: "sub_internal_1",
          slug: "mcp-docs",
          status: "in_review",
          priority: "medium",
          lane: "promo",
          assigneeId: "usr_reviewer",
        },
      ],
      reviews: [],
      overrideWorkItems: [],
      approvals: [],
      campaigns: [],
      jobs: [],
      releases: [],
      exports: [],
      auditEvents: [],
      telemetrySnapshots: [],
      idempotencyLedger: {},
      settings: {
        freezePromotion: false,
        environmentMode: "internal",
        safetyCaps: { maxNamesPerRun: 50, failMode: "fail-closed", maxDailyExports: 3 },
      },
    };

    const escalated = applyCommandToStore(store, {
      actorId: "usr_operator",
      actorRole: "Operator",
      command: "queue.escalate",
      entityType: "submission",
      entityId: "sub_internal_1",
      reason: "Queue SLA breached",
      idempotencyKey: "idem-sub-1",
    });

    const requestedInfo = applyCommandToStore(escalated.store, {
      actorId: "usr_reviewer",
      actorRole: "Reviewer",
      command: "submission.request_info",
      entityType: "submission",
      entityId: "sub_internal_1",
      reason: "Need install verification details",
      idempotencyKey: "idem-sub-2",
    });

    const accepted = applyCommandToStore(requestedInfo.store, {
      actorId: "usr_operator",
      actorRole: "Operator",
      command: "submission.accept",
      entityType: "submission",
      entityId: "sub_internal_1",
      reason: "Evidence packet verified",
      idempotencyKey: "idem-sub-3",
    });

    assert.equal(canRunCommand("Operator", "submission.accept"), true);
    assert.equal(canRunCommand("Analyst", "submission.accept"), false);
    assert.equal(escalated.store.submissions[0].priority, "high");
    assert.equal(requestedInfo.store.submissions[0].status, "needs-info");
    assert.equal(accepted.store.submissions[0].status, "accepted");
  });

  it("overlays catalog drafts on top of public tool records", async () => {
    const { mergeCatalogDrafts } = await loadAdminModule();

    const tools = [
      {
        slug: "tool-compass",
        name: "Tool Compass",
        tagline: "Baseline copy",
        category: "devtools",
        featured: false,
        publicProof: false,
        tags: ["search"],
        lifecycle: "published",
      },
    ];
    const drafts = [
      {
        id: "draft_tool_compass",
        slug: "tool-compass",
        tagline: "Sharper staged copy",
        featured: true,
        publicProof: true,
        tags: ["search", "ops"],
        status: "in_review",
        reason: "Homepage feature slot",
      },
    ];

    const merged = mergeCatalogDrafts(tools, drafts);

    assert.equal(merged[0].tagline, "Sharper staged copy");
    assert.equal(merged[0].featured, true);
    assert.equal(merged[0].publicProof, true);
    assert.equal(merged[0].draftStatus, "in_review");
    assert.equal(merged[0].draftReason, "Homepage feature slot");
  });

  it("processes queued pipeline jobs into staged exports and operator notifications", async () => {
    const { processQueuedJobs } = await loadAdminModule();

    const store = {
      version: 1,
      users: [],
      submissions: [],
      reviews: [],
      overrideWorkItems: [],
      approvals: [],
      campaigns: [
        {
          id: "cmp_1",
          week: "2026-W11",
          status: "scheduled",
          channels: ["presskit"],
          slugs: ["tool-compass"],
          ownerId: "usr_operator",
        },
      ],
      jobs: [
        { id: "job_validate", kind: "validate", status: "queued", scope: "2026-W11", requestedBy: "usr_operator", createdAt: "2026-03-12T10:00:00.000Z" },
        { id: "job_preview", kind: "preview", status: "queued", scope: "2026-W11", requestedBy: "usr_operator", createdAt: "2026-03-12T10:01:00.000Z" },
        { id: "job_export", kind: "export", status: "queued", scope: "2026-W11", requestedBy: "usr_operator", createdAt: "2026-03-12T10:02:00.000Z" },
        { id: "job_verify", kind: "verify", status: "queued", scope: "2026-W11", requestedBy: "usr_operator", createdAt: "2026-03-12T10:03:00.000Z" },
      ],
      releases: [],
      exports: [],
      auditEvents: [],
      telemetrySnapshots: [],
      notifications: [],
      catalogDrafts: [],
      idempotencyLedger: {},
      settings: {
        freezePromotion: false,
        environmentMode: "internal",
        safetyCaps: { maxNamesPerRun: 50, failMode: "fail-closed", maxDailyExports: 3 },
      },
    };

    const result = processQueuedJobs(store, { actorId: "usr_operator" });

    assert.equal(result.jobs.every((job) => job.status === "completed"), true);
    assert.ok(result.exports.some((entry) => entry.status === "validated"));
    assert.ok(result.exports.some((entry) => entry.status === "preview_ready"));
    assert.ok(result.exports.some((entry) => entry.status === "exported"));
    assert.ok(result.exports.some((entry) => entry.status === "verified"));
    assert.ok(result.notifications.length >= 4);
  });
});
