import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadRawAdminStore, mutateRawAdminStore } from "./store.mjs";

const PROJECTS_URL = new URL("../../data/projects.json", import.meta.url);
const ADMIN_CONTROL_PLANE_SEED_URL = new URL("../../data/admin-control-plane.json", import.meta.url);
const OVERRIDES_URL = new URL("../../data/overrides.json", import.meta.url);
const SUBMISSIONS_URL = new URL("../../data/submissions.json", import.meta.url);
const OPS_HISTORY_URL = new URL("../../data/ops-history.json", import.meta.url);
const PROMO_QUEUE_URL = new URL("../../data/promo-queue.json", import.meta.url);
const WORTHY_URL = new URL("../../data/worthy.json", import.meta.url);
const README_HEALTH_URL = new URL("../../data/readme-health.json", import.meta.url);
const REALITY_FINDINGS_URL = new URL("../../data/audit/reality-findings.json", import.meta.url);
const TELEMETRY_ROLLUP_URL = new URL("../../data/telemetry/rollup.json", import.meta.url);
const QUEUE_HEALTH_URL = new URL("../../data/queue-health.json", import.meta.url);

const PRIORITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
const SEVERITY_RANK = { critical: 4, high: 3, warning: 2, info: 1 };
const LIFECYCLE_STATUSES = new Set(["draft", "in_review", "approved", "rejected", "published", "rolled_back"]);
const CAMPAIGN_STATUSES = new Set(["draft", "scheduled", "approved", "published", "rolled_back"]);
const OVERRIDE_POLICIES = new Set(["metadata", "content_safety", "verification", "promotion"]);
const OVERRIDE_SEVERITIES = new Set(["warning", "high", "critical"]);
const FINDING_STATUSES = new Set(["open", "in_review", "resolved"]);
const FINDING_SEVERITIES = new Set(["warning", "high", "critical", "info"]);
const TELEMETRY_STATUSES = new Set(["investigate", "healthy", "watch"]);
const JOB_ACTIONS = new Set(["queue", "process"]);
const JOB_STATUS_BY_KIND = {
  validate: "validated",
  preview: "preview_ready",
  export: "exported",
  verify: "verified",
};
const PIPELINE_JOB_KINDS = ["validate", "preview", "export", "verify"];
const JOB_KINDS = new Set(["pipeline", ...PIPELINE_JOB_KINDS]);
const COMMAND_RISK = {
  "release.publish": "critical",
  "export.publish": "critical",
  "export.rerun": "high",
  "settings.freeze_promotion": "high",
  "settings.safety_caps": "high",
  "release.rollback": "high",
  "submission.accept": "medium",
  "submission.reject": "medium",
  "submission.request_info": "medium",
  "queue.escalate": "medium",
  "review.reopen": "medium",
};

const COMMAND_ALIASES = {
  freeze_promotion: "settings.freeze_promotion",
  rerun_export: "export.rerun",
  rollback_release: "release.rollback",
  escalate_queue: "queue.escalate",
  reopen_review: "review.reopen",
  accept_submission: "submission.accept",
  reject_submission: "submission.reject",
  request_submission_info: "submission.request_info",
};

const COMMAND_CAPABILITY = {
  "settings.freeze_promotion": "settings.manageEnvironment",
  "settings.safety_caps": "settings.manageEnvironment",
  "release.publish": "governance.manage",
  "release.rollback": "governance.manage",
  "export.publish": "exports.manage",
  "export.rerun": "exports.manage",
  "submission.accept": "submissions.edit",
  "submission.reject": "submissions.edit",
  "submission.request_info": "submissions.edit",
  "queue.escalate": "submissions.edit",
  "review.reopen": "moderation.edit",
  "approval.approve": "approvals.review",
};

export const ROLE_CAPABILITIES = {
  Owner: [
    "dashboard.read",
    "catalog.read",
    "catalog.edit",
    "submissions.read",
    "submissions.edit",
    "moderation.read",
    "moderation.edit",
    "promotions.read",
    "promotions.manage",
    "quality.read",
    "quality.manage",
    "ops.read",
    "ops.manage",
    "telemetry.read",
    "telemetry.manage",
    "governance.read",
    "governance.manage",
    "approvals.review",
    "settings.read",
    "settings.manageUsers",
    "settings.manageEnvironment",
    "activity.read",
    "exports.manage",
  ],
  Operator: [
    "dashboard.read",
    "catalog.read",
    "catalog.edit",
    "submissions.read",
    "submissions.edit",
    "moderation.read",
    "moderation.edit",
    "promotions.read",
    "promotions.manage",
    "quality.read",
    "quality.manage",
    "ops.read",
    "ops.manage",
    "telemetry.read",
    "telemetry.manage",
    "governance.read",
    "settings.read",
    "activity.read",
    "exports.manage",
  ],
  Reviewer: [
    "dashboard.read",
    "catalog.read",
    "submissions.read",
    "submissions.edit",
    "moderation.read",
    "moderation.edit",
    "promotions.read",
    "quality.read",
    "quality.manage",
    "ops.read",
    "telemetry.read",
    "telemetry.manage",
    "governance.read",
    "approvals.review",
    "settings.read",
    "activity.read",
  ],
  Analyst: [
    "dashboard.read",
    "catalog.read",
    "submissions.read",
    "promotions.read",
    "quality.read",
    "ops.read",
    "telemetry.read",
    "governance.read",
    "settings.read",
    "activity.read",
  ],
};

const DEFAULT_STORE = {
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
    safetyCaps: {
      maxNamesPerRun: 50,
      failMode: "fail-closed",
      maxDailyExports: 3,
    },
  },
};

function safeReadJson(url, fallback) {
  try {
    return JSON.parse(readFileSync(url, "utf8"));
  } catch {
    return fallback;
  }
}

function loadSeededAdminStore() {
  return safeReadJson(ADMIN_CONTROL_PLANE_SEED_URL, DEFAULT_STORE);
}

