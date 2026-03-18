const STATUS_BUCKETS = {
  pending: "pending",
  "needs-info": "needsInfo",
  accepted: "accepted",
  rejected: "rejected",
  withdrawn: "withdrawn",
};

function sanitizeTool(tool) {
  if (!tool || typeof tool !== "object") {
    return null;
  }

  const sanitized = {};
  if (typeof tool.name === "string" && tool.name) sanitized.name = tool.name;
  if (typeof tool.slug === "string" && tool.slug) sanitized.slug = tool.slug;
  if (typeof tool.repo === "string" && tool.repo) sanitized.repo = tool.repo;
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export function sanitizePublicSubmission(submission = {}) {
  const sanitized = {};

  if (typeof submission.slug === "string" && submission.slug) sanitized.slug = submission.slug;
  if (typeof submission.status === "string" && submission.status) sanitized.status = submission.status;
  if (typeof submission.lane === "string" && submission.lane) sanitized.lane = submission.lane;
  if (typeof submission.submittedAt === "string" && submission.submittedAt) sanitized.submittedAt = submission.submittedAt;
  if (typeof submission.updatedAt === "string" && submission.updatedAt) sanitized.updatedAt = submission.updatedAt;
  if (typeof submission.category === "string" && submission.category) sanitized.category = submission.category;
  if (typeof submission.kind === "string" && submission.kind) sanitized.kind = submission.kind;
  if (typeof submission.pitch === "string" && submission.pitch) sanitized.pitch = submission.pitch;
  if (typeof submission.pr === "string" && submission.pr) sanitized.pr = submission.pr;

  const tool = sanitizeTool(submission.tool);
  if (tool) sanitized.tool = tool;

  return sanitized;
}

export function partitionPublicQueue(submissions = []) {
  const grouped = {
    pending: [],
    needsInfo: [],
    accepted: [],
    rejected: [],
    withdrawn: [],
  };

  for (const entry of submissions) {
    const sanitized = sanitizePublicSubmission(entry);
    const bucket = STATUS_BUCKETS[sanitized.status];
    if (!bucket) continue;
    grouped[bucket].push(sanitized);
  }

  return grouped;
}
