import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';
import { pagefindDevPlugin } from './scripts/pagefind-dev-plugin.mjs';
import { netlifyFunctionsDevPlugin } from './scripts/netlify-functions-dev-plugin.mjs';
import { normalizeWindowsDevPathsPlugin } from './scripts/normalize-windows-dev-paths.mjs';
import { rehypeRunnableJava } from './scripts/rehype-runnable-java.mjs';
import { remarkJavaNorun } from './scripts/remark-java-norun.mjs';

const SITE = 'https://mantik.netlify.app';
const analyze = process.env.ANALYZE === '1';
// Astro default 4321 falls in Windows excluded range 4239–4338 (Hyper-V/WSL) → EACCES on bind.
const DEV_PORT = 5173;
const DEV_HOST = '127.0.0.1';

export default defineConfig({
  devToolbar: { enabled: false },
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  server: {
    port: DEV_PORT,
    host: DEV_HOST,
  },
  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkJavaNorun],
    rehypePlugins: [rehypeRunnableJava],
    shikiConfig: {
      theme: 'github-light',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
      transformers: [
        {
          name: 'java-fence-meta',
          pre(node) {
            const meta = this.options?.meta?.__raw ?? '';
            if (/(^|\s)norun(\s|$)/i.test(meta)) node.properties['data-java-norun'] = '';
            if (/(^|\s)racy(\s|$)/i.test(meta)) node.properties['data-java-racy'] = '';
          },
        },
      ],
    },
  },
  vite: {
    plugins: [normalizeWindowsDevPathsPlugin(), pagefindDevPlugin(), netlifyFunctionsDevPlugin()],
    server: {
      host: DEV_HOST,
      port: DEV_PORT,
      strictPort: true,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      include: [
        '@monaco-editor/react',
        'monaco-editor',
        'uplot',
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/language',
        '@codemirror/commands',
        '@codemirror/lang-java',
      ],
    },
    worker: {
      format: 'iife',
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
            if (id.includes('node_modules/@codemirror') || id.includes('node_modules/@lezer')) {
              return 'codemirror';
            }
            if (id.includes('/lib/java-playground/worker/')) {
              return;
            }
            if (id.includes('/lib/java-playground/')) {
              return 'java-playground';
            }
            if (
              id.includes('/lib/pid-sim/physics/elevatorSim') ||
              id.includes('/lib/pid-sim/physics/flywheelSim') ||
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