function mergePersistedAdminStore(seededStore, store) {
  const persistedStore = store || {};
  return {
    ...DEFAULT_STORE,
    ...seededStore,
    ...persistedStore,
    settings: {
      ...DEFAULT_STORE.settings,
      ...(seededStore.settings || {}),
      ...(persistedStore.settings || {}),
      safetyCaps: {
        ...DEFAULT_STORE.settings.safetyCaps,
        ...(seededStore.settings?.safetyCaps || {}),
        ...(persistedStore.settings?.safetyCaps || {}),
      },
    },
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableStringify(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

function sortByPriority(items, key = "priority") {
  return [...items].sort((left, right) => (PRIORITY_RANK[right[key]] || 0) - (PRIORITY_RANK[left[key]] || 0));
}

function sortByDate(items, key = "createdAt") {
  return [...items].sort((left, right) => new Date(right[key] || 0).valueOf() - new Date(left[key] || 0).valueOf());
}

function sanitizeControlPlaneAdminUser(user) {
  return user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    : null;
}

function buildMutationIdempotencyKey(scope, idempotencyKey) {
  return idempotencyKey ? `mutation:${scope}:${idempotencyKey}` : "";
}

function readMutationIdempotency(store, scope, idempotencyKey) {
  if (!idempotencyKey) {
    return null;
  }

  const entry = store.idempotencyLedger[buildMutationIdempotencyKey(scope, idempotencyKey)];
  return entry?.data ? structuredClone(entry.data) : null;
}

function rememberMutationIdempotency(store, scope, idempotencyKey, data, recordedAt = new Date().toISOString()) {
  if (!idempotencyKey) {
    return;
  }

  store.idempotencyLedger[buildMutationIdempotencyKey(scope, idempotencyKey)] = {
    kind: "mutation",
    recordedAt,
    data: structuredClone(data),
  };
}

function checksum(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function normalizeCommand(command) {
  return COMMAND_ALIASES[command] || command;
}

export function canRunCommand(role, command) {
  const normalized = normalizeCommand(command);
  const capability = COMMAND_CAPABILITY[normalized];
  return capability ? hasCapability(role, capability) : false;
}

function buildAuditEvent({ kind, actorId, entityType, entityId, idempotencyKey, summary, metadata = {} }) {
  return {
    id: `evt_${randomUUID()}`,
    kind,
    actorId,
    entityType,
    entityId,
    idempotencyKey,
    summary,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function healthSeverity(score) {
  if (score >= 90) return "info";
  if (score >= 75) return "warning";
  return "high";
}

function deriveTools(projects, overrides, readmeHealth) {
  const healthByRepo = new Map(safeArray(readmeHealth.results).map((entry) => [entry.repo, entry]));

  return safeArray(projects).map((project) => {
    const slug = project.repo || project.slug || project.id;
    const override = overrides?.[slug] || {};
    const health = healthByRepo.get(slug);
    return {
      slug,
      name: project.name || slug,
      tagline: override.tagline || project.description || "",
      category: override.category || project.category || "uncategorized",
      featured: override.featured === true,
      publicProof: override.publicProof === true,
      lifecycle: "published",
      tags: override.tags || project.tags || [],
      healthScore: health?.score ?? null,
      healthSeverity: health ? healthSeverity(health.score) : "info",
    };
  });
}

function pickDefined(...values) {
  for (const value of values) {
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

export function mergeCatalogDrafts(tools, drafts) {
  const merged = new Map(safeArray(tools).map((tool) => [tool.slug, { ...tool }]));

  for (const draft of safeArray(drafts)) {
    const slug = draft.slug || draft.toolSlug;
    if (!slug) {
      continue;
    }

    const current = merged.get(slug) || {
      slug,
      name: draft.name || slug,
      tagline: "",
      category: "uncategorized",
      featured: false,
      publicProof: false,
      lifecycle: draft.lifecycle || "draft",
      tags: [],
      healthScore: null,
      healthSeverity: "info",
    };

    merged.set(slug, {
      ...current,
      name: pickDefined(draft.name, current.name),
      tagline: pickDefined(draft.tagline, current.tagline),
      category: pickDefined(draft.category, current.category),
      featured: pickDefined(draft.featured, current.featured),
      publicProof: pickDefined(draft.publicProof, current.publicProof),
      lifecycle: pickDefined(draft.lifecycle, current.lifecycle),
      tags: Array.isArray(draft.tags) ? draft.tags : current.tags,
      draftId: draft.id || null,
      draftStatus: draft.status || "draft",
      draftReason: draft.reason || "",
      draftUpdatedAt: draft.updatedAt || draft.createdAt || null,
    });
  }

  return [...merged.values()];
}

function deriveQualityFindings(readmeHealth, realityFindings, store) {
  const healthFindings = safeArray(readmeHealth.results)
    .filter((entry) => entry.capReason || entry.score < 80)
    .slice(0, 12)
    .map((entry) => ({
      id: `health_${entry.repo}`,
      module: "quality",
      severity: entry.score < 60 ? "high" : "warning",
      status: "open",
      title: `${entry.repo} README health`,
      summary: entry.capReason || `README score ${entry.score}`,
      slug: entry.repo,
    }));

  const auditFindings = safeArray(realityFindings.findings).map((entry, index) => ({
    id: entry.id || `audit_${index}`,
    module: "quality",
    severity: entry.severity || "warning",
    status: entry.status || "open",
    title: entry.title || "Audit finding",
    summary: entry.summary || entry.reason || "Review required",
    slug: entry.slug || null,
  }));

  return [...healthFindings, ...auditFindings, ...safeArray(store.auditFindings || [])];
}

function deriveTelemetrySnapshots(telemetryRollup, store) {
  const snapshots = [];
  const metrics = telemetryRollup?.metrics || {};
  if (typeof metrics.verificationRate === "number") {
    snapshots.push({
      id: "tel_rollup_verification",
      label: "Verification rate",
      anomalyScore: metrics.verificationRate < 0.4 ? 0.88 : 0.18,
      status: metrics.verificationRate < 0.4 ? "investigate" : "healthy",
      capturedAt: telemetryRollup.generatedAt || new Date().toISOString(),
    });
  }

  return [...snapshots, ...safeArray(store.telemetrySnapshots)];
}

function derivePromotions(promoQueue, worthy, store) {
  const worthyReady = worthy?.repos ? Object.values(worthy.repos).filter((entry) => entry?.worthy).length : 0;
  return [
    {
      week: promoQueue?.week || "TBD",
      status: promoQueue?.slugs?.length ? "scheduled" : "draft",
      slugs: safeArray(promoQueue?.slugs).map((entry) => entry.slug || entry),
      promotionType: promoQueue?.promotionType || "own",
      notes: promoQueue?.notes || "",
      worthyReady,
    },
    ...safeArray(store.campaigns).map((campaign) => ({
      id: campaign.id,
      week: campaign.week,
      status: campaign.status,
      slugs: safeArray(campaign.slugs),
      promotionType: "campaign",
      notes: safeArray(campaign.channels).join(", "),
      worthyReady,
    })),
  ];
}

function deriveOpsRuns(opsHistory, store) {
  const historyRuns = safeArray(opsHistory).slice(0, 12).map((run, index) => ({
    id: run.runId || `ops_${index}`,
    status: run.publishErrors > 0 || run.batchOk === false ? "failed" : "ok",
    durationMs: run.totalDurationMs || 0,
    createdAt: run.date || new Date().toISOString(),
    summary: run.totalDurationHuman || `${Math.round((run.totalDurationMs || 0) / 1000)}s`,
    publishErrors: run.publishErrors || 0,
  }));

  return [...safeArray(store.opsRuns || []), ...historyRuns];
}

export function hasCapability(role, capability) {
  return Boolean(ROLE_CAPABILITIES[role]?.includes(capability));
}

export function transitionLifecycle(entity, event) {
  const transitions = {
    draft: { submit_for_review: "in_review" },
    in_review: { approve: "approved", reject: "rejected", reopen: "draft" },
    approved: { publish: "published", reject: "rejected" },
    published: { rollback: "rolled_back" },
    rejected: { reopen: "draft" },
    rolled_back: { reopen: "draft" },
  };

  const nextStatus = transitions[entity.status]?.[event.action];
  if (!nextStatus) {
    throw new Error(`Invalid lifecycle transition from ${entity.status} via ${event.action}`);
  }

  if (["reject", "rollback"].includes(event.action) && !event.reason?.trim()) {
    throw new Error("A reason is required for reject and rollback actions");
  }

  return {
    ...entity,
    status: nextStatus,
    reviewedBy: event.actorId,
    reason: event.reason || entity.reason,
    updatedAt: new Date().toISOString(),
  };
}

export function issueCommandEnvelope({ actorId, actorRole, command, entityType, entityId, reason, idempotencyKey }) {
  const normalizedCommand = normalizeCommand(command);
  const risk = COMMAND_RISK[normalizedCommand] || "low";
  const requiresApproval = normalizedCommand !== "approval.approve" && ["critical", "high"].includes(risk);
  const safeIdempotencyKey = idempotencyKey || randomUUID();
  const approval = requiresApproval
    ? {
        request: {
          id: `apr_${randomUUID()}`,
          module: entityType === "release" ? "governance" : "ops",
          title: `${normalizedCommand} ${entityId}`,
          status: "pending",
          priority: risk === "critical" ? "critical" : "high",
          entityType,
          entityId,
          requestedBy: actorId,
          requiredRoles: risk === "critical" ? ["Reviewer", "Owner"] : ["Reviewer"],
          reason,
          createdAt: new Date().toISOString(),
          deferredCommand: {
            command: normalizedCommand,
            entityType,
            entityId,
            reason,
          },
        },
      }
    : null;

  return {
    command: normalizedCommand,
    entityType,
    entityId,
    actorId,
    actorRole,
    risk,
    requiresApproval,
    approval,
    auditEvent: buildAuditEvent({
      kind: "command_requested",
      actorId,
      entityType,
      entityId,
      idempotencyKey: safeIdempotencyKey,
      summary: `Requested ${normalizedCommand} for ${entityId}`,
      metadata: { reason, risk },
    }),
  };
}

export async function loadPersistedAdminStore() {
  const seededStore = loadSeededAdminStore();
  const store = (await loadRawAdminStore().catch(() => seededStore)) || seededStore;
  return mergePersistedAdminStore(seededStore, store);
}

export async function savePersistedAdminStore(store) {
  await mutateRawAdminStore(() => ({ data: store, store }));
  return store;
}

export async function loadAdminState() {
  const store = await loadPersistedAdminStore();
  const projects = safeReadJson(PROJECTS_URL, []);
  const overrides = safeReadJson(OVERRIDES_URL, {});
  const publicSubmissions = safeReadJson(SUBMISSIONS_URL, { submissions: [] });
  const opsHistory = safeReadJson(OPS_HISTORY_URL, []);
  const promoQueue = safeReadJson(PROMO_QUEUE_URL, { week: "", slugs: [], promotionType: "own", notes: "" });
  const worthy = safeReadJson(WORTHY_URL, { repos: {} });
  const readmeHealth = safeReadJson(README_HEALTH_URL, { meta: {}, results: [] });
  const realityFindings = safeReadJson(REALITY_FINDINGS_URL, { findings: [] });
  const telemetryRollup = safeReadJson(TELEMETRY_ROLLUP_URL, { metrics: {} });
  const queueHealth = safeReadJson(QUEUE_HEALTH_URL, { submissions: 0, throughput: 0, stuckCount: 0 });

  return {
    ...store,
    tools: mergeCatalogDrafts(deriveTools(projects, overrides, readmeHealth), store.catalogDrafts),
    submissions: [...safeArray(publicSubmissions.submissions), ...safeArray(store.submissions)],
    overrides: Object.entries(overrides).map(([slug, value]) => ({ slug, ...value })),
    promotions: derivePromotions(promoQueue, worthy, store),
    auditFindings: deriveQualityFindings(readmeHealth, realityFindings, store),
    opsRuns: deriveOpsRuns(opsHistory, store),
    telemetrySnapshots: deriveTelemetrySnapshots(telemetryRollup, store),
    notifications: safeArray(store.notifications),
    queueHealth,
    worthy: worthy?.repos || {},
    telemetryRollup,
  };
}

export async function findInternalUserByEmail(email, state) {
  const resolvedState = state || (await loadAdminState());
  return resolvedState.users.find((user) => user.email.toLowerCase() === String(email || "").toLowerCase()) || null;
}

export function buildDashboardQueues(state) {
  return {
    approvals: sortByPriority(safeArray(state.approvals)).slice(0, 5),
    submissions: sortByPriority(safeArray(state.submissions)).slice(0, 5),
    incidents: sortByDate(safeArray(state.opsRuns).filter((run) => run.status === "failed")).slice(0, 5),
    exports: sortByDate(safeArray(state.exports)).slice(0, 5),
  };
}

export function buildAdminSnapshot(state) {
  const settings = {
    freezePromotion: false,
    ...(state.settings || {}),
  };
  const pendingApprovals = safeArray(state.approvals).filter((entry) => entry.status === "pending");
  const failedRuns = safeArray(state.opsRuns).filter((run) => run.status === "failed");
  const openFindings = safeArray(state.auditFindings).filter((finding) => finding.status === "open");

  const topAlerts = [
    ...pendingApprovals.map((entry) => ({
      severity: entry.priority === "critical" ? "critical" : "warning",
      title: entry.title,
      summary: entry.reason,
      href: "/admin/governance/",
    })),
    ...failedRuns.map((run) => ({
      severity: "critical",
      title: `Ops incident ${run.id}`,
      summary: run.summary || "Pipeline run failed",
      href: "/admin/ops/",
    })),
    ...openFindings.map((finding) => ({
      severity: finding.severity === "high" ? "warning" : "info",
      title: finding.title,
      summary: finding.summary,
      href: "/admin/quality/",
    })),
  ].sort((left, right) => (SEVERITY_RANK[right.severity] || 0) - (SEVERITY_RANK[left.severity] || 0));

  return {
    kpis: {
      tools: {
        total: safeArray(state.tools).length,
        featured: safeArray(state.tools).filter((tool) => tool.featured).length,
      },
      approvals: {
        pending: pendingApprovals.length,
        critical: pendingApprovals.filter((entry) => entry.priority === "critical").length,
      },
      operations: {
        failedRuns: failedRuns.length,
        queuedJobs: safeArray(state.jobs).filter((job) => job.status === "queued").length,
        unreadNotifications: safeArray(state.notifications).filter((entry) => entry.status !== "resolved").length,
      },
      releases: {
        ready: safeArray(state.releases).filter((release) => release.status === "approved").length,
        previewReady: safeArray(state.exports).filter((entry) => ["preview_ready", "verified"].includes(entry.status)).length,
      },
    },
    topAlerts,
    queues: buildDashboardQueues(state),
    promotionCalendar: safeArray(state.promotions).slice(0, 4),
    commandCenter: [
      {
        action: "freeze_promotion",
        label: settings.freezePromotion ? "Promotion frozen" : "Freeze promotion",
        description: "Pause all promotion publishes until the approval queue is cleared.",
        risk: "high",
      },
      {
        action: "rerun_export",
        label: "Rerun export",
        description: "Rebuild admin export projections and validation bundle.",
        risk: "medium",
      },
      {
        action: "rollback_release",
        label: "Rollback release",
        description: "Roll back the last published bundle with an auditable reason.",
        risk: "high",
      },
      {
        action: "escalate_queue",
        label: "Escalate queue",
        description: "Raise reviewer attention on stalled submissions and approvals.",
        risk: "medium",
      },
    ],
  };
}

export function buildPublicArtifactPreview(state) {
  const artifacts = [
    {
      fileName: "promo-queue.json",
      count: safeArray(state.promotions[0]?.slugs).length,
      checksum: checksum({ week: state.promotions[0]?.week, slugs: state.promotions[0]?.slugs || [] }),
    },
    {
      fileName: "submissions.json",
      count: safeArray(state.submissions).length,
      checksum: checksum(safeArray(state.submissions).map((entry) => ({ slug: entry.slug, status: entry.status }))),
    },
    {
      fileName: "overrides.json",
      count: safeArray(state.overrides).length,
      checksum: checksum(safeArray(state.overrides).slice(0, 50)),
    },
    {
      fileName: "worthy.json",
      count: Object.keys(state.worthy || {}).length,
      checksum: checksum(state.worthy || {}),
    },
  ];

  return {
    artifacts,
    receipt: {
      id: `rcpt_${randomUUID()}`,
      status: "preview_ready",
      generatedAt: new Date().toISOString(),
      artifactCount: artifacts.length,
    },
  };
}

function queuePipelineJobs(store, { scope = "manual", requestedBy, reason = "" }) {
  const createdAt = new Date().toISOString();

  for (const [index, kind] of PIPELINE_JOB_KINDS.entries()) {
    store.jobs.unshift({
      id: `job_${randomUUID()}`,
      kind,
      status: "queued",
      scope,
      createdAt: new Date(Date.parse(createdAt) + index * 1000).toISOString(),
      requestedBy,
      reason,
    });
  }
}

function pushNotification(store, notification) {
  store.notifications.unshift(notification);
}

function buildOperatorNotification({
  kind,
  title,
  summary,
  entityType,
  entityId,
  actorId,
  tone = "system",
}) {
  return {
    id: `note_${randomUUID()}`,
    kind,
    title,
    summary,
    entityType,
    entityId,
    status: "unread",
    tone,
    createdAt: new Date().toISOString(),
    actorId,
  };
}

function exportStageForJobKind(kind) {
  return JOB_STATUS_BY_KIND[kind] || "exported";
}

function artifactTypeForJobKind(kind) {
  if (kind === "validate") return "validation-report";
  if (kind === "preview") return "preview-bundle";
  if (kind === "export") return "publish-bundle";
  if (kind === "verify") return "verification-receipt";
  return `${kind || "ops"}-artifact`;
}

export function processQueuedJobs(store, { actorId = "system" } = {}) {
  const nextStore = cloneStore(store);
  const queuedJobs = safeArray(nextStore.jobs)
    .filter((job) => job.status === "queued")
    .sort((left, right) => new Date(left.createdAt || 0).valueOf() - new Date(right.createdAt || 0).valueOf());

  for (const queuedJob of queuedJobs) {
    const index = nextStore.jobs.findIndex((job) => job.id === queuedJob.id);
    if (index === -1) {
      continue;
    }

    const completedAt = new Date().toISOString();
    const exportStatus = exportStageForJobKind(queuedJob.kind);
    const artifactType = artifactTypeForJobKind(queuedJob.kind);

    nextStore.exports.unshift({
      id: `exp_${randomUUID()}`,
      artifactType,
      status: exportStatus,
      scope: queuedJob.scope || "manual",
      createdAt: completedAt,
      jobId: queuedJob.id,
      receiptId: exportStatus === "verified" ? `rcpt_${randomUUID()}` : null,
    });

    pushNotification(
      nextStore,
      buildOperatorNotification({
        kind: "job",
        title: `${queuedJob.kind || "job"} completed`,
        summary: `${artifactType} for ${queuedJob.scope || "manual"} reached ${exportStatus}.`,
        entityType: "job",
        entityId: queuedJob.id,
        actorId,
        tone: exportStatus === "verified" ? "success" : "system",
      })
    );

    nextStore.opsRuns.unshift({
      id: `ops_${randomUUID()}`,
      status: "ok",
      durationMs: 1200,
      createdAt: completedAt,
      summary: `${queuedJob.kind} pipeline stage completed for ${queuedJob.scope || "manual"}`,
      publishErrors: 0,
      jobId: queuedJob.id,
    });

    nextStore.auditEvents.push(
      buildAuditEvent({
        kind: "job_completed",
        actorId,
        entityType: "job",
        entityId: queuedJob.id,
        idempotencyKey: `job:${queuedJob.id}:${completedAt}`,
        summary: `Completed ${queuedJob.kind} for ${queuedJob.scope || "manual"}`,
        metadata: {
          kind: queuedJob.kind,
          scope: queuedJob.scope || "manual",
          exportStatus,
          artifactType,
        },
      })
    );

    nextStore.jobs[index] = {
      ...queuedJob,
      status: "completed",
      completedAt,
      processedBy: actorId,
      result: exportStatus,
    };
  }

  return nextStore;
}

export async function getModuleData(moduleName, state) {
  const resolvedState = state || (await loadAdminState());
  switch (moduleName) {
    case "overview":
      return buildAdminSnapshot(resolvedState);
    case "catalog":
      return {
        tools: safeArray(resolvedState.tools).slice(0, 48),
        drafts: sortByDate(safeArray(resolvedState.catalogDrafts), "updatedAt"),
      };
    case "submissions":
      return { queueHealth: resolvedState.queueHealth, submissions: sortByPriority(safeArray(resolvedState.submissions)) };
    case "moderation":
      return {
        overrides: sortByPriority(safeArray(resolvedState.overrideWorkItems)),
        reviews: sortByPriority(safeArray(resolvedState.reviews)),
        approvals: sortByPriority(safeArray(resolvedState.approvals).filter((entry) => entry.entityType === "override")),
      };
    case "promotions":
      return {
        promotions: safeArray(resolvedState.promotions),
        campaigns: safeArray(resolvedState.campaigns),
        worthy: Object.entries(resolvedState.worthy || {}).slice(0, 24),
        exports: sortByDate(safeArray(resolvedState.exports)),
      };
    case "quality":
      return {
        findings: sortByPriority(
          safeArray(resolvedState.auditFindings).map((finding) => ({
            ...finding,
            priority: finding.severity === "high" ? "high" : "medium",
          }))
        ),
        notifications: sortByDate(safeArray(resolvedState.notifications)).slice(0, 12),
      };
    case "ops":
      return {
        runs: sortByDate(safeArray(resolvedState.opsRuns)),
        jobs: sortByDate(safeArray(resolvedState.jobs)),
        notifications: sortByDate(safeArray(resolvedState.notifications)).slice(0, 12),
        safetyCaps: resolvedState.settings.safetyCaps,
      };
    case "telemetry":
      return {
        snapshots: sortByDate(safeArray(resolvedState.telemetrySnapshots), "capturedAt"),
        rollup: resolvedState.telemetryRollup,
        notifications: sortByDate(
          safeArray(resolvedState.notifications).filter((entry) => entry.kind === "telemetry"),
          "createdAt"
        ).slice(0, 10),
      };
    case "governance":
      return { approvals: sortByPriority(safeArray(resolvedState.approvals)), releases: sortByDate(safeArray(resolvedState.releases)), exports: sortByDate(safeArray(resolvedState.exports)), activity: sortByDate(safeArray(resolvedState.auditEvents)) };
    case "settings":
      return { users: safeArray(resolvedState.users).map(sanitizeControlPlaneAdminUser), settings: resolvedState.settings };
    default:
      return buildAdminSnapshot(resolvedState);
  }
}

function cloneStore(store) {
  return {
    ...structuredClone(DEFAULT_STORE),
    ...structuredClone(store),
    users: structuredClone(safeArray(store.users)),
    submissions: structuredClone(safeArray(store.submissions)),
    catalogDrafts: structuredClone(safeArray(store.catalogDrafts)),
    reviews: structuredClone(safeArray(store.reviews)),
    overrideWorkItems: structuredClone(safeArray(store.overrideWorkItems)),
    approvals: structuredClone(safeArray(store.approvals)),
    campaigns: structuredClone(safeArray(store.campaigns)),
    jobs: structuredClone(safeArray(store.jobs)),
    opsRuns: structuredClone(safeArray(store.opsRuns)),
    releases: structuredClone(safeArray(store.releases)),
    exports: structuredClone(safeArray(store.exports)),
    auditFindings: structuredClone(safeArray(store.auditFindings)),
    telemetrySnapshots: structuredClone(safeArray(store.telemetrySnapshots)),
    notifications: structuredClone(safeArray(store.notifications)),
    auditEvents: structuredClone(safeArray(store.auditEvents)),
    idempotencyLedger: structuredClone(store.idempotencyLedger || {}),
    settings: structuredClone({
      ...DEFAULT_STORE.settings,
      ...(store.settings || {}),
      safetyCaps: {
        ...DEFAULT_STORE.settings.safetyCaps,
        ...(store.settings?.safetyCaps || {}),
      },
    }),
  };
}

function updateSubmission(store, submissionId, patch) {
  const submissionIndex = store.submissions.findIndex((submission) => submission.id === submissionId);
  if (submissionIndex === -1) {
    return null;
  }

  store.submissions[submissionIndex] = {
    ...store.submissions[submissionIndex],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  return store.submissions[submissionIndex];
}

function ensureApprovalReviewAllowed(approval, input) {
  if (approval.status !== "pending") {
    const error = new Error("Approval request is not pending");
    error.statusCode = 409;
    throw error;
  }

  if (approval.requestedBy === input.actorId) {
    const error = new Error("You cannot approve your own request");
    error.statusCode = 403;
    throw error;
  }

  if (safeArray(approval.requiredRoles).length > 0 && !approval.requiredRoles.includes(input.actorRole)) {
    const error = new Error("Insufficient approval role");
    error.statusCode = 403;
    throw error;
  }
}

function executeApprovedMutation(store, envelope) {
  if (envelope.command === "settings.freeze_promotion") {
    store.settings.freezePromotion = true;
    return;
  }

  if (envelope.command === "export.rerun") {
    queuePipelineJobs(store, {
      scope: envelope.entityId || "manual",
      requestedBy: envelope.actorId,
      reason: envelope.auditEvent.metadata.reason,
    });
    pushNotification(
      store,
      buildOperatorNotification({
        kind: "job",
        title: "Export rerun queued",
        summary: `Queued validate, preview, export, and verify jobs for ${envelope.entityId || "manual"}.`,
        entityType: envelope.entityType,
        entityId: envelope.entityId,
        actorId: envelope.actorId,
      })
    );
    return;
  }

  if (envelope.command === "release.rollback") {
    const index = store.releases.findIndex((release) => release.id === envelope.entityId);
    if (index !== -1) {
      store.releases[index] = transitionLifecycle(store.releases[index], {
        action: "rollback",
        actorId: envelope.actorId,
        reason: envelope.auditEvent.metadata.reason,
      });
    }
    return;
  }

  if (envelope.command === "queue.escalate") {
    const escalatedSubmission = updateSubmission(store, envelope.entityId, {
      priority: "high",
      escalatedAt: new Date().toISOString(),
      escalationReason: envelope.auditEvent.metadata.reason,
      escalatedBy: envelope.actorId,
    });

    store.auditEvents.push(
      buildAuditEvent({
        kind: "queue_escalated",
        actorId: envelope.actorId,
        entityType: envelope.entityType,
        entityId: envelope.entityId,
        idempotencyKey: envelope.auditEvent.idempotencyKey,
        summary: `Escalated ${envelope.entityType} ${envelope.entityId}`,
        metadata: {
          ...envelope.auditEvent.metadata,
          priority: escalatedSubmission?.priority || "high",
        },
      })
    );
    return;
  }

  if (envelope.command === "submission.request_info") {
    updateSubmission(store, envelope.entityId, {
      status: "needs-info",
      reviewNotes: envelope.auditEvent.metadata.reason,
      requestedInfoAt: new Date().toISOString(),
      reviewedBy: envelope.actorId,
    });
    return;
  }

  if (envelope.command === "submission.accept") {
    updateSubmission(store, envelope.entityId, {
      status: "accepted",
      acceptedAt: new Date().toISOString(),
      reviewedBy: envelope.actorId,
      resolutionReason: envelope.auditEvent.metadata.reason,
    });
    return;
  }

  if (envelope.command === "submission.reject") {
    updateSubmission(store, envelope.entityId, {
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      reviewedBy: envelope.actorId,
      resolutionReason: envelope.auditEvent.metadata.reason,
    });
    return;
  }

  if (envelope.command === "review.reopen") {
    const reviewIndex = store.reviews.findIndex((review) => review.id === envelope.entityId);
    if (reviewIndex !== -1) {
      store.reviews[reviewIndex] = {
        ...store.reviews[reviewIndex],
        status: "pending",
        updatedAt: new Date().toISOString(),
      };
    }
    return;
  }

  if (envelope.command === "release.publish") {
    const releaseIndex = store.releases.findIndex((release) => release.id === envelope.entityId);
    if (releaseIndex !== -1) {
      store.releases[releaseIndex] = {
        ...store.releases[releaseIndex],
        status: "published",
        publishedAt: new Date().toISOString(),
      };
    }
    store.exports.unshift({
      id: `exp_${randomUUID()}`,
      status: "verified",
      artifactType: "release-bundle",
      createdAt: new Date().toISOString(),
      releaseId: envelope.entityId,
      receiptId: `rcpt_${randomUUID()}`,
    });
    return;
  }

  if (envelope.command === "export.publish") {
    store.exports.unshift({
      id: `exp_${randomUUID()}`,
      status: "verified",
      artifactType: envelope.entityType,
      createdAt: new Date().toISOString(),
      receiptId: `rcpt_${randomUUID()}`,
    });
  }
}

export function applyCommandToStore(store, input) {
  const nextStore = cloneStore(store);
  if (input.idempotencyKey && nextStore.idempotencyLedger[input.idempotencyKey]) {
    return {
      store: nextStore,
      envelope: nextStore.idempotencyLedger[input.idempotencyKey],
    };
  }
  const envelope = issueCommandEnvelope(input);
  nextStore.auditEvents.push(envelope.auditEvent);

  if (envelope.command === "approval.approve") {
    const approvalIndex = nextStore.approvals.findIndex((entry) => entry.id === envelope.entityId);
    if (approvalIndex === -1) {
      throw new Error(`Unknown approval request ${envelope.entityId}`);
    }

    const approval = nextStore.approvals[approvalIndex];
    ensureApprovalReviewAllowed(approval, input);
    nextStore.approvals[approvalIndex] = {
      ...approval,
      status: "approved",
      approvedBy: input.actorId,
      approvedAt: new Date().toISOString(),
      resolutionReason: input.reason,
    };

    nextStore.auditEvents.push(
      buildAuditEvent({
        kind: "approval_approved",
        actorId: input.actorId,
        entityType: "approval",
        entityId: approval.id,
        idempotencyKey: envelope.auditEvent.idempotencyKey,
        summary: `Approved ${approval.id}`,
        metadata: { reason: input.reason },
      })
    );

    if (approval.deferredCommand) {
      const deferredEnvelope = issueCommandEnvelope({
        actorId: input.actorId,
        actorRole: input.actorRole,
        ...approval.deferredCommand,
        idempotencyKey: `${envelope.auditEvent.idempotencyKey}:deferred`,
      });
      executeApprovedMutation(nextStore, { ...deferredEnvelope, requiresApproval: false, approval: null });
    }

    return { store: nextStore, envelope };
  }

  if (envelope.requiresApproval && envelope.approval) {
    nextStore.approvals.push(envelope.approval.request);
    nextStore.idempotencyLedger[envelope.auditEvent.idempotencyKey] = envelope;
    return { store: nextStore, envelope };
  }

  executeApprovedMutation(nextStore, envelope);
  nextStore.idempotencyLedger[envelope.auditEvent.idempotencyKey] = envelope;
  return { store: nextStore, envelope };
}

export async function applyAdminCommand(input) {
  const result = await mutateAdminStore(async (currentStore) => {
    const next = applyCommandToStore(currentStore, input);
    return {
      data: next.envelope,
      store: next.store,
    };
  });
  return { envelope: result.data, state: result.state };
}

function normalizeText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function hasOwn(value, key) {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "no") {
    return false;
  }

  return fallback;
}

function normalizeEnumValue(value, allowedValues, label, fallback) {
  const normalized = normalizeText(value, fallback).toLowerCase();
  if (allowedValues.has(normalized)) {
    return normalized;
  }

  const error = new Error(`Invalid ${label}`);
  error.statusCode = 400;
  throw error;
}

function normalizeOptionalEnumField(input, key, allowedValues, label, fallback) {
  if (!hasOwn(input, key)) {
    return fallback;
  }

  return normalizeEnumValue(input[key], allowedValues, label, fallback);
}

function normalizeTelemetryScore(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    const error = new Error("Invalid anomaly score");
    error.statusCode = 400;
    throw error;
  }

  return score;
}

function upsertById(collection, nextEntry, matcher = (entry) => entry.id === nextEntry.id) {
  const index = collection.findIndex((entry) => matcher(entry));
  if (index === -1) {
    collection.unshift(nextEntry);
    return nextEntry;
  }

  collection[index] = {
    ...collection[index],
    ...nextEntry,
  };
  return collection[index];
}

async function mutateAdminStore(mutator) {
  const { data, store } = await mutateRawAdminStore(
    async (rawStore) => {
      const nextStore = cloneStore(mergePersistedAdminStore(loadSeededAdminStore(), rawStore));
      const result = await mutator(nextStore);
      if (result && typeof result === "object" && Object.prototype.hasOwnProperty.call(result, "store")) {
        return {
          data: result.data,
          store: result.store,
        };
      }

      return {
        data: result,
        store: nextStore,
      };
    },
    process.env,
    { seedFactory: () => loadSeededAdminStore() }
  );
  return {
    data,
    state: await loadAdminState(),
    store,
  };
}

export async function saveCatalogDraft(input, { actorId, idempotencyKey } = {}) {
  return mutateAdminStore(async (store) => {
    const storedResult = readMutationIdempotency(store, "catalog", idempotencyKey);
    if (storedResult) {
      return storedResult;
    }

    const slug = normalizeText(input.slug);
    if (!slug) {
      const error = new Error("Catalog draft slug is required");
      error.statusCode = 400;
      throw error;
    }

    const timestamp = new Date().toISOString();
    const existing = store.catalogDrafts.find((entry) => entry.id === input.id || entry.slug === slug);
    const draft = upsertById(
      store.catalogDrafts,
      {
        id: normalizeText(input.id, existing?.id || `draft_${slug}`),
        slug,
        ...(hasOwn(input, "name") || !existing ? { name: normalizeText(input.name) || undefined } : {}),
        ...(hasOwn(input, "tagline") || !existing ? { tagline: normalizeText(input.tagline) } : {}),
        ...(hasOwn(input, "category") || !existing
          ? { category: normalizeText(input.category, existing?.category || "uncategorized") }
          : {}),
        ...(hasOwn(input, "featured") || !existing
          ? { featured: normalizeBoolean(input.featured, existing?.featured ?? false) }
          : {}),
        ...(hasOwn(input, "publicProof") || !existing
          ? { publicProof: normalizeBoolean(input.publicProof, existing?.publicProof ?? false) }
          : {}),
        ...(hasOwn(input, "tags") || !existing ? { tags: normalizeList(input.tags) } : {}),
        status: normalizeOptionalEnumField(input, "status", LIFECYCLE_STATUSES, "catalog draft status", existing?.status || "draft"),
        ...(hasOwn(input, "reason") || !existing ? { reason: normalizeText(input.reason) } : {}),
        ownerId: existing?.ownerId || actorId,
        updatedAt: timestamp,
        createdAt: existing?.createdAt || timestamp,
      },
      (entry) => entry.id === input.id || entry.slug === slug
    );

    pushNotification(
      store,
      buildOperatorNotification({
        kind: "catalog",
        title: `Catalog draft saved for ${slug}`,
        summary: draft.reason || "Catalog metadata staged for review.",
        entityType: "tool",
        entityId: slug,
        actorId,
      })
    );
    store.auditEvents.push(
      buildAuditEvent({
        kind: "catalog_draft_saved",
        actorId,
        entityType: "tool",
        entityId: slug,
        idempotencyKey: `catalog:${draft.id}:${timestamp}`,
        summary: `Saved catalog draft for ${slug}`,
        metadata: { status: draft.status, tags: draft.tags },
      })
    );

    rememberMutationIdempotency(store, "catalog", idempotencyKey, draft, timestamp);
    return draft;
  });
}

export async function saveOverrideWorkItem(input, { actorId, idempotencyKey } = {}) {
  return mutateAdminStore(async (store) => {
    const storedResult = readMutationIdempotency(store, "override", idempotencyKey);
    if (storedResult) {
      return storedResult;
    }

    const slug = normalizeText(input.slug);
    if (!slug) {
      const error = new Error("Override slug is required");
      error.statusCode = 400;
      throw error;
    }

    const timestamp = new Date().toISOString();
    const existing = store.overrideWorkItems.find((entry) => entry.id === input.id || entry.slug === slug);
    const item = upsertById(
      store.overrideWorkItems,
      {
        id: normalizeText(input.id, existing?.id || `ovr_${slug}`),
        slug,
        policy: normalizeOptionalEnumField(input, "policy", OVERRIDE_POLICIES, "override policy", existing?.policy || "metadata"),
        severity: normalizeOptionalEnumField(input, "severity", OVERRIDE_SEVERITIES, "override severity", existing?.severity || "warning"),
        status: normalizeOptionalEnumField(input, "status", LIFECYCLE_STATUSES, "override status", existing?.status || "in_review"),
        ...(hasOwn(input, "notes") || !existing ? { notes: normalizeText(input.notes) } : {}),
        ...(hasOwn(input, "reason") || !existing ? { reason: normalizeText(input.reason) } : {}),
        reviewerId: existing?.reviewerId || actorId,
        updatedAt: timestamp,
        createdAt: existing?.createdAt || timestamp,
      },
      (entry) => entry.id === input.id || entry.slug === slug
    );

    pushNotification(
      store,
      buildOperatorNotification({
        kind: "moderation",
        title: `Override updated for ${slug}`,
        summary: item.notes || item.reason || "Moderation work item updated.",
        entityType: "override",
        entityId: item.id,
        actorId,
        tone: item.severity === "critical" ? "danger" : "warning",
      })
    );
    store.auditEvents.push(
      buildAuditEvent({
        kind: "override_saved",
        actorId,
        entityType: "override",
        entityId: item.id,
        idempotencyKey: `override:${item.id}:${timestamp}`,
        summary: `Saved override work item for ${slug}`,
        metadata: { status: item.status, severity: item.severity },
      })
    );

    rememberMutationIdempotency(store, "override", idempotencyKey, item, timestamp);
    return item;
  });
}

export async function saveCampaign(input, { actorId, idempotencyKey } = {}) {
  return mutateAdminStore(async (store) => {
    const storedResult = readMutationIdempotency(store, "campaign", idempotencyKey);
    if (storedResult) {
      return storedResult;
    }

    const week = normalizeText(input.week);
    if (!week) {
      const error = new Error("Campaign week is required");
      error.statusCode = 400;
      throw error;
    }

    const timestamp = new Date().toISOString();
    const existing = store.campaigns.find((entry) => entry.id === input.id || entry.week === week);
    const campaign = upsertById(
      store.campaigns,
      {
        id: normalizeText(input.id, existing?.id || `cmp_${week.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`),
        week,
        status: normalizeOptionalEnumField(input, "status", CAMPAIGN_STATUSES, "campaign status", existing?.status || "draft"),
        ...(hasOwn(input, "slugs") || !existing ? { slugs: normalizeList(input.slugs) } : {}),
        ...(hasOwn(input, "channels") || !existing ? { channels: normalizeList(input.channels) } : {}),
        ownerId: existing?.ownerId || actorId,
        ...(hasOwn(input, "notes") || !existing ? { notes: normalizeText(input.notes) } : {}),
        updatedAt: timestamp,
        createdAt: existing?.createdAt || timestamp,
      },
      (entry) => entry.id === input.id || entry.week === week
    );

    pushNotification(
      store,
      buildOperatorNotification({
        kind: "promotion",
        title: `Campaign ${campaign.week} saved`,
        summary: campaign.notes || `${campaign.slugs.length} slugs across ${campaign.channels.length} channels.`,
        entityType: "campaign",
        entityId: campaign.id,
        actorId,
      })
    );
    store.auditEvents.push(
      buildAuditEvent({
        kind: "campaign_saved",
        actorId,
        entityType: "campaign",
        entityId: campaign.id,
        idempotencyKey: `campaign:${campaign.id}:${timestamp}`,
        summary: `Saved campaign ${campaign.week}`,
        metadata: { status: campaign.status, slugs: campaign.slugs },
      })
    );

    rememberMutationIdempotency(store, "campaign", idempotencyKey, campaign, timestamp);
    return campaign;
  });
}

export async function saveAuditFinding(input, { actorId, idempotencyKey } = {}) {
  return mutateAdminStore(async (store) => {
    const storedResult = readMutationIdempotency(store, "finding", idempotencyKey);
    if (storedResult) {
      return storedResult;
    }

    const title = normalizeText(input.title);
    if (!title) {
      const error = new Error("Finding title is required");
      error.statusCode = 400;
      throw error;
    }

    const timestamp = new Date().toISOString();
    const findingSlug = hasOwn(input, "slug") ? normalizeText(input.slug) || null : undefined;
    const matchesExistingFinding = (entry) =>
      entry.id === input.id ||
      (!input.id &&
        entry.title === title &&
        (findingSlug === undefined || (entry.slug || null) === findingSlug));
    const existing = store.auditFindings.find(matchesExistingFinding);
    const finding = upsertById(
      store.auditFindings,
      {
        id: normalizeText(input.id, existing?.id || `finding_${randomUUID()}`),
        module: "quality",
        title,
        ...(hasOwn(input, "summary") || !existing ? { summary: normalizeText(input.summary) } : {}),
        ...(hasOwn(input, "slug") || !existing ? { slug: findingSlug ?? null } : {}),
        severity: normalizeOptionalEnumField(input, "severity", FINDING_SEVERITIES, "finding severity", existing?.severity || "warning"),
        status: normalizeOptionalEnumField(input, "status", FINDING_STATUSES, "finding status", existing?.status || "open"),
        ownerId: existing?.ownerId || actorId,
        updatedAt: timestamp,
        createdAt: existing?.createdAt || timestamp,
      },
      matchesExistingFinding
    );

    pushNotification(
      store,
      buildOperatorNotification({
        kind: "quality",
        title: `Quality finding ${finding.status}`,
        summary: `${finding.title}${finding.slug ? ` for ${finding.slug}` : ""}`,
        entityType: "finding",
        entityId: finding.id,
        actorId,
        tone: finding.severity === "high" ? "danger" : "warning",
      })
    );
    store.auditEvents.push(
      buildAuditEvent({
        kind: "finding_saved",
        actorId,
        entityType: "finding",
        entityId: finding.id,
        idempotencyKey: `finding:${finding.id}:${timestamp}`,
        summary: `Saved quality finding ${finding.title}`,
        metadata: { severity: finding.severity, status: finding.status },
      })
    );

    rememberMutationIdempotency(store, "finding", idempotencyKey, finding, timestamp);
    return finding;
  });
}

export async function saveTelemetrySnapshot(input, { actorId, idempotencyKey } = {}) {
  return mutateAdminStore(async (store) => {
    const storedResult = readMutationIdempotency(store, "telemetry", idempotencyKey);
    if (storedResult) {
      return storedResult;
    }

    const label = normalizeText(input.label);
    if (!label) {
      const error = new Error("Telemetry label is required");
      error.statusCode = 400;
      throw error;
    }

    const timestamp = new Date().toISOString();
    const existing = store.telemetrySnapshots.find((entry) => entry.id === input.id);
    const snapshot = upsertById(
      store.telemetrySnapshots,
      {
        id: normalizeText(input.id, existing?.id || `tel_${randomUUID()}`),
        label,
        status: normalizeOptionalEnumField(input, "status", TELEMETRY_STATUSES, "telemetry status", existing?.status || "investigate"),
        anomalyScore: normalizeTelemetryScore(input.anomalyScore, existing?.anomalyScore ?? 0),
        ...(hasOwn(input, "note") || !existing ? { note: normalizeText(input.note) } : {}),
        capturedAt: existing?.capturedAt || timestamp,
        ownerId: existing?.ownerId || actorId,
        updatedAt: timestamp,
      },
      (entry) => entry.id === input.id
    );

    pushNotification(
      store,
      buildOperatorNotification({
        kind: "telemetry",
        title: `${label} snapshot logged`,
        summary: snapshot.note || `Anomaly score ${snapshot.anomalyScore}.`,
        entityType: "telemetry",
        entityId: snapshot.id,
        actorId,
        tone: snapshot.status === "healthy" ? "success" : "warning",
      })
    );
    store.auditEvents.push(
      buildAuditEvent({
        kind: "telemetry_saved",
        actorId,
        entityType: "telemetry",
        entityId: snapshot.id,
        idempotencyKey: `telemetry:${snapshot.id}:${timestamp}`,
        summary: `Saved telemetry snapshot ${label}`,
        metadata: { anomalyScore: snapshot.anomalyScore, status: snapshot.status },
      })
    );

    rememberMutationIdempotency(store, "telemetry", idempotencyKey, snapshot, timestamp);
    return snapshot;
  });
}

export async function queueAdminJob(input, { actorId, idempotencyKey } = {}) {
  return mutateAdminStore(async (store) => {
    const storedResult = readMutationIdempotency(store, "job", idempotencyKey);
    if (storedResult) {
      return storedResult;
    }

    const action = normalizeEnumValue(input.action, JOB_ACTIONS, "job action", "queue");
    const kind = normalizeEnumValue(input.kind, JOB_KINDS, "job kind", "pipeline");
    const scope = normalizeText(input.scope, "manual");
    const reason = normalizeText(input.reason);
    const timestamp = new Date().toISOString();

    if (action === "process") {
      const nextStore = processQueuedJobs(store, { actorId });
      Object.assign(store, nextStore);
      const result = { processed: true, jobs: nextStore.jobs };
      rememberMutationIdempotency(store, "job", idempotencyKey, result, timestamp);
      return result;
    }

    if (kind === "pipeline") {
      queuePipelineJobs(store, { scope, requestedBy: actorId, reason });
    } else {
      store.jobs.unshift({
        id: `job_${randomUUID()}`,
        kind,
        scope,
        reason,
        status: "queued",
        requestedBy: actorId,
        createdAt: timestamp,
      });
    }

    pushNotification(
      store,
      buildOperatorNotification({
        kind: "job",
        title: `${kind === "pipeline" ? "Pipeline" : kind} job queued`,
        summary: reason || `Queued work for ${scope}.`,
        entityType: "job",
        entityId: scope,
        actorId,
      })
    );
    store.auditEvents.push(
      buildAuditEvent({
        kind: "job_queued",
        actorId,
        entityType: "job",
        entityId: scope,
        idempotencyKey: `job:${scope}:${timestamp}`,
        summary: `Queued ${kind} work for ${scope}`,
        metadata: { reason, action },
      })
    );

    const result = { queued: true, jobs: store.jobs };
    rememberMutationIdempotency(store, "job", idempotencyKey, result, timestamp);
    return result;
  });
}

export async function resolveNotification(notificationId, { actorId, idempotencyKey } = {}) {
  return mutateAdminStore(async (store) => {
    const storedResult = readMutationIdempotency(store, "notification", idempotencyKey);
    if (storedResult) {
      return storedResult;
    }

    const id = normalizeText(notificationId);
    if (!id) {
      const error = new Error("Notification id is required");
      error.statusCode = 400;
      throw error;
    }
    const index = store.notifications.findIndex((entry) => entry.id === id);
    if (index === -1) {
      const error = new Error(`Unknown notification ${id}`);
      error.statusCode = 404;
      throw error;
    }
    const notification = {
      ...store.notifications[index],
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolvedBy: actorId,
    };
    store.notifications[index] = notification;

    store.auditEvents.push(
      buildAuditEvent({
        kind: "notification_resolved",
        actorId,
        entityType: "notification",
        entityId: id,
        idempotencyKey: `notification:${id}:${notification.resolvedAt}`,
        summary: `Resolved notification ${id}`,
      })
    );

    rememberMutationIdempotency(store, "notification", idempotencyKey, notification, notification.resolvedAt);
    return notification;
  });
}
