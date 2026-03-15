#!/usr/bin/env node

/**
 * Generate legacy redirect HTML files in site/public/ for old flat-file URLs.
 * These handle bookmarks from when the old .github.io repo served localhost:4321.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "site", "public");

const REDIRECTS = {
  "brain-dev.html": "/tools/",
  "cid-badge.html": "/tools/",
  "cid-publish.html": "/tools/",
  "cid-registry.html": "/tools/",
  "claude-fresh.html": "/tools/",
  "comfy-headless.html": "/tools/",
  "context-bar.html": "/tools/",
  "context-window-manager.html": "/tools/",
  "file-compass.html": "/tools/",
  "registry.html": "/tools/",
  "tool-compass.html": "/tools/",
  "voice-soundboard.html": "/tools/",
};

for (const [file, target] of Object.entries(REDIRECTS)) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${target}">
<title>Moved</title>
<script>location.replace("${target}")</script>
</head>
<body>
<p>This page has moved to <a href="${target}">${target}</a>.</p>
</body>
</html>
`;
  fs.writeFileSync(path.join(PUBLIC, file), html);
  console.log(`  ${file} -> ${target}`);
}

console.log(`\nWrote ${Object.keys(REDIRECTS).length} redirect files to site/public/`);
