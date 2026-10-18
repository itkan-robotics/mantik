/** Shared PWA routing config (service worker + build scripts). */

export const LEARNING_SECTIONS = ['java', 'ftc', 'frc', 'comp'] as const;

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
  '/frc/2026-public-repositories',
];

export const PWA_GLOB_PATTERNS = [
  'index.html',
  'offline/index.html',
  'offline/manifests/*.json',
  'media/**/*.{svg,png,jpg,webp}',
  'icons/**/*.png',
];

export const PWA_GLOB_IGNORES = [
  '**/pagefind/**',
  '**/java-playground/**',
  '**/admin/**',
  '**/pid-simulation/**',
  '**/trenches/**',
  '**/stats.html',
];
