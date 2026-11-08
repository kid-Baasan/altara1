// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // TODO: replace with the real production URL (used for canonical URLs and the sitemap).
  site: 'https://altara.travel',

  // Server output: pages render on demand by default. Static pages opt in with `export const prerender = true;`.
  output: 'server',
  // Photos are plain files in /public (Altara's original assets), so no image binding is needed.
  adapter: cloudflare({ imageService: 'passthrough' }),

  integrations: [
    // Keep private/admin routes out of the sitemap.
    sitemap({ filter: (page) => !page.includes('/admin') }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
