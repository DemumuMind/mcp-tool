import { buildAdminSnapshot, buildPublicArtifactPreview, getModuleData, loadAdminState } from "../../lib/admin/control-plane.mjs";

export interface AdminNavItem {
  href: string;
  label: string;
  code: string;
  shortLabel: string;
}

export interface AdminMetric {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "danger" | "warning" | "success" | "system";
}

export interface AdminFeedItem {
  title: string;
  meta: string;
  detail: string;
  status: string;
  tone?: "default" | "danger" | "warning" | "success" | "system";
}

export interface AdminPanel {
  kicker: string;
  title: string;
  summary: string;
  bullets: string[];
}

export interface AdminTable {
  title: string;
  caption: string;
  columns: string[];
  rows: string[][];
}

export interface AdminPageContent {
  path: string;
  eyebrow: string;
  badge: string;
  title: string;
  lede: string;
  meta: string[];
  metrics: AdminMetric[];
  actionItems: AdminFeedItem[];
  incidentItems: AdminFeedItem[];
  panels: AdminPanel[];
  table: AdminTable;
}

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin/", label: "Overview", shortLabel: "Overview", code: "OVR" },
  { href: "/admin/catalog/", label: "Catalog", shortLabel: "Catalog", code: "CAT" },
  { href: "/admin/submissions/", label: "Submissions", shortLabel: "Submit", code: "SUB" },
  { href: "/admin/moderation/", label: "Moderation", shortLabel: "Moderate", code: "MOD" },
  { href: "/admin/promotions/", label: "Promotions", shortLabel: "Promote", code: "PRM" },
  { href: "/admin/quality/", label: "Quality", shortLabel: "Quality", code: "QLT" },
  { href: "/admin/ops/", label: "Ops", shortLabel: "Ops", code: "OPS" },
  { href: "/admin/telemetry/", label: "Telemetry", shortLabel: "Telemetry", code: "TEL" },
  { href: "/admin/governance/", label: "Governance", shortLabel: "Govern", code: "GOV" },
  { href: "/admin/settings/", label: "Settings", shortLabel: "Settings", code: "SET" },
];

export const overviewModules = [
  {
    title: "Catalog control",
    href: "/admin/catalog/",
    code: "CAT",
    detail: "Tool lifecycle, category hygiene, featured inventory, public diff and evidence readiness.",
  },
  {
    title: "Submission intake",
    href: "/admin/submissions/",
    code: "SUB",
    detail: "Triage, dedupe, reviewer assignment, request-for-info loops and review timelines.",
  },
  {
    title: "Moderation workbench",
    href: "/admin/moderation/",
    code: "MOD",
    detail: "Overrides, policy flags, sanitization checks, reviewer reasons and approval gating.",
  },
  {
    title: "Promotion control",
    href: "/admin/promotions/",
    code: "PRM",
    detail: "Campaign queue, worthy filters, release windows, previews, receipts and bundle channels.",
  },
  {
    title: "Quality room",
    href: "/admin/quality/",
    code: "QLT",
    detail: "README health, invariant risk, broken proofs, data integrity findings and remediation ownership.",
  },
  {
    title: "Command center",
    href: "/admin/governance/",
    code: "GOV",
    detail: "Approvals, release gates, rollback candidates, export receipts, audit trails and operator controls.",
  },
];

