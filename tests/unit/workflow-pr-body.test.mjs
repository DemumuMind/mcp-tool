import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..", "..");
const MODULE_PATH = resolve(ROOT, "scripts", "lib", "workflow-pr-body.mjs");
const CONTROL_WORKFLOW = resolve(ROOT, ".github", "workflows", "apply-control-patch.yml");
const SUBMISSION_WORKFLOW = resolve(ROOT, ".github", "workflows", "apply-submission-status.yml");

describe("workflow PR body helper", () => {
  it("uses a dedicated helper module for PR body generation", async () => {
    assert.equal(
      existsSync(MODULE_PATH),
      true,
      "expected scripts/lib/workflow-pr-body.mjs to exist"
    );

    const workflowBody = await import(pathToFileURL(MODULE_PATH).href);
    assert.equal(typeof workflowBody.writeControlPatchPrBody, "function");
    assert.equal(typeof workflowBody.writeSubmissionStatusPrBody, "function");
  });

  it("writes literal untrusted values into markdown without shell templating", async () => {
    const workflowBody = await import(pathToFileURL(MODULE_PATH).href);
    const dir = mkdtempSync(join(tmpdir(), "workflow-pr-body-"));

    try {
      const controlPath = join(dir, "control.md");
      workflowBody.writeControlPatchPrBody({
        outputPath: controlPath,
        reason: 'risk $(touch pwned)',
        patchJson: '{"slug":"alpha; echo owned"}',
        diffSummary: '1 file changed',
        riskNotes: 'literal ${HOME}',
      });

      const written = readFileSync(controlPath, "utf8");
      assert.ok(written.includes('risk $(touch pwned)'));
      assert.ok(written.includes('{"slug":"alpha; echo owned"}'));
      assert.ok(written.includes('literal ${HOME}'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("workflows use the Node helper instead of heredoc PR body assembly", () => {
    const control = readFileSync(CONTROL_WORKFLOW, "utf8");
    const submission = readFileSync(SUBMISSION_WORKFLOW, "utf8");

    assert.match(control, /node scripts\/lib\/workflow-pr-body\.mjs control-patch/);
    assert.match(submission, /node scripts\/lib\/workflow-pr-body\.mjs submission-status/);
    assert.ok(!control.includes("cat > /tmp/pr-body.md <<EOF"));
    assert.ok(!submission.includes("cat > /tmp/pr-body.md <<EOF"));
  });
});
