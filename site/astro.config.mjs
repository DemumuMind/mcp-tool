// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// Load site URL from kit config
const DEFAULT_SITE_URL = 'https://example.invalid/';
let kitSiteUrl = process.env.PUBLIC_SITE_URL || DEFAULT_SITE_URL;
try {
  const kitConfig = JSON.parse(readFileSync('../kit.config.json', 'utf8'));
  if (!process.env.PUBLIC_SITE_URL && kitConfig.site?.url) kitSiteUrl = kitConfig.site.url;
} catch { /* fail soft — use default */ }

const basePath = (() => {
  const pathname = new URL(kitSiteUrl).pathname.replace(/\/$/, '');
  return pathname && pathname !== '' ? pathname : undefined;
})();

// https://astro.build/config
export default defineConfig({
  site: kitSiteUrl,
  base: basePath,
  output: 'server',
  session: {
    driver: 'memory',
  },
  adapter: node({
    mode: 'standalone',
  }),
  trailingSlash: 'always',
  integrations: [sitemap({
    filter: (page) => !page.includes('/lab/'),
  })],
});