export const adminPages: Record<string, AdminPageContent> = {
  overview: {
    path: "/admin/",
    eyebrow: "Executive dashboard",
    badge: "Internal backoffice",
    title: "Operator control plane",
    lede:
      "The internal command surface for catalog operations, promotion governance, approvals, audit readiness, and export staging.",
    meta: ["Closed access", "RBAC aware", "Approval-first", "Export staged"],
    metrics: [
      { label: "Pending approvals", value: "14", detail: "4 critical before Friday publish", tone: "danger" },
      { label: "Queue health", value: "86%", detail: "Median intake turnaround: 19h", tone: "system" },
      { label: "Open incidents", value: "3", detail: "2 ops, 1 public proof mismatch", tone: "warning" },
      { label: "Upcoming releases", value: "6", detail: "Next publish window: Mar 14", tone: "success" },
    ],
    actionItems: [
      {
        title: "Approve `zip-meta-map` export pack",
        meta: "Governance • due in 2h",
        detail: "Receipt preview is ready; presskit bundle and promo queue are blocked on final owner sign-off.",
        status: "Needs approval",
        tone: "danger",
      },
      {
        title: "Reassign 5 stalled submissions",
        meta: "Submissions • operator action",
        detail: "Reviewer queue crossed SLA for infrastructure tools. Ownership rebalance suggested.",
        status: "Escalate",
        tone: "warning",
      },
      {
        title: "Run export verification after ops rerun",
        meta: "Ops • follow-up",
        detail: "Artifact preview succeeded, but the latest NameOps batch has a stale cache ratio warning.",
        status: "Verify",
        tone: "system",
      },
    ],
    incidentItems: [
      {
        title: "Proof mismatch on `ledger-suite` landing copy",
        meta: "Quality room",
        detail: "The published marketing claim is ahead of the verified proof packet by one release.",
        status: "High risk",
        tone: "danger",
      },
      {
        title: "README health regression in security cohort",
        meta: "Quality room",
        detail: "Three repos lost install instructions after the latest sync and need remediation before featuring.",
        status: "Monitor",
        tone: "warning",
      },
      {
        title: "Promotion calendar entering freeze boundary",
        meta: "Promotions",
        detail: "Friday window is still open, but governance requires freeze confirmation before campaign export.",
        status: "Watch",
        tone: "system",
      },
    ],
    panels: [
      {
        kicker: "Command center",
        title: "Critical actions",
        summary: "Freeze promotion, rerun export, reopen review, and rollback release from one place with explicit operator context.",
        bullets: [
          "Show blocked actions first, not just raw navigation.",
          "Pair each action with owner, SLA, and downstream effect.",
          "Keep destructive commands visibly gated behind review status.",
        ],
      },
      {
        kicker: "Release readiness",
        title: "What is safe to publish today",
        summary: "The dashboard focuses attention on publishable work, work awaiting proof, and work that must stay staged.",
        bullets: [
          "Surface release candidates with verified artifact previews.",
          "Highlight missing reviewer approvals and stale evidence.",
          "Expose rollback windows alongside current publish state.",
        ],
      },
      {
        kicker: "Role routing",
        title: "Role-aware worklists",
        summary: "Owners see elevated approvals, operators see unblockers, reviewers see compliance queues, analysts see trend anomalies.",
        bullets: [
          "Navigation stays consistent; content priority shifts by role.",
          "Saved views pin queues by team mission.",
          "Every queue card links to the relevant operator workspace.",
        ],
      },
    ],
    table: {
      title: "Next 48-hour agenda",
      caption: "Priority board for the active publish cycle.",
      columns: ["Window", "Domain", "Owner", "Decision", "Risk"],
      rows: [
        ["Thu 18:00", "Governance", "Owner", "Approve release gate", "Critical"],
        ["Thu 21:00", "Ops", "Operator", "Rerun export verification", "Medium"],
        ["Fri 09:00", "Promotions", "Reviewer", "Clear campaign bundle notes", "Medium"],
        ["Fri 12:00", "Quality", "Analyst", "Close README regressions", "High"],
      ],
    },
  },
  catalog: {
    path: "/admin/catalog/",
    eyebrow: "Catalog management",
    badge: "Lifecycle surface",
    title: "Catalog control room",
    lede: "Manage tool readiness, marketplace positioning, featured inventory, and public diff previews before export.",
    meta: ["132 tools", "18 staged edits", "9 featured candidates", "2 unresolved diffs"],
    metrics: [
      { label: "Staged edits", value: "18", detail: "7 need reviewer eyes", tone: "warning" },
      { label: "Featured slots", value: "9", detail: "3 empty for next week", tone: "system" },
      { label: "Public proof coverage", value: "81%", detail: "Goal: 90% by next cycle", tone: "success" },
      { label: "Mismatch alerts", value: "2", detail: "Homepage and compare archive", tone: "danger" },
    ],
    actionItems: [
      {
        title: "Fill missing featured slot for builder cohort",
        meta: "Catalog planning",
        detail: "The builder collection has one empty slot after `tool-scan` was moved to compare spotlight.",
        status: "Plan",
        tone: "system",
      },
      {
        title: "Re-review `soundboard-plugin` pricing flags",
        meta: "Override change",
        detail: "Hosted pricing note diverges from latest README and needs explicit reviewer reason.",
        status: "Review",
        tone: "warning",
      },
      {
        title: "Publish metadata diff for `registry-stats`",
        meta: "Public export",
        detail: "Tags, proof links, and platform support are staged and ready if approval is granted.",
        status: "Publishable",
        tone: "success",
      },
    ],
    incidentItems: [
      {
        title: "Homepage tile using stale screenshot",
        meta: "Front door card",
        detail: "The visual artifact is one version behind the verified override record.",
        status: "Blocked",
        tone: "danger",
      },
      {
        title: "Collection taxonomy drift in security tools",
        meta: "Collections",
        detail: "Two slugs are classified as devtools internally but exported as security on the public site.",
        status: "Investigate",
        tone: "warning",
      },
    ],
    panels: [
      {
        kicker: "Workspace",
        title: "Editor with public diff awareness",
        summary: "Operators should be able to change titles, tags, featured state, and proof readiness while seeing what the public site will actually receive.",
        bullets: [
          "Keep staging status attached to every mutable field group.",
          "Group evidence, screenshot, and proof readiness near the change surface.",
          "Use bulk actions for taxonomy and featured maintenance.",
        ],
      },
      {
        kicker: "Review model",
        title: "Why a tool is safe to promote",
        summary: "Catalog workspaces need proof coverage, moderation notes, and export consequences next to the editable metadata.",
        bullets: [
          "Show reviewer rationale directly on staged cards.",
          "Flag public proof gaps before approval starts.",
          "Link moderation issues without forcing context switches.",
        ],
      },
    ],
    table: {
      title: "Featured inventory queue",
      caption: "The next candidates and blockers for highlighted placements.",
      columns: ["Slug", "Slot", "Stage", "Owner", "Reason"],
      rows: [
        ["tool-compass", "Homepage hero", "Published", "Owner", "Anchor discovery layer"],
        ["registry-stats", "Signals strip", "Ready", "Operator", "Recent traction jump"],
        ["runforge-vscode", "Desktop cohort", "In review", "Reviewer", "Needs proof refresh"],
        ["zip-meta-map", "Receipt spotlight", "Ready", "Owner", "Launch week follow-through"],
      ],
    },
  },
  submissions: {
    path: "/admin/submissions/",
    eyebrow: "Intake and review",
    badge: "Submission queue",
    title: "Submission intake workspace",
    lede: "Triaging, deduplicating, assigning, and moving tools through reviewer feedback without losing decision history.",
    meta: ["27 pending", "6 needs info", "4 escalated", "19h median SLA"],
    metrics: [
      { label: "Pending review", value: "27", detail: "9 exceed internal SLA", tone: "warning" },
      { label: "Needs info", value: "6", detail: "3 awaiting author response", tone: "system" },
      { label: "Duplicates caught", value: "11", detail: "Last 30 days", tone: "success" },
      { label: "Escalations", value: "4", detail: "Two in compliance review", tone: "danger" },
    ],
    actionItems: [
      {
        title: "Assign security reviewer for `a11y-lint`",
        meta: "High priority submission",
        detail: "The tool targets safety-sensitive code and should not advance without specialist review coverage.",
        status: "Assign",
        tone: "danger",
      },
      {
        title: "Send request-for-info batch",
        meta: "Author communication",
        detail: "Three submissions are missing install verification and public proof commitments.",
        status: "Outreach",
        tone: "warning",
      },
      {
        title: "Merge duplicate intake threads",
        meta: "Queue hygiene",
        detail: "Two `voice-soundboard` variants were submitted separately and should share review history.",
        status: "Clean up",
        tone: "system",
      },
    ],
    incidentItems: [
      {
        title: "Reviewer load imbalance in desktop cohort",
        meta: "Assignment monitor",
        detail: "One reviewer holds 41% of active submissions while others are under capacity.",
        status: "Rebalance",
        tone: "warning",
      },
      {
        title: "Missing evidence attachment on accepted item",
        meta: "Acceptance safety",
        detail: "One accepted submission still lacks the supporting proof packet required for featuring.",
        status: "Fix before publish",
        tone: "danger",
      },
    ],
    panels: [
      {
        kicker: "Queue posture",
        title: "Operators should work from status lanes, not raw JSON",
        summary: "The intake surface should let the team see pending, needs-info, accepted, rejected, and withdrawn work as a live operational board.",
        bullets: [
          "Expose reviewer ownership and author response age inline.",
          "Highlight dedupe candidates before reviewers spend time twice.",
          "Keep PR and source links at the point of decision.",
        ],
      },
      {
        kicker: "Communication",
        title: "Review notes need to be durable",
        summary: "Every reviewer note, info request, and escalation should survive handoffs and remain visible next to the submission timeline.",
        bullets: [
          "Show author-facing notes separately from internal risk notes.",
          "Preserve timestamps and actors for each change.",
          "Keep accept/reject reasoning export-ready.",
        ],
      },
    ],
    table: {
      title: "Queue by status",
      caption: "Current intake load by lane and response expectation.",
      columns: ["Status", "Count", "Oldest", "Owner", "Next step"],
      rows: [
        ["Pending", "27", "32h", "Ops team", "Assign or escalate"],
        ["Needs info", "6", "5d", "Review desk", "Collect author updates"],
        ["Accepted", "8", "18h", "Catalog team", "Prepare export"],
        ["Rejected", "4", "2d", "Review desk", "Close with rationale"],
      ],
    },
  },
  moderation: {
    path: "/admin/moderation/",
    eyebrow: "Metadata and policy",
    badge: "Override workbench",
    title: "Moderation and overrides",
    lede: "Review metadata edits, policy-sensitive claims, sanitization risk, and approval reasons before public export.",
    meta: ["22 staged overrides", "5 policy flags", "3 sanitization alerts", "1 blocked claim"],
    metrics: [
      { label: "Overrides in review", value: "22", detail: "Most recent from nightly enrichment", tone: "system" },
      { label: "Policy flags", value: "5", detail: "Claims and pricing risk", tone: "warning" },
      { label: "Blocked claims", value: "1", detail: "Missing proof link", tone: "danger" },
      { label: "Ready after review", value: "12", detail: "Can enter export preview", tone: "success" },
    ],
    actionItems: [
      {
        title: "Resolve `publicProof` mismatch on `runforge-desktop`",
        meta: "High-risk override",
        detail: "The staged claim implies proof is public, but the evidence packet is still internal-only.",
        status: "Block until fixed",
        tone: "danger",
      },
      {
        title: "Close sanitization review for compare snippets",
        meta: "Content safety",
        detail: "User-supplied excerpt trimming now passes HTML safety checks and needs reviewer sign-off.",
        status: "Approve",
        tone: "success",
      },
      {
        title: "Batch verify pricing annotations",
        meta: "Hosted marketplace",
        detail: "Hosted pricing overrides were refreshed and should be verified before the next support update.",
        status: "Verify",
        tone: "warning",
      },
    ],
    incidentItems: [
      {
        title: "Unreviewed claim edited after approval",
        meta: "Audit anomaly",
        detail: "One override changed after review and now requires re-approval before export.",
        status: "Reopen",
        tone: "danger",
      },
      {
        title: "HTML safety warning in author-provided blurb",
        meta: "Sanitization",
        detail: "A submission body contains formatting that should be reduced before rendering in public surfaces.",
        status: "Trim",
        tone: "warning",
      },
    ],
    panels: [
      {
        kicker: "Control surface",
        title: "Moderation should explain export consequences",
        summary: "Editors need to know not just what changed, but which public pages, proof packets, and promo surfaces inherit the override.",
        bullets: [
          "Attach affected surfaces to each override row.",
          "Keep reviewer reasons mandatory on risk edits.",
          "Inline sanitization state next to editable copy.",
        ],
      },
      {
        kicker: "Reason capture",
        title: "Approval notes must be first-class data",
        summary: "The workbench should preserve why a claim passed, why a flag was waived, and who carries the accountability for the decision.",
        bullets: [
          "Capture policy rationale at the point of approval.",
          "Surface stale or superseded decisions clearly.",
          "Link approvals back into governance inboxes.",
        ],
      },
    ],
    table: {
      title: "Override review board",
      caption: "What changes are staged and what blocks them.",
      columns: ["Slug", "Change set", "Risk", "Reviewer", "Export state"],
      rows: [
        ["runforge-desktop", "Proof + pricing", "High", "Owner", "Blocked"],
        ["tool-compass", "Featured copy", "Medium", "Reviewer", "Preview ready"],
        ["registry-stats", "Tag taxonomy", "Low", "Operator", "Ready"],
        ["soundboard-plugin", "Hosted note", "Medium", "Reviewer", "In review"],
      ],
    },
  },
  promotions: {
    path: "/admin/promotions/",
    eyebrow: "Campaign and queue",
    badge: "Promotion control",
    title: "Promotion planning cockpit",
    lede: "Schedule campaigns, inspect worthy candidates, preview bundles, and sequence releases without bypassing approvals.",
    meta: ["6 active campaigns", "3 queued weeks", "15 worthy candidates", "2 blocked bundles"],
    metrics: [
      { label: "Campaigns staged", value: "6", detail: "Across presskit, snippets and receipts", tone: "system" },
      { label: "Blocked bundles", value: "2", detail: "Need proof and release notes", tone: "danger" },
      { label: "Worthy candidates", value: "15", detail: "4 newly scored this week", tone: "success" },
      { label: "Calendar pressure", value: "3", detail: "Weeks with unresolved approvals", tone: "warning" },
    ],
    actionItems: [
      {
        title: "Finalize Friday bundle lineup",
        meta: "Release window",
        detail: "Three slugs are ready; one still needs updated proof text before entering the presskit batch.",
        status: "Decide",
        tone: "warning",
      },
      {
        title: "Promote `zip-meta-map` to launch receipt spotlight",
        meta: "Campaign queue",
        detail: "Signals and proof coverage are aligned; only owner approval remains.",
        status: "Ready",
        tone: "success",
      },
      {
        title: "Review ecosystem candidate `a11y-ci`",
        meta: "Worthy pipeline",
        detail: "Scoring threshold is met, but market positioning needs a clearer reason before queue insertion.",
        status: "Assess",
        tone: "system",
      },
    ],
    incidentItems: [
      {
        title: "Bundle missing partner pack screenshot",
        meta: "Artifact readiness",
        detail: "The partner pack generator has no verified visual for one slated promotion.",
        status: "Block",
        tone: "danger",
      },
      {
        title: "Calendar overlap with clearance refresh",
        meta: "Ops dependency",
        detail: "Promotion publish currently lands before the clearance refresh completes, increasing rollback risk.",
        status: "Reschedule",
        tone: "warning",
      },
    ],
    panels: [
      {
        kicker: "Campaign flow",
        title: "Operators need the publish story in one place",
        summary: "The cockpit should make it obvious which slugs are merely interesting, which are promotion-ready, and which are blocked by governance.",
        bullets: [
          "Pair worthy score with proof readiness and approval state.",
          "Keep week-level planning next to per-slug decisions.",
          "Show bundle channel coverage at a glance.",
        ],
      },
      {
        kicker: "Export safety",
        title: "Preview before every publish",
        summary: "Promotion work stays staged until preview artifacts, receipts, and governance approval all align.",
        bullets: [
          "Expose draft, preview-ready, approved, and published states clearly.",
          "Link every campaign to its upcoming release window.",
          "Carry forward bundle blockers into the command center.",
        ],
      },
    ],
    table: {
      title: "Campaign windows",
      caption: "The next scheduled promotion waves and their blockers.",
      columns: ["Week", "Theme", "Slugs", "Stage", "Blocker"],
      rows: [
        ["2026-W11", "Launch receipt", "4", "Preview ready", "Owner approval"],
        ["2026-W12", "Builder tools", "5", "Draft", "Proof refresh"],
        ["2026-W13", "Signals pack", "3", "In review", "Screenshot coverage"],
        ["2026-W14", "Security spotlight", "3", "Draft", "Worthy scoring"],
      ],
    },
  },
  quality: {
    path: "/admin/quality/",
    eyebrow: "Audit and remediation",
    badge: "Quality room",
    title: "Quality and compliance room",
    lede: "Track README health, invariant failures, broken proofs, audit findings, and remediation ownership from one operator-facing room.",
    meta: ["31 open findings", "4 critical", "8 proof issues", "98.4% invariant pass"],
    metrics: [
      { label: "Critical findings", value: "4", detail: "All tied to proof or release safety", tone: "danger" },
      { label: "README regressions", value: "8", detail: "3 new after latest sync", tone: "warning" },
      { label: "Invariant pass rate", value: "98.4%", detail: "Two flaky contracts isolated", tone: "success" },
      { label: "Data integrity drift", value: "3", detail: "Collections and overrides", tone: "system" },
    ],
    actionItems: [
      {
        title: "Repair proof chain for `ledger-suite`",
        meta: "Trust surface",
        detail: "The release note references a claim that is missing from the latest verified proof packet.",
        status: "Critical",
        tone: "danger",
      },
      {
        title: "Close README install-path regressions",
        meta: "Documentation health",
        detail: "Security cohort has missing install sections on three repositories after sync.",
        status: "Fix",
        tone: "warning",
      },
      {
        title: "Review compare archive contract drift",
        meta: "Invariant room",
        detail: "One archive page lost a marketplace context link and should be restored before the next build.",
        status: "Verify",
        tone: "system",
      },
    ],
    incidentItems: [
      {
        title: "Stale proof receipt in press archive",
        meta: "Press surface",
        detail: "The archive is serving an older receipt reference than the latest release candidate preview.",
        status: "Repair",
        tone: "danger",
      },
      {
        title: "Telemetry export doc drift",
        meta: "Operator docs",
        detail: "Instructions lag behind the current export screen by one step and should be updated.",
        status: "Align",
        tone: "warning",
      },
    ],
    panels: [
      {
        kicker: "Remediation",
        title: "Quality work should stay assignable",
        summary: "Findings become actionable only when they carry severity, owner, route impact, and release consequences.",
        bullets: [
          "Promote critical trust issues to the overview alert stack.",
          "Keep documentation health tied to ready-to-edit repos.",
          "Distinguish regression from long-tail hygiene debt.",
        ],
      },
      {
        kicker: "Audit posture",
        title: "Evidence-backed status, not guesswork",
        summary: "Operators need to see what was verified, what regressed, and what still needs human confirmation before public export.",
        bullets: [
          "Show proof chain freshness alongside release state.",
          "Expose invariant ownership, not just raw failure counts.",
          "Route broken findings into governance when they block publish.",
        ],
      },
    ],
    table: {
      title: "Open quality findings",
      caption: "What currently blocks clean release posture.",
      columns: ["Finding", "Severity", "Owner", "Surface", "State"],
      rows: [
        ["Proof mismatch on ledger-suite", "Critical", "Owner", "Trust", "Open"],
        ["README install missing", "High", "Operator", "Health", "Assigned"],
        ["Compare archive drift", "Medium", "Reviewer", "Marketplace", "Investigating"],
        ["Doc/export mismatch", "Medium", "Analyst", "Ops docs", "Queued"],
      ],
    },
  },
  ops: {
    path: "/admin/ops/",
    eyebrow: "Runs and automation",
    badge: "Operator command center",
    title: "Ops and automation center",
    lede: "Monitor pipeline runs, adapter cost, error codes, manual reruns, freeze modes, and safety caps without leaving the backoffice.",
    meta: ["42 runs", "1 failed today", "63% avg cache hit", "2 freeze controls armed"],
    metrics: [
      { label: "Latest run", value: "Failed", detail: "Export verification timed out", tone: "danger" },
      { label: "Cache hit rate", value: "63%", detail: "Down 8% from last week", tone: "warning" },
      { label: "Queued jobs", value: "7", detail: "3 export, 2 outreach, 2 nightly sync", tone: "system" },
      { label: "Safety caps", value: "2 changed", detail: "Review before publish", tone: "success" },
    ],
    actionItems: [
      {
        title: "Rerun export verification with fresh cache",
        meta: "Ops runbook",
        detail: "The last attempt failed after proof preview succeeded; only the verification stage is stale.",
        status: "Rerun",
        tone: "danger",
      },
      {
        title: "Confirm freeze boundary for Friday release",
        meta: "Safety control",
        detail: "Promotion freeze is armed but not yet acknowledged by an elevated reviewer.",
        status: "Acknowledge",
        tone: "warning",
      },
      {
        title: "Inspect adapter cost spike",
        meta: "Performance watch",
        detail: "Registry namespace calls doubled on the latest batch and should be explained before scaling the queue.",
        status: "Investigate",
        tone: "system",
      },
    ],
    incidentItems: [
      {
        title: "Verification timeout on export stage",
        meta: "Recent run",
        detail: "Run history indicates the failure is localized to a verification step after generation completed.",
        status: "Open",
        tone: "danger",
      },
      {
        title: "Safety cap drift from baseline",
        meta: "Policy control",
        detail: "The max names per run increased compared with the last accepted ops baseline.",
        status: "Review",
        tone: "warning",
      },
    ],
    panels: [
      {
        kicker: "Run history",
        title: "Ops should connect incidents to decisions",
        summary: "A failed run matters only insofar as it blocks approvals, exports, or release windows. The shell should carry that context directly.",
        bullets: [
          "Keep queue impact visible next to each incident.",
          "Link safety-cap changes to approval requirements.",
          "Surface retryable versus governance-sensitive failures separately.",
        ],
      },
      {
        kicker: "Controls",
        title: "Manual actions need provenance",
        summary: "Freeze toggles, reruns, and cap changes should appear as clearly reviewable operator actions, not hidden script knobs.",
        bullets: [
          "Show last actor and timestamp for every control.",
          "Use operator-friendly explanations for each toggle.",
          "Promote active freezes to the top alert rail.",
        ],
      },
    ],
    table: {
      title: "Recent jobs",
      caption: "The runs that matter to the current release window.",
      columns: ["Job", "Status", "Duration", "Impact", "Next action"],
      rows: [
        ["Export verification", "Failed", "03:11", "Release gate", "Rerun"],
        ["Nightly sync", "Healthy", "09:42", "Catalog freshness", "Monitor"],
        ["Promotion bundle", "Queued", "—", "Friday publish", "Await approval"],
        ["Receipt generation", "Healthy", "01:24", "Trust center", "None"],
      ],
    },
  },
  telemetry: {
    path: "/admin/telemetry/",
    eyebrow: "Signals and market intel",
    badge: "Observability layer",
    title: "Telemetry and market intelligence",
    lede: "Read anomaly scores, trend shifts, target pipelines, and market-facing signals that influence what the team should promote next.",
    meta: ["7 anomalies", "3 target cohorts", "12 trend spikes", "1 stale export"],
    metrics: [
      { label: "Anomalies", value: "7", detail: "2 above critical threshold", tone: "danger" },
      { label: "Growth spikes", value: "12", detail: "Across desktop and registry tools", tone: "success" },
      { label: "Target cohorts", value: "3", detail: "Security, desktop, builder", tone: "system" },
      { label: "Stale exports", value: "1", detail: "Need fresh telemetry snapshot", tone: "warning" },
    ],
    actionItems: [
      {
        title: "Refresh market signals before worthy scoring",
        meta: "Target pipeline",
        detail: "The desktop cohort gained traction and should influence next week’s queue, but the snapshot is aging.",
        status: "Refresh",
        tone: "warning",
      },
      {
        title: "Promote anomaly review for `registry-stats`",
        meta: "Trend watch",
        detail: "Signal acceleration looks real, but the team should validate against the partner dashboard before featuring.",
        status: "Validate",
        tone: "system",
      },
      {
        title: "Escalate proof-backed growth story",
        meta: "Market IR",
        detail: "One tool shows both verified proof and sustained adoption lift, making it a candidate for the next highlight band.",
        status: "Recommend",
        tone: "success",
      },
    ],
    incidentItems: [
      {
        title: "Stale telemetry export on ops console",
        meta: "Data freshness",
        detail: "The current exported snapshot is older than the governance decision cadence.",
        status: "Update",
        tone: "warning",
      },
      {
        title: "Outlier score without supporting proof",
        meta: "Signal hygiene",
        detail: "A trend spike exists, but no public proof packet is yet attached to the candidate narrative.",
        status: "Do not promote",
        tone: "danger",
      },
    ],
    panels: [
      {
        kicker: "Decision support",
        title: "Signals should feed operator judgment",
        summary: "Telemetry matters when it helps the team choose what to review, promote, or hold back. This screen should make that handoff explicit.",
        bullets: [
          "Tie anomaly rows to candidate tools and queue state.",
          "Show proof coverage next to trend signals.",
          "Let analysts hand recommendations directly to operators.",
        ],
      },
      {
        kicker: "Freshness",
        title: "Data age should never be implicit",
        summary: "Operators need to know whether a chart is current enough to justify a decision; stale data should read as a warning, not a footnote.",
        bullets: [
          "Put freshness indicators on every intelligence block.",
          "Mark stale target cohorts before they become promotion input.",
          "Carry signal recency into the overview alerts.",
        ],
      },
    ],
    table: {
      title: "Signal board",
      caption: "What is changing and how fast.",
      columns: ["Signal", "Tool/cohort", "Score", "Freshness", "Operator meaning"],
      rows: [
        ["Growth spike", "registry-stats", "0.92", "2h", "Feature candidate"],
        ["Anomaly", "desktop cohort", "0.88", "4h", "Validate proof first"],
        ["Target fit", "builder tools", "0.79", "6h", "Add to worthy review"],
        ["Drift", "security cohort", "0.64", "1d", "Monitor"],
      ],
    },
  },
  governance: {
    path: "/admin/governance/",
    eyebrow: "Approvals and releases",
    badge: "Governance inbox",
    title: "Governance and release gates",
    lede: "Review approval queues, export receipts, release candidates, rollback windows, and signed decisions before anything reaches the public surface.",
    meta: ["14 approvals pending", "5 release gates", "2 rollback candidates", "1 export receipt blocked"],
    metrics: [
      { label: "Approvals pending", value: "14", detail: "4 elevated", tone: "danger" },
      { label: "Release gates", value: "5", detail: "Two windows this week", tone: "system" },
      { label: "Rollback candidates", value: "2", detail: "Both still within safe window", tone: "warning" },
      { label: "Receipts verified", value: "11", detail: "Current cycle", tone: "success" },
    ],
    actionItems: [
      {
        title: "Approve Friday release candidate",
        meta: "Release gate",
        detail: "All artifacts are staged; final decision requires owner and reviewer acknowledgement.",
        status: "Critical",
        tone: "danger",
      },
      {
        title: "Compare export preview against signed decision",
        meta: "Receipt integrity",
        detail: "One queue update changed after the original approval and needs explicit confirmation.",
        status: "Reconcile",
        tone: "warning",
      },
      {
        title: "Close rollback watch after publish",
        meta: "Post-release hygiene",
        detail: "Two recent releases remain rollback-eligible and should be cleared or reverted intentionally.",
        status: "Watch",
        tone: "system",
      },
    ],
    incidentItems: [
      {
        title: "Approval drift after late-stage edit",
        meta: "Governance integrity",
        detail: "A staged promotion bundle changed after approval and must be re-signed before export.",
        status: "Reopen approval",
        tone: "danger",
      },
      {
        title: "Rollback window closing soon",
        meta: "Release watch",
        detail: "One recent publish will lose its clean rollback path within the next 6 hours.",
        status: "Decide",
        tone: "warning",
      },
    ],
    panels: [
      {
        kicker: "Inbox",
        title: "Approvals should feel operational, not ceremonial",
        summary: "Governance screens should put the riskiest, most time-sensitive decisions first and show their concrete export consequences.",
        bullets: [
          "Separate elevated approvals from routine reviewer work.",
          "Show downstream files and surfaces affected by each decision.",
          "Keep rollback options near release state, not buried in history.",
        ],
      },
      {
        kicker: "Provenance",
        title: "Every publishable state needs a receipt story",
        summary: "The governance layer should make it obvious what was approved, what was exported, what was verified, and what can still be reverted.",
        bullets: [
          "Pair approval decisions with export receipts.",
          "Display release signatures alongside preview timestamps.",
          "Make rollback eligibility a first-class badge.",
        ],
      },
    ],
    table: {
      title: "Approval inbox",
      caption: "The decisions currently holding the line.",
      columns: ["Request", "Priority", "Needed from", "Export", "State"],
      rows: [
        ["Friday release gate", "Critical", "Owner + Reviewer", "Release pack", "Pending"],
        ["zip-meta-map promo pack", "High", "Owner", "Promo queue", "Pending"],
        ["runforge proof waiver", "High", "Reviewer", "Overrides", "Needs changes"],
        ["Rollback closure", "Medium", "Owner", "Release ledger", "Watching"],
      ],
    },
  },
  settings: {
    path: "/admin/settings/",
    eyebrow: "Access and environment",
    badge: "Settings",
    title: "Settings and access control",
    lede: "Manage roles, environment flags, operator defaults, integration health, and the internal policies that shape safe actions.",
    meta: ["4 roles", "11 active users", "6 integrations", "2 env flags changed"],
    metrics: [
      { label: "Active users", value: "11", detail: "Across owner, operator, reviewer, analyst", tone: "system" },
      { label: "Role exceptions", value: "2", detail: "Temporary elevated access", tone: "warning" },
      { label: "Integration health", value: "6/6", detail: "All green", tone: "success" },
      { label: "Changed flags", value: "2", detail: "Require audit note", tone: "danger" },
    ],
    actionItems: [
      {
        title: "Review temporary elevated access",
        meta: "RBAC hygiene",
        detail: "One operator still has elevated export permissions after the last incident window.",
        status: "Tighten",
        tone: "warning",
      },
      {
        title: "Lock integration credentials audit note",
        meta: "Environment controls",
        detail: "Flag changes were recorded, but the explanatory note is still missing from the audit trail.",
        status: "Document",
        tone: "danger",
      },
      {
        title: "Refresh operator default saved views",
        meta: "Workflow ergonomics",
        detail: "The command center and queue views should open on the right role-scoped defaults by default.",
        status: "Tune",
        tone: "system",
      },
    ],
    incidentItems: [
      {
        title: "Temporary export permission still active",
        meta: "Access control",
        detail: "A short-lived exception outlasted the maintenance window and should be revoked.",
        status: "Revoke",
        tone: "danger",
      },
      {
        title: "Unannotated env flag change",
        meta: "Audit hygiene",
        detail: "One environment toggle changed without a clear justification note tied to the actor.",
        status: "Annotate",
        tone: "warning",
      },
    ],
    panels: [
      {
        kicker: "Security posture",
        title: "Internal-only does not mean casual",
        summary: "This screen should feel like the last line before a control becomes a policy, a role becomes an exception, or a flag becomes a production incident.",
        bullets: [
          "Treat role changes as operational events with notes.",
          "Surface integration health and credential rotation state.",
          "Keep environment toggles auditable and easy to diff.",
        ],
      },
      {
        kicker: "Operator ergonomics",
        title: "Defaults are part of the product",
        summary: "Saved views, default queues, and role-scoped home surfaces reduce friction and prevent misrouted work.",
        bullets: [
          "Let each role land on the highest-value queue first.",
          "Expose which defaults are shared versus personal.",
          "Keep integration status and help text nearby.",
        ],
      },
    ],
    table: {
      title: "Access matrix snapshot",
      caption: "The operational roles currently enabled.",
      columns: ["Role", "Primary focus", "Can approve", "Can publish", "Notes"],
      rows: [
        ["Owner", "Release governance", "Yes", "Yes", "Elevated actions"],
        ["Operator", "Queue + ops", "Routine only", "Staged commands", "No user admin"],
        ["Reviewer", "Compliance + moderation", "Yes", "No", "Approvals only"],
        ["Analyst", "Telemetry + quality", "No", "No", "Read-first views"],
      ],
    },
  },
};

