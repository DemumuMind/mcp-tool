import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readText(...segments) {
  return fs.readFileSync(path.join(ROOT, ...segments), "utf8");
}

describe("public site URL contract", () => {
  it("does not keep a localhost CNAME", () => {
    assert.equal(
      fs.existsSync(path.join(ROOT, "site", "public", "CNAME")),
      false,
      "site/public/CNAME should be absent until a real custom domain exists"
    );
  });

  it("passes deployed page_url into smoke checks", () => {
    const workflow = readText(".github", "workflows", "pages.yml");

    assert.match(
      workflow,
      /outputs:\s*\n\s*page_url:\s*\$\{\{\s*steps\.deployment\.outputs\.page_url\s*\}\}/,
      "deploy job should expose page_url"
    );
    assert.match(
      workflow,
      /node scripts\/smoke-test\.mjs "\$\{\{\s*needs\.deploy\.outputs\.page_url\s*\}\}"/,
      "smoke job should use the deployed page_url"
    );
    assert.match(
      workflow,
      /run:\s*node scripts\/deploy-pages-api\.mjs/,
      "deploy job should use the repo-owned Pages API deploy script"
    );
    assert.ok(
      !workflow.includes("actions/deploy-pages@"),
      "pages workflow should not depend on actions/deploy-pages"
    );
    assert.ok(
      !workflow.includes("actions/upload-pages-artifact@"),
      "pages workflow should not depend on actions/upload-pages-artifact"
    );
  });

  it("runs quality checks for root config and workflow changes that affect public URLs", () => {
    const workflow = readText(".github", "workflows", "site-quality.yml");

    assert.match(workflow, /-\s*'kit\.config\.json'/, "kit.config.json must trigger quality checks");
    assert.match(workflow, /-\s*'\.github\/workflows\/\*\*'/, "workflow changes must trigger quality checks");
  });

  it("does not hardcode localhost in production URL surfaces", () => {
    const files = [
      ["site", "astro.config.mjs"],
      ["site", "src", "layouts", "Base.astro"],
      ["site", "public", "robots.txt"],
      ["scripts", "smoke-test.mjs"],
      ["scripts", "fetch-distribution-signals.mjs"],
      ["scripts", "gen-links.mjs"],
      ["scripts", "gen-presskit.mjs"],
      ["scripts", "gen-outreach-packs.mjs"],
      ["scripts", "gen-outreach-run.mjs"],
      ["scripts", "gen-campaign-bundles.mjs"],
      ["scripts", "gen-snippets.mjs"],
      ["scripts", "gen-targets.mjs"],
      ["scripts", "gen-promo.mjs"],
    ];

    for (const segments of files) {
      const source = readText(...segments);
      assert.ok(
        !source.includes("localhost:4321"),
        `${segments.join("/")} should not hardcode localhost`
      );
    }
  });

  it("generates links before fetching distribution signals", () => {
    const workflow = readText(".github", "workflows", "targets-weekly.yml");
    const genLinksIdx = workflow.indexOf("Generate link registry");
    const signalsIdx = workflow.indexOf("Fetch distribution signals");

    assert.ok(genLinksIdx !== -1, "targets workflow should generate links");
    assert.ok(signalsIdx !== -1, "targets workflow should fetch signals");
    assert.ok(genLinksIdx < signalsIdx, "links must be generated before signal fetch");

    const fetchSignalsBlock = workflow.slice(
      signalsIdx,
      workflow.indexOf("- name: Generate target lists", signalsIdx)
    );
    assert.ok(
      !fetchSignalsBlock.includes("continue-on-error: true"),
      "signal fetch should fail loudly when its input is missing"
    );
  });

  it("includes code identity in the nameops generator cache key", () => {
    const workflow = readText(".github", "workflows", "nameops-scheduled.yml");

    assert.match(
      workflow,
      /generator_fingerprint/,
      "nameops workflow should compute a generator fingerprint"
    );
    assert.match(
      workflow,
      /key:\s*gen-outputs-\$\{\{\s*steps\.input_hash\.outputs\.hash\s*\}\}-\$\{\{\s*steps\.generator_fingerprint\.outputs\.hash\s*\}\}/,
      "generator cache key should include the generator fingerprint output"
    );
  });

  it("makes the site-quality internal link checker base-path aware", () => {
    const workflow = readText(".github", "workflows", "site-quality.yml");

    assert.match(
      workflow,
      /const kitConfig = JSON\.parse\(fs\.readFileSync\('kit\.config\.json', 'utf8'\)\);/,
      "site-quality internal link check should read kit.config.json"
    );
    assert.match(
      workflow,
      /const siteBase = kitConfig\.site\?\.url \? new URL\(kitConfig\.site\.url\)\.pathname\.replace\(\/\\\/\$\/, ''\) : '';/,
      "site-quality internal link check should derive a base path from the configured site URL"
    );
    assert.match(
      workflow,
      /if \(siteBase && target\.startsWith\(siteBase \+ '\/'\)\) target = target\.slice\(siteBase\.length\);/,
      "site-quality internal link check should strip the configured base path before looking in dist/"
    );
  });
});
