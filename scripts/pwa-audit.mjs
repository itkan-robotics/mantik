/**
 * Post-build checks for PWA artifacts.
 * Run: node scripts/pwa-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

function fail(message) {
  console.error(`PWA audit failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fail('dist/ missing — run npm run build first');
}

const swPath = path.join(distDir, 'sw.js');
if (!fs.existsSync(swPath)) {
  fail('dist/sw.js missing');
}

const swText = fs.readFileSync(swPath, 'utf8');
if (!swText.includes('precacheAndRoute') && !swText.includes('precache')) {
  fail('dist/sw.js does not look like a Workbox service worker');
}

const manifestPath = path.join(distDir, 'manifest.webmanifest');
if (!fs.existsSync(manifestPath)) {
  fail('dist/manifest.webmanifest missing');
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch {
  fail('manifest.webmanifest is not valid JSON');
}

if (!manifest.id) fail('manifest.webmanifest missing id');
if (!manifest.icons?.some((i) => i.sizes === '192x192')) fail('manifest missing 192 icon');
if (!manifest.icons?.some((i) => i.sizes === '512x512')) fail('manifest missing 512 icon');

const offlineHtml = path.join(distDir, 'offline', 'index.html');
if (!fs.existsSync(offlineHtml)) {
  fail('dist/offline/index.html missing');
}

console.log('PWA audit passed (sw.js, manifest, offline fallback).');