export function getAdminPage(slug: keyof typeof adminPages) {
  return adminPages[slug];
}

function toneFromPriority(priority?: string): AdminMetric["tone"] {
  if (priority === "critical" || priority === "danger") return "danger";
  if (priority === "high" || priority === "warning") return "warning";
  if (priority === "success") return "success";
  if (priority === "system") return "system";
  return "default";
}

function formatCount(value: number | string | undefined) {
  if (typeof value === "number") return String(value);
  return value || "0";
}

function toFeedItem(
  item: Record<string, any>,
  fallbackMeta: string,
  fallbackStatus: string,
  fallbackTone: AdminMetric["tone"] = "default"
): AdminFeedItem {
  return {
    title: item.title || item.label || item.id || "Untitled item",
    meta: item.meta || item.module || item.week || fallbackMeta,
    detail: item.detail || item.summary || item.reason || item.notes || "Review this item in the linked workspace.",
    status: item.status || fallbackStatus,
    tone: toneFromPriority(item.priority || item.severity || fallbackTone),
  };
}

function toRows(items: Record<string, any>[], columns: string[]) {
  return items.map((item) =>
    columns.map((column) => {
      const key = column.toLowerCase();
      if (key.includes("status")) return item.status || item.priority || "n/a";
      if (key.includes("owner")) return item.ownerId || item.requestedBy || item.assigneeId || "unassigned";
      if (key.includes("domain")) return item.module || item.category || item.promotionType || "admin";
      if (key.includes("tool")) return item.slug || item.name || item.id || "n/a";
      if (key.includes("window")) return item.window || item.week || item.createdAt || "n/a";
      if (key.includes("decision")) return item.reason || item.title || item.summary || "n/a";
      if (key.includes("risk")) return item.priority || item.severity || "n/a";
      if (key.includes("request")) return item.title || item.id || "n/a";
      if (key.includes("needed")) return item.requiredRoles?.join(" + ") || "n/a";
      if (key.includes("export")) return item.artifactType || item.entityType || "n/a";
      if (key.includes("state")) return item.status || "n/a";
      if (key.includes("freshness")) return item.capturedAt || item.createdAt || "n/a";
      if (key.includes("operator")) return item.notes || item.summary || "n/a";
      if (key.includes("score")) return formatCount(item.anomalyScore || item.healthScore || item.score);
      if (key.includes("signal")) return item.label || item.title || item.id || "n/a";
      return item[key] || item.id || "n/a";
    })
  );
}

