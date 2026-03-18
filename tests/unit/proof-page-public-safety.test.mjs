import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROOF_PAGE_PATH = path.join(ROOT, "site", "src", "pages", "proof", "[slug].astro");

describe("proof page public safety", () => {
  it("does not read internal tracking or clearance inputs into the public proof page", () => {
    const source = fs.readFileSync(PROOF_PAGE_PATH, "utf8");

    assert.doesNotMatch(source, /src\/data\/links\.json/, "proof page must not read internal links registry");
    assert.doesNotMatch(source, /site\/public\/lab\/clearance/, "proof page must not read public lab clearance artifacts");
  });

  it("does not render tracking or operational sections on the public proof page", () => {
    const source = fs.readFileSync(PROOF_PAGE_PATH, "utf8");

    assert.doesNotMatch(source, /Tracked outbound links/, "proof page must not render tracked outbound links");
    assert.doesNotMatch(source, /Clearance status/, "proof page must not render clearance status");
    assert.doesNotMatch(source, /Operational reference/, "proof page must not render operational reference copy");
  });
});
