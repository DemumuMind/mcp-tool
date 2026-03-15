#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function normalizeBlock(value, fallback = "") {
  return String(value ?? fallback).replace(/\r\n/g, "\n");
}

function writeMarkdown(outputPath, sections) {
  const body = sections.join("\n") + "\n";
  writeFileSync(outputPath, body, "utf8");
}

export function resolveWorkflowPatchBody({ patchJson = "", patchJsonB64 = "" } = {}) {
  if (patchJsonB64) {
    return Buffer.from(patchJsonB64, "base64").toString("utf8");
  }
  return patchJson;
}

export function writeControlPatchPrBody({
  outputPath,
  reason,
  patchJson,
  diffSummary,
  riskNotes,
}) {
  writeMarkdown(outputPath, [
    "## Control Patch",
    "",
    `**Reason:** ${normalizeBlock(reason)}`,
    "",
    "### Patch Applied",
    "```json",
    normalizeBlock(patchJson),
    "```",
    "",
    "### Diff Summary",
    "```",
    normalizeBlock(diffSummary),
    "```",
    "",
    "### Risk Notes",
    normalizeBlock(riskNotes, "No risk notes"),
  ]);
}

export function writeSubmissionStatusPrBody({
  outputPath,
  reason,
  patchJson,
  riskNotes,
}) {
  writeMarkdown(outputPath, [
    "## Submission Status Update",
    "",
    `**Reason:** ${normalizeBlock(reason)}`,
    "",
    "### Patch Applied",
    "```json",
    normalizeBlock(patchJson),
    "```",
    "",
    "### Risk Notes",
    normalizeBlock(riskNotes, "No risk notes"),
  ]);
}

function main() {
  const mode = process.argv[2];
  const outputPath = process.argv[3];

  if (!mode || !outputPath) {
    console.error("Usage: node scripts/lib/workflow-pr-body.mjs <control-patch|submission-status> <output-path>");
    process.exit(1);
  }

  if (mode === "control-patch") {
    writeControlPatchPrBody({
      outputPath,
      reason: process.env.REASON,
      patchJson: resolveWorkflowPatchBody({
        patchJson: process.env.PATCH_JSON,
        patchJsonB64: process.env.PATCH_JSON_B64,
      }),
      diffSummary: process.env.DIFF_SUMMARY,
      riskNotes: process.env.RISK_NOTES,
    });
    return;
  }

  if (mode === "submission-status") {
    writeSubmissionStatusPrBody({
      outputPath,
      reason: process.env.REASON,
      patchJson: resolveWorkflowPatchBody({
        patchJson: process.env.PATCH_JSON,
        patchJsonB64: process.env.PATCH_JSON_B64,
      }),
      riskNotes: process.env.RISK_NOTES,
    });
    return;
  }

  console.error(`Unknown workflow PR body mode: ${mode}`);
  process.exit(1);
}

const isMain = process.argv[1] && resolve(process.argv[1]).endsWith("workflow-pr-body.mjs");
if (isMain) {
  main();
}
