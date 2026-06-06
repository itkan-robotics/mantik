import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'url';
import { pagefindDevPlugin } from './scripts/pagefind-dev-plugin.mjs';

const SITE = 'https://mantik.netlify.app';

export default defineConfig({
  devToolbar: { enabled: false },
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
  vite: {
    plugins: [pagefindDevPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    ssr: {
      noExternal: ['pagefind'],
    },
  },
});