export async function getBoundAdminPage(slug: keyof typeof adminPages) {
  const state = await loadAdminState();
  const base = getAdminPage(slug);
  const overview = buildAdminSnapshot(state);
  const moduleData = await getModuleData(slug === "overview" ? "overview" : slug, state);
  const preview = buildPublicArtifactPreview(state);

  if (slug === "overview") {
    return {
      ...base,
      metrics: [
        { label: "Pending approvals", value: formatCount(overview.kpis.approvals.pending), detail: `${overview.kpis.approvals.critical} critical`, tone: "danger" },
        { label: "Queue health", value: `${formatCount(state.queueHealth?.throughput || 0)}`, detail: `${formatCount(state.queueHealth?.submissions || 0)} tracked items`, tone: "system" },
        { label: "Open incidents", value: formatCount(overview.kpis.operations.failedRuns), detail: `${formatCount(state.auditFindings?.length)} quality findings`, tone: "warning" },
        { label: "Upcoming releases", value: formatCount(overview.kpis.releases.ready), detail: `${formatCount(overview.kpis.releases.previewReady)} preview-ready bundles`, tone: "success" },
      ],
      actionItems: overview.queues.approvals.map((item: Record<string, any>) => toFeedItem(item, "Approvals queue", "pending", "danger")),
      incidentItems: overview.topAlerts.map((item: Record<string, any>) => toFeedItem(item, "Risk radar", item.severity || "warning", item.severity)),
      table: {
        ...base.table,
        rows: toRows(overview.promotionCalendar, base.table.columns),
      },
    };
  }

  if (slug === "catalog") {
    return {
      ...base,
      metrics: [
        { label: "Catalog tools", value: formatCount(moduleData.tools.length), detail: `${state.tools.filter((tool: Record<string, any>) => tool.featured).length} featured`, tone: "system" },
        { label: "Proof-backed", value: formatCount(state.tools.filter((tool: Record<string, any>) => tool.publicProof).length), detail: "Public proof ready", tone: "success" },
        { label: "Needs health work", value: formatCount(state.tools.filter((tool: Record<string, any>) => tool.healthSeverity === "high").length), detail: "README or proof regressions", tone: "warning" },
        { label: "Override reviews", value: formatCount(state.overrideWorkItems.length), detail: "Staged metadata updates", tone: "danger" },
      ],
      actionItems: moduleData.tools.slice(0, 4).map((tool: Record<string, any>) => toFeedItem(tool, tool.category, tool.lifecycle, tool.healthSeverity)),
      incidentItems: state.overrideWorkItems.map((item: Record<string, any>) => toFeedItem(item, "Override review", item.status, item.priority)),
      table: {
        ...base.table,
        rows: toRows(moduleData.tools.slice(0, 6), base.table.columns),
      },
    };
  }

  if (slug === "submissions") {
    return {
      ...base,
      metrics: [
        { label: "Submissions", value: formatCount(moduleData.submissions.length), detail: `${formatCount(moduleData.queueHealth?.stuckCount || 0)} stuck`, tone: "system" },
        { label: "Needs info", value: formatCount(moduleData.submissions.filter((item: Record<string, any>) => item.status === "needs-info").length), detail: "Waiting on submitters", tone: "warning" },
        { label: "In review", value: formatCount(moduleData.submissions.filter((item: Record<string, any>) => item.status === "in_review").length), detail: "Reviewer owned", tone: "danger" },
        { label: "Accepted", value: formatCount(moduleData.submissions.filter((item: Record<string, any>) => item.status === "accepted").length), detail: "Ready for export", tone: "success" },
      ],
      actionItems: moduleData.submissions.map((item: Record<string, any>) => toFeedItem(item, item.lane || "submission", item.status, item.priority)),
      incidentItems: moduleData.submissions.filter((item: Record<string, any>) => item.status === "needs-info").map((item: Record<string, any>) => toFeedItem(item, "Needs info", item.status, "warning")),
      table: {
        ...base.table,
        rows: toRows(moduleData.submissions, base.table.columns),
      },
    };
  }

  if (slug === "moderation") {
    return {
      ...base,
      metrics: [
        { label: "Override reviews", value: formatCount(moduleData.overrides.length), detail: "Metadata diffs waiting on review", tone: "danger" },
        { label: "Active reviews", value: formatCount(moduleData.reviews.length), detail: "Reviewer queue", tone: "system" },
        { label: "High-risk edits", value: formatCount(moduleData.overrides.filter((item: Record<string, any>) => item.priority === "high").length), detail: "Requires structured approval", tone: "warning" },
        { label: "Policy flags", value: formatCount(state.auditFindings.filter((item: Record<string, any>) => item.severity === "high").length), detail: "Cross-domain moderation risk", tone: "danger" },
      ],
      actionItems: moduleData.overrides.map((item: Record<string, any>) => toFeedItem(item, "Override", item.status, item.priority)),
      incidentItems: moduleData.reviews.map((item: Record<string, any>) => toFeedItem(item, "Review", item.status, item.priority)),
      table: {
        ...base.table,
        rows: toRows(moduleData.overrides, base.table.columns),
      },
    };
  }

  if (slug === "promotions") {
    return {
      ...base,
      metrics: [
        { label: "Promotion windows", value: formatCount(moduleData.promotions.length), detail: `${moduleData.campaigns.length} campaigns`, tone: "system" },
        { label: "Queued slugs", value: formatCount(moduleData.promotions[0]?.slugs?.length || 0), detail: "Current cycle", tone: "warning" },
        { label: "Worthy ready", value: formatCount(moduleData.worthy.length), detail: "Backed by rubric", tone: "success" },
        { label: "Preview artifacts", value: formatCount(preview.artifacts.length), detail: "Exportable bundle files", tone: "danger" },
      ],
      actionItems: moduleData.promotions.map((item: Record<string, any>) => toFeedItem(item, "Promotion plan", item.status, "system")),
      incidentItems: moduleData.campaigns.map((item: Record<string, any>) => toFeedItem(item, "Campaign", item.status, "warning")),
      table: {
        ...base.table,
        rows: toRows(moduleData.promotions, base.table.columns),
      },
    };
  }

  if (slug === "quality") {
    return {
      ...base,
      metrics: [
        { label: "Open findings", value: formatCount(moduleData.findings.length), detail: "README, proof, and audit issues", tone: "danger" },
        { label: "High severity", value: formatCount(moduleData.findings.filter((item: Record<string, any>) => item.severity === "high").length), detail: "Needs remediation", tone: "warning" },
        { label: "Docs coverage", value: formatCount(state.tools.filter((tool: Record<string, any>) => tool.healthScore && tool.healthScore >= 80).length), detail: "Healthy README cohort", tone: "success" },
        { label: "Proof mismatches", value: formatCount(state.auditFindings.filter((item: Record<string, any>) => item.title?.toLowerCase().includes("proof")).length), detail: "Potential publish blockers", tone: "system" },
      ],
      actionItems: moduleData.findings.slice(0, 6).map((item: Record<string, any>) => toFeedItem(item, "Quality queue", item.status, item.severity)),
      incidentItems: moduleData.findings.filter((item: Record<string, any>) => item.severity === "high").slice(0, 6).map((item: Record<string, any>) => toFeedItem(item, "High severity", item.status, "danger")),
      table: {
        ...base.table,
        rows: toRows(moduleData.findings.slice(0, 6), base.table.columns),
      },
    };
  }

  if (slug === "ops") {
    return {
      ...base,
      metrics: [
        { label: "Recent runs", value: formatCount(moduleData.runs.length), detail: `${moduleData.jobs.length} queued jobs`, tone: "system" },
        { label: "Failed runs", value: formatCount(moduleData.runs.filter((item: Record<string, any>) => item.status === "failed").length), detail: "Operator action required", tone: "danger" },
        { label: "Safety caps", value: formatCount(Object.keys(moduleData.safetyCaps || {}).length), detail: "Environment limits enforced", tone: "warning" },
        { label: "Queued exports", value: formatCount(moduleData.jobs.filter((item: Record<string, any>) => item.kind === "export").length), detail: "Awaiting workers", tone: "success" },
      ],
      actionItems: moduleData.jobs.map((item: Record<string, any>) => toFeedItem(item, item.kind || "job", item.status, "system")),
      incidentItems: moduleData.runs.filter((item: Record<string, any>) => item.status === "failed").map((item: Record<string, any>) => toFeedItem(item, "Ops incident", item.status, "danger")),
      table: {
        ...base.table,
        rows: toRows(moduleData.runs.slice(0, 6), base.table.columns),
      },
    };
  }

  if (slug === "telemetry") {
    return {
      ...base,
      metrics: [
        { label: "Telemetry snapshots", value: formatCount(moduleData.snapshots.length), detail: `${formatCount(moduleData.rollup?.totalEvents || 0)} total events`, tone: "system" },
        { label: "Investigate", value: formatCount(moduleData.snapshots.filter((item: Record<string, any>) => item.status === "investigate").length), detail: "Needs analyst review", tone: "warning" },
        { label: "Verification rate", value: `${Math.round((moduleData.rollup?.metrics?.verificationRate || 0) * 100)}%`, detail: "Latest rollup", tone: "success" },
        { label: "Suspicious days", value: formatCount(moduleData.rollup?.guardrails?.suspiciousDays?.length || 0), detail: "Guardrail watchlist", tone: "danger" },
      ],
      actionItems: moduleData.snapshots.map((item: Record<string, any>) => toFeedItem(item, "Telemetry", item.status, item.status === "investigate" ? "warning" : "success")),
      incidentItems: moduleData.snapshots.filter((item: Record<string, any>) => item.status === "investigate").map((item: Record<string, any>) => toFeedItem(item, "Anomaly", item.status, "warning")),
      table: {
        ...base.table,
        rows: toRows(moduleData.snapshots, base.table.columns),
      },
    };
  }

  if (slug === "governance") {
    return {
      ...base,
      metrics: [
        { label: "Approvals pending", value: formatCount(moduleData.approvals.filter((item: Record<string, any>) => item.status === "pending").length), detail: "Decision inbox", tone: "danger" },
        { label: "Release gates", value: formatCount(moduleData.releases.length), detail: `${moduleData.exports.length} export records`, tone: "system" },
        { label: "Preview artifacts", value: formatCount(preview.artifacts.length), detail: `${preview.receipt.status} receipt`, tone: "warning" },
        { label: "Audit trail", value: formatCount(moduleData.activity.length), detail: "Operator-visible events", tone: "success" },
      ],
      actionItems: moduleData.approvals.map((item: Record<string, any>) => toFeedItem(item, "Approval", item.status, item.priority)),
      incidentItems: moduleData.exports.map((item: Record<string, any>) => toFeedItem(item, "Export", item.status, item.status === "verified" ? "success" : "warning")),
      table: {
        ...base.table,
        rows: toRows(moduleData.approvals, base.table.columns),
      },
    };
  }

  if (slug === "settings") {
    return {
      ...base,
      metrics: [
        { label: "Active users", value: formatCount(moduleData.users.length), detail: "Internal operators only", tone: "system" },
        { label: "Role types", value: "4", detail: "Owner, Operator, Reviewer, Analyst", tone: "success" },
        { label: "Freeze flag", value: moduleData.settings.freezePromotion ? "On" : "Off", detail: "Promotion control posture", tone: moduleData.settings.freezePromotion ? "danger" : "warning" },
        { label: "Safety caps", value: formatCount(Object.keys(moduleData.settings.safetyCaps || {}).length), detail: "Mutable environment bounds", tone: "warning" },
      ],
      actionItems: moduleData.users.map((item: Record<string, any>) => toFeedItem(item, item.role, item.status || "active", "system")),
      incidentItems: [
        toFeedItem({ title: "Environment mode", meta: "Runtime", detail: moduleData.settings.environmentMode, status: "internal" }, "Settings", "internal", "warning"),
      ],
      table: {
        ...base.table,
        rows: toRows(moduleData.users, base.table.columns),
      },
    };
  }

  return base;
}
