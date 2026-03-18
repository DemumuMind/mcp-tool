#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { getRoot } from "./lib/config.mjs";
import { buildSubmissionSummary } from "./lib/submission-summary.mjs";
import { validateSubmission } from "./validate-submissions.mjs";

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function syncPublicSubmissions({
  root = getRoot(),
  submissionsDir = join(root, "submissions"),
  summaryPath = join(root, "site", "src", "data", "submissions.json"),
  now = new Date().toISOString(),
} = {}) {
  const intakeSubmissions = [];

  if (existsSync(submissionsDir)) {
    for (const file of readdirSync(submissionsDir).filter((name) => name.endsWith(".json"))) {
      const filePath = join(submissionsDir, file);
      const data = loadJson(filePath, null);
      if (!data) {
        throw new Error(`Failed to parse submission intake file: ${file}`);
      }

      const validation = validateSubmission(data);
      if (!validation.valid) {
        throw new Error(`Invalid submission intake ${file}:\n- ${validation.errors.join("\n- ")}`);
      }

      intakeSubmissions.push(data);
    }
  }

  const currentSummary = loadJson(summaryPath, { submissions: [] });
  const nextSummary = buildSubmissionSummary(intakeSubmissions, currentSummary, now);
  const nextText = JSON.stringify(nextSummary, null, 2) + "\n";
  const previousText = existsSync(summaryPath) ? readFileSync(summaryPath, "utf8") : "";

  mkdirSync(resolve(summaryPath, ".."), { recursive: true });
  if (nextText !== previousText) {
    writeFileSync(summaryPath, nextText, "utf8");
  }

  return {
    changed: nextText !== previousText,
    submissions: nextSummary.submissions.length,
    summaryPath,
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]).endsWith("sync-public-submissions.mjs");
if (isMain) {
  try {
    const result = syncPublicSubmissions();
    console.log(
      `${result.changed ? "Updated" : "Verified"} public submission summary (${result.submissions} row(s))`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
