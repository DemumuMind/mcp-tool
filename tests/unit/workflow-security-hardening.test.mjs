import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const WORKFLOWS_DIR = join(ROOT, ".github", "workflows");

function readWorkflow(name) {
  return readFileSync(join(WORKFLOWS_DIR, name), "utf8");
}

function extractRunBlocks(source) {
  const lines = source.split(/\r?\n/);
  const blocks = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = /^(\s*)run:\s*(\|)?\s*(.*)$/.exec(line);
    if (!match) continue;

    const runIndent = match[1].length;
    const inlineCommand = match[3];
    if (!match[2]) {
      blocks.push(inlineCommand);
      continue;
    }
    const block = [];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (!next.trim()) {
        block.push(next);
        continue;
      }
      const nextIndent = next.match(/^(\s*)/)[1].length;
      if (nextIndent <= runIndent) {
        i = j - 1;
        break;
      }
      block.push(next);
      if (j === lines.length - 1) i = j;
    }
    blocks.push(block.join("\n"));
  }

  return blocks;
}

describe("workflow hardening", () => {
  it("pins every remote GitHub Action to a full commit SHA", () => {
    const violations = [];

    for (const file of readdirSync(WORKFLOWS_DIR).filter((name) => name.endsWith(".yml"))) {
      const source = readWorkflow(file);
      const lines = source.split(/\r?\n/);
      for (const line of lines) {
        const match = /^\s*(?:-\s*)?uses:\s*([^@\s]+)@([^\s#]+)/.exec(line);
        if (!match) continue;
        const [, action, ref] = match;
        if (action.startsWith("./")) continue;
        if (/^[0-9a-f]{40}$/i.test(ref)) continue;
        violations.push(`${file}: ${action}@${ref}`);
      }
    }

    assert.deepEqual(
      violations,
      [],
      `expected all workflows to pin actions by SHA, found:\n${violations.join("\n")}`
    );
  });

  it("does not interpolate workflow inputs directly inside shell run blocks", () => {
    const offenders = [];

    for (const file of readdirSync(WORKFLOWS_DIR).filter((name) => name.endsWith(".yml"))) {
      const source = readWorkflow(file);
      const runBlocks = extractRunBlocks(source);
      for (const block of runBlocks) {
        if (/\$\{\{\s*(inputs|github\.event\.inputs)\./.test(block)) {
          offenders.push(file);
          break;
        }
      }
    }

    assert.deepEqual(
      offenders,
      [],
      `expected workflow inputs to flow through env vars, found direct interpolation in:\n${offenders.join("\n")}`
    );
  });

  it("routes patch and reason inputs through env vars in write-capable workflows", () => {
    const control = readWorkflow("apply-control-patch.yml");
    const submission = readWorkflow("apply-submission-status.yml");

    for (const [name, source, scriptName] of [
      ["apply-control-patch.yml", control, "apply-control-patch.mjs"],
      ["apply-submission-status.yml", submission, "apply-submission-status.mjs"],
    ]) {
      assert.match(source, /PATCH_JSON:\s*\$\{\{\s*inputs\.patch_json\s*\}\}/, `${name}: missing PATCH_JSON env binding`);
      assert.match(source, /REASON:\s*\$\{\{\s*inputs\.reason\s*\}\}/, `${name}: missing REASON env binding`);
      assert.match(
        source,
        new RegExp(`node scripts/${scriptName.replace(".", "\\.")} "\\$PATCH_JSON"`),
        `${name}: expected quoted env var when invoking ${scriptName}`
      );
    }
  });

  it("generates links before fetching distribution signals in the targets workflow", () => {
    const targets = readWorkflow("targets-weekly.yml");
    const genLinksIdx = targets.indexOf("run: node scripts/gen-links.mjs");
    const fetchSignalsIdx = targets.indexOf("run: node scripts/fetch-distribution-signals.mjs");

    assert.notEqual(genLinksIdx, -1, "targets-weekly.yml: missing gen-links step");
    assert.notEqual(fetchSignalsIdx, -1, "targets-weekly.yml: missing fetch-distribution-signals step");
    assert.ok(
      genLinksIdx < fetchSignalsIdx,
      "targets-weekly.yml: gen-links must run before fetch-distribution-signals"
    );
  });

  it("treats distribution signal fetch as a required step in the targets workflow", () => {
    const targets = readWorkflow("targets-weekly.yml");
    const signalSection = /- name: Fetch distribution signals[\s\S]*?(?=\n\s*- name:|\n\s*$)/.exec(targets);

    assert.ok(signalSection, "targets-weekly.yml: missing Fetch distribution signals section");
    assert.ok(
      !/continue-on-error:\s*true/.test(signalSection[0]),
      "targets-weekly.yml: distribution signal fetch must not silently continue on error"
    );
  });

  it("includes generator code identity in the nameops generator cache key", () => {
    const nameops = readWorkflow("nameops-scheduled.yml");

    assert.match(
      nameops,
      /generator_fingerprint/,
      "nameops-scheduled.yml: missing generator fingerprint step"
    );
    assert.match(
      nameops,
      /key:\s*gen-outputs-\$\{\{\s*steps\.input_hash\.outputs\.hash\s*\}\}-\$\{\{\s*steps\.generator_fingerprint\.outputs\.hash\s*\}\}/,
      "nameops-scheduled.yml: generator cache key must include the generator fingerprint"
    );
  });

  it("treats MarketIR fetch as best-effort in the Pages workflow", () => {
    const pages = readWorkflow("pages.yml");
    const marketirSection = /- name: Fetch MarketIR snapshot[\s\S]*?(?=\n\s*- name:|\n\s*$)/.exec(pages);

    assert.ok(marketirSection, "pages.yml: missing Fetch MarketIR snapshot section");
    assert.match(
      marketirSection[0],
      /MarketIR snapshot unavailable; continuing with fallback data\./,
      "pages.yml: MarketIR fetch should not block a Pages deploy when upstream is unavailable"
    );
  });
});
