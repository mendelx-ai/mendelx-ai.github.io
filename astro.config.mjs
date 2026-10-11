import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// When the custom domain is connected, change `site` to 'https://mendelx.ai'
// (and SITE_URL in src/config.ts).
export default defineConfig({
  site: 'https://mendelx-ai.github.io',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  // three.js is loaded lazily for the hero only; its chunk is expected to be large.
  vite: { build: { chunkSizeWarningLimit: 600 } },
});
