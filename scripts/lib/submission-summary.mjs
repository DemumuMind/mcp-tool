const SAFE_TOOL_FIELDS = ["name", "slug", "repo"];
const SAFE_SUMMARY_FIELDS = [
  "slug",
  "status",
  "lane",
  "submittedAt",
  "updatedAt",
  "tool",
  "category",
  "kind",
  "pitch",
  "pr",
];

function pickString(value) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function sanitizeSummaryTool(tool = {}) {
  const sanitized = {};

  for (const field of SAFE_TOOL_FIELDS) {
    const value = pickString(tool?.[field]);
    if (value) sanitized[field] = value;
  }

  return sanitized;
}

export function sanitizeSummaryEntry(entry = {}) {
  const sanitized = {};

  for (const field of SAFE_SUMMARY_FIELDS) {
    if (field === "tool") {
      const tool = sanitizeSummaryTool(entry.tool);
      if (Object.keys(tool).length > 0) sanitized.tool = tool;
      continue;
    }

    const value = pickString(entry[field]);
    if (value) sanitized[field] = value;
  }

  return sanitized;
}

export function projectSubmissionToSummary(intake = {}, existingEntry = {}, now = new Date().toISOString()) {
  const sanitizedExisting = sanitizeSummaryEntry(existingEntry);
  const submissionMeta = intake.submission && typeof intake.submission === "object" ? intake.submission : {};
  const tool = sanitizeSummaryTool(intake.tool);

  const projected = {
    slug: intake.tool.slug,
    status: sanitizedExisting.status || "pending",
    lane: submissionMeta.lane || sanitizedExisting.lane || "promo",
    submittedAt: submissionMeta.submittedAt || sanitizedExisting.submittedAt || now,
    tool,
    category: intake.category,
    kind: intake.kind,
    pitch: intake.pitch,
  };

  if (sanitizedExisting.updatedAt) {
    projected.updatedAt = sanitizedExisting.updatedAt;
  }

  const pr = submissionMeta.pr || sanitizedExisting.pr;
  if (pr) {
    projected.pr = pr;
  }

  return projected;
}

export function buildSubmissionSummary(intakeSubmissions = [], summaryData = { submissions: [] }, now = new Date().toISOString()) {
  const existingEntries = new Map(
    Array.isArray(summaryData?.submissions)
      ? summaryData.submissions.map((entry) => [entry.slug, sanitizeSummaryEntry(entry)])
      : [],
  );

  const submissions = intakeSubmissions
    .map((intake) => projectSubmissionToSummary(intake, existingEntries.get(intake.tool.slug), now))
    .sort((left, right) => left.slug.localeCompare(right.slug));

  return { submissions };
}

export function compareSubmissionSummaryProjection(intakeSubmissions = [], summaryData = { submissions: [] }, now = "2026-01-01T00:00:00.000Z") {
  const projected = buildSubmissionSummary(intakeSubmissions, summaryData, now);
  const projectedEntries = new Map(projected.submissions.map((entry) => [entry.slug, entry]));
  const actualEntries = new Map(
    Array.isArray(summaryData?.submissions)
      ? summaryData.submissions.map((entry) => [entry.slug, sanitizeSummaryEntry(entry)])
      : [],
  );
  const errors = [];

  for (const [slug, expected] of projectedEntries) {
    const actual = actualEntries.get(slug);
    if (!actual) {
      errors.push(`summary missing projected row for "${slug}"`);
      continue;
    }
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(`projection mismatch for "${slug}"`);
    }
  }

  for (const slug of actualEntries.keys()) {
    if (!projectedEntries.has(slug)) {
      errors.push(`summary contains row without intake file: "${slug}"`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    projected,
  };
}
