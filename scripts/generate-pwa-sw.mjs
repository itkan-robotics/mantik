/**
 * Generate service worker after Astro static HTML + Pagefind exist in dist/.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectManifest } from 'workbox-build';
import { getInjectManifestOptions } from './pwa-workbox-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

const options = getInjectManifestOptions(distDir);
const { count, size, warnings } = await injectManifest(options);

if (warnings.length > 0) {
  console.warn('PWA workbox warnings:', warnings);
}
console.log(`PWA: wrote sw.js (${count} precache entries, ${size} bytes)`);
