import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';
import { pagefindDevPlugin } from './scripts/pagefind-dev-plugin.mjs';

const SITE = 'https://mantik.netlify.app';
const analyze = process.env.ANALYZE === '1';

export default defineConfig({
  devToolbar: { enabled: false },
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  integrations: [
    mdx(),
    react(),
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
    build: {
      rollupOptions: {
        plugins: [
          analyze &&
            visualizer({
              filename: 'dist/stats.html',
              gzipSize: true,
              open: false,
            }),
        ].filter(Boolean),
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/uplot')) {
              return 'pid-uplot';
            }
            if (id.includes('node_modules/monaco-editor') || id.includes('node_modules/@monaco-editor')) {
              return 'pid-monaco';
            }
            if (
              id.includes('/lib/pid-sim/physics/elevatorSim') ||
              id.includes('/lib/pid-sim/physics/armSim') ||
              id.includes('/lib/pid-sim/physics/plant/') ||
              id.includes('/lib/pid-sim/physics/sim/')
            ) {
              return 'pid-physics';
            }
          },
        },
      },
    },
  },
});
