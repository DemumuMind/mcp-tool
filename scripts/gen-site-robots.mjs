#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSiteUrl } from "./lib/config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ROBOTS_PATH = path.join(ROOT, "site", "public", "robots.txt");

const content = [
  "User-agent: *",
  "Allow: /",
  "",
  `Sitemap: ${resolveSiteUrl("/sitemap-index.xml")}`,
  "",
].join("\n");

fs.writeFileSync(ROBOTS_PATH, content, "utf8");
console.log(`Wrote robots.txt -> ${resolveSiteUrl("/sitemap-index.xml")}`);
