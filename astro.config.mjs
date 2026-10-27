import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || process.env.CF_PAGES_URL;
export default defineConfig({
  site: site || 'http://localhost:4321',
  output: 'static',
  trailingSlash: 'always',
  integrations: site ? [sitemap({ filter: (page) => !/\/(admin|404)\//.test(page) })] : [],
  markdown: { syntaxHighlight: 'shiki' },
  vite: { server: { strictPort: true } },
  devToolbar: { enabled: false },
});
