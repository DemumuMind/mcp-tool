import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_PACKAGE_PATH = path.join(process.cwd(), "package.json");
const SITE_PACKAGE_PATH = path.join(process.cwd(), "site", "package.json");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

describe("package scripts", () => {
  it("root package.json exposes a dev script that proxies to the site", () => {
    const rootPackage = loadJson(ROOT_PACKAGE_PATH);

    assert.equal(typeof rootPackage.scripts?.dev, "string");
    assert.match(rootPackage.scripts.dev, /site/);
    assert.match(rootPackage.scripts.dev, /\bdev\b/);
    assert.match(rootPackage.scripts.dev, /--/);
  });

  it("site package.json still exposes astro dev", () => {
    const sitePackage = loadJson(SITE_PACKAGE_PATH);

    assert.equal(sitePackage.scripts?.dev, "astro dev");
  });
});
