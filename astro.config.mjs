import { defineConfig } from 'astro/config';

// Static one-page site. When linked to Wix (`npm create @wix/new@latest -- headless link`),
// the Wix CLI adds its own integration here; keep this file otherwise minimal.
export default defineConfig({
  site: 'https://www.catchagroup.com',
});
