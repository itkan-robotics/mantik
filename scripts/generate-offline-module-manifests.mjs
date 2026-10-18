/**
 * Build per-track offline manifests from dist HTML (postbuild, after Pagefind).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const SECTIONS = ['java', 'ftc', 'frc', 'comp'];
const ASSET_PREFIXES = ['/_astro/', '/media/', '/icons/'];
const OUT_DIR = path.join(distDir, 'offline', 'manifests');

/** @param {string} html */
function extractSameOriginPaths(html) {
  const found = new Set();
  const re = /\b(?:href|src|component-url|renderer-url)=["'](\/[^"'#?]+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const p = m[1];
    if (p.startsWith('//')) continue;
    if (
      ASSET_PREFIXES.some((prefix) => p.startsWith(prefix)) ||
      p.startsWith('/_astro/') ||
      p.endsWith('.css') ||
      p.endsWith('.js')
    ) {
      found.add(p.split('?')[0]);
    }
  }
  return found;
}

/** @param {string} filePath */
function htmlFileToUrl(filePath) {
  const rel = path.relative(distDir, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  const withoutIndex = rel.replace(/\/index\.html$/, '');
  return `/${withoutIndex}`;
}

/** @param {string} dir */
function walkHtmlFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtmlFiles(full));
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

function readShellAssets() {
  const shell = new Set(['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']);
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    for (const p of extractSameOriginPaths(fs.readFileSync(indexPath, 'utf8'))) {
      if (!p.startsWith('/pagefind/')) shell.add(p);
    }
  }
  const offlinePath = path.join(distDir, 'offline', 'index.html');
  if (fs.existsSync(offlinePath)) {
    for (const p of extractSameOriginPaths(fs.readFileSync(offlinePath, 'utf8'))) {
      if (!p.startsWith('/pagefind/')) shell.add(p);
    }
  }
  return [...shell].sort();
}

function buildVersion(section, pages) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  let git = '';
  try {
    git = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    git = 'unknown';
  }
  const hash = crypto
    .createHash('sha256')
    .update([pkg.version, section, ...pages].join('\n'))
    .digest('hex')
    .slice(0, 12);
  return `${pkg.version}+${git}-${hash}`;
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error('dist/ missing — run astro build first');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const shellAssets = readShellAssets();

  for (const section of SECTIONS) {
    const sectionDir = path.join(distDir, section);
    const htmlFiles = walkHtmlFiles(sectionDir);
    const pages = htmlFiles.map(htmlFileToUrl).sort();
    const assets = new Set(shellAssets);

    for (const file of htmlFiles) {
      const html = fs.readFileSync(file, 'utf8');
      for (const p of extractSameOriginPaths(html)) {
        if (p.startsWith('/pagefind/')) continue;
        assets.add(p);
      }
    }

    const manifest = {
      section,
      version: buildVersion(section, pages),
      generatedAt: new Date().toISOString(),
      pages,
      assets: [...assets].sort(),
    };

    const outPath = path.join(OUT_DIR, `${section}.json`);
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
    console.log(
      `offline manifest ${section}: ${pages.length} pages, ${manifest.assets.length} assets → ${path.relative(root, outPath)}`,
    );
  }
}

main();
