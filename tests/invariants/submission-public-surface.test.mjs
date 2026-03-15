import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

function readText(...segments) {
  return fs.readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

describe("Public submission surface", () => {
  it("does not render reviewer-only metadata on the public queue page", () => {
    const queuePage = readText("site", "src", "pages", "submit", "queue.astro");

    assert.ok(!/reviewNotes/.test(queuePage), "public queue must not render reviewer notes");
    assert.ok(!/lastReviewedAt/.test(queuePage), "public queue must not render reviewer timestamps");
    assert.ok(!/sourcePr/.test(queuePage), "public queue must not expose internal source PR metadata");
    assert.ok(!/reason: submission\.reason/.test(queuePage), "public queue must not render operator-only reasons");
  });

  it("limits the submission status patcher to public-safe queue fields", () => {
    const patcher = readText("scripts", "apply-submission-status.mjs");

    assert.match(patcher, /"status", "updatedAt"/, "status patcher should only accept public-safe queue fields");
    assert.ok(!/reviewNotes/.test(patcher), "status patcher must not persist reviewer notes into the public queue");
    assert.ok(!/lastReviewedAt/.test(patcher), "status patcher must not persist reviewer timestamps into the public queue");
    assert.ok(!/sourcePr/.test(patcher), "status patcher must not persist internal source PR metadata into the public queue");
  });

  it("documents the split between intake files and the public queue summary", () => {
    const submitPage = readText("site", "src", "pages", "submit", "index.astro");
    const promoTemplate = readText(".github", "PULL_REQUEST_TEMPLATE", "submit-promo.md");
    const experimentTemplate = readText(".github", "PULL_REQUEST_TEMPLATE", "submit-experiment.md");

    assert.match(submitPage, /submissions\/&lt;your-slug&gt;\.json/);
    assert.match(submitPage, /site\/src\/data\/submissions\.json/);
    assert.match(promoTemplate, /site\/src\/data\/submissions\.json/);
    assert.match(experimentTemplate, /site\/src\/data\/submissions\.json/);
  });
});
