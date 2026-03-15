import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  resolvePatchInput as resolveControlPatchInput,
} from "../../scripts/apply-control-patch.mjs";
import {
  resolvePatchInput as resolveSubmissionPatchInput,
} from "../../scripts/apply-submission-status.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..");
const CONTROL_WORKFLOW = resolve(ROOT, ".github", "workflows", "apply-control-patch.yml");
const SUBMISSION_WORKFLOW = resolve(ROOT, ".github", "workflows", "apply-submission-status.yml");

function extractInputBlock(source, inputName) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^\\s{6}${inputName}:\\s*$`).test(line));
  if (start === -1) return "";
  const block = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (i > start && /^\s{6}[a-z0-9_]+:\s*$/.test(line)) break;
    block.push(line);
  }
  return block.join("\n");
}

describe("workflow dispatch transport", () => {
  it("decodes base64 transport for control patch input", () => {
    const patchJson = '{"promo.json":{"enabled":false}}';
    const patchJsonB64 = Buffer.from(patchJson, "utf8").toString("base64");

    assert.equal(
      resolveControlPatchInput({ patchJson: "{}", patchJsonB64 }),
      patchJson
    );
  });

  it("decodes base64 transport for submission status input", () => {
    const patchJson = '{"slug":"demo","status":"pending"}';
    const patchJsonB64 = Buffer.from(patchJson, "utf8").toString("base64");

    assert.equal(
      resolveSubmissionPatchInput({ patchJson: "{}", patchJsonB64 }),
      patchJson
    );
  });

  it("keeps raw patch_json for manual workflow UI usage", () => {
    const patchJson = '{"promo.json":{"enabled":false}}';
    assert.equal(
      resolveControlPatchInput({ patchJson, patchJsonB64: "" }),
      patchJson
    );
  });

  it("workflows expose optional base64 inputs for CLI/API callers", () => {
    const control = readFileSync(CONTROL_WORKFLOW, "utf8");
    const submission = readFileSync(SUBMISSION_WORKFLOW, "utf8");
    const controlPatchJson = extractInputBlock(control, "patch_json");
    const submissionPatchJson = extractInputBlock(submission, "patch_json");

    assert.match(control, /patch_json_b64:/);
    assert.match(submission, /patch_json_b64:/);
    assert.match(controlPatchJson, /required:\s*false/);
    assert.match(submissionPatchJson, /required:\s*false/);
    assert.match(control, /PATCH_JSON_B64:\s*\$\{\{\s*inputs\.patch_json_b64\s*\}\}/);
    assert.match(submission, /PATCH_JSON_B64:\s*\$\{\{\s*inputs\.patch_json_b64\s*\}\}/);
  });
});
