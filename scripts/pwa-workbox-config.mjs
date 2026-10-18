import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const LEARNING_SECTIONS = ['java', 'ftc', 'frc', 'comp'];

export const NAVIGATION_DENYLIST = [
  /^\/pid-simulation/,
  /^\/trenches/,
  /^\/dive/,
  /^\/resources/,
  /^\/frc\/2026-public-repositories/,
  /^\/admin/,
  /^\/\.netlify/,
  /^\/netlify/,
  /^\/_astro/,
  /^\/pagefind/,
];

export const ONLINE_ONLY_PATH_PREFIXES = [
  '/pid-simulation',
  '/trenches',
  '/resources',
  '/java-playground/',
  '/data/',
  /** Dataset embedded at build time — must not be served from mantik-frc StaleWhileRevalidate. */
  '/frc/2026-public-repositories',
];

const GLOB_PATTERNS = [
  'index.html',
  'offline/index.html',
  'offline/manifests/*.json',
  'media/**/*.{svg,png,jpg,webp}',
  'icons/**/*.png',
];

const GLOB_IGNORES = [
  '**/pagefind/**',
  '**/java-playground/**',
  '**/admin/**',
  '**/pid-simulation/**',
  '**/trenches/**',
  '**/stats.html',
];

/** Workbox injectManifest options (postbuild, after Astro + Pagefind). */
export function getInjectManifestOptions(distDir) {
  return {
    globDirectory: distDir,
    globPatterns: GLOB_PATTERNS,
    globIgnores: GLOB_IGNORES,
    swSrc: path.join(root, 'scripts/pwa-sw-src.js'),
    swDest: path.join(distDir, 'sw.js'),
  };
}
