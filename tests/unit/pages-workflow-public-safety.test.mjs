import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readText(...segments) {
  return fs.readFileSync(path.join(ROOT, ...segments), "utf8");
}

describe("pages workflow public safety", () => {
  it("runs build-artifact guards before publishing gh-pages", () => {
    const workflow = readText(".github", "workflows", "pages.yml");

    assert.match(
      workflow,
      /node --test tests\/build-artifacts\/\*\.test\.mjs/,
      "pages workflow should run build-artifact tests after the site build and before publish",
    );
  });

  it("removes residual public artifacts that are not safe for gh-pages publication", () => {
    const workflow = readText(".github", "workflows", "pages.yml");

    assert.match(
      workflow,
      /rm -rf site\/dist\/client\/lab/,
      "pages workflow should remove internal lab artifacts from the published client bundle",
    );
    assert.match(
      workflow,
      /rm -f site\/dist\/client\/links\.json/,
      "pages workflow should remove the internal link registry from the published client bundle",
    );
  });
});
