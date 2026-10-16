/**
 * Build one ZIP per learning track from offline manifests (postbuild, after manifests).
 * Contents mirror dist URL paths so a local HTTP server can serve them without a service worker.
 */
import { ZipArchive } from 'archiver';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWriteStream } from 'node:fs';
import { rewriteOfflineHtml } from './offline-html-rewrite.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const MANIFEST_DIR = path.join(distDir, 'offline', 'manifests');
const OUT_DIR = path.join(distDir, 'offline', 'downloads');

const TRACK_LABELS = {
  java: 'Java',
  ftc: 'FTC',
  frc: 'FRC',
  comp: 'Competitive programming',
};

const TRACK_START_PATH = {
  java: '/java',
  ftc: '/ftc',
  frc: '/frc',
  comp: '/comp',
};

/** @param {string} url */
function urlToDistRel(url) {
  const u = url.split('?')[0];
  if (u === '/') return 'index.html';
  const stripped = u.replace(/^\//, '');
  const direct = path.join(distDir, stripped);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
    return stripped.replace(/\\/g, '/');
  }
  const indexRel = path.join(stripped, 'index.html').replace(/\\/g, '/');
  const indexAbs = path.join(distDir, indexRel);
  if (fs.existsSync(indexAbs)) return indexRel;
  throw new Error(`Offline bundle: missing file for URL ${url} (tried ${stripped}, ${indexRel})`);
}

/** @param {string} section @param {{ version: string; generatedAt: string }} manifest */
function readmeText(section, manifest) {
  const label = TRACK_LABELS[section] ?? section;
  const start = TRACK_START_PATH[section] ?? `/${section}`;
  return `Mantik offline pack — ${label}
Version: ${manifest.version}
Generated: ${manifest.generatedAt}

WHAT THIS IS
  A copy of the ${label} lessons from Mantik (mantik.netlify.app) for use without internet.
  Lesson pages, images, and scripts are included. Search, Java Run, and PID Simulation are not.

STYLING: lesson pages need the "_astro" folder next to the track folder. Always run the server
  from the unzipped folder that contains BOTH "_astro" and "${section}" (same level as this README).

CLASSROOM SETUP (works on school Chromebooks — no extensions required)
  1. On a mentor or teacher laptop (Windows, Mac, or Linux), unzip this folder.
  2. Open a terminal in the unzipped folder (you should see "_astro" and the track folder here).
  3. Start a server (pick one):

     Python 3 (often preinstalled):
       python -m http.server 8080 --bind 0.0.0.0

     Or Node.js:
       npx --yes serve -l 8080

  4. Find the laptop's Wi‑Fi IP address (e.g. 192.168.1.42).
  5. On student Chromebooks (same Wi‑Fi or classroom hotspot), open Chrome and go to:
       http://YOUR_IP:8080${start}
     Example: http://192.168.1.42:8080${start}
  6. Use the lesson sidebar and prev/next. Search will not work offline.

AT HOME (one person)
  Unzip, run the server commands above, then open:
    http://localhost:8080${start}

TRANSFERRING THIS PACK
  Copy the ZIP via USB drive, Google Drive, or school file share. Unzip on the machine that runs the server.

ALTERNATIVE: IN-BROWSER DOWNLOAD
  While online at mantik.netlify.app, open Aa → Offline lessons → Download.
  That uses Chrome's cache and works without a ZIP when your school allows it.

LIMITATIONS
  - In-browser Java Run needs internet.
  - PID Simulation and Resources are not in this pack.

More: https://github.com/itkan-robotics/mantik#offline-learning
`;
}

/**
 * @param {string} section
 * @param {{ readme: string; pages: { distRel: string; html: string }[]; assetRels: string[] }} bundle
 */
function zipTrack(section, bundle) {
  const zipName = `mantik-${section}.zip`;
  const zipPath = path.join(OUT_DIR, zipName);
  const rootPrefix = `mantik-offline-${section}`;
  const start = TRACK_START_PATH[section] ?? `/${section}`;
  const startRel = start.replace(/^\//, '') + '/index.html';
  const launcherHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=${startRel}" />
  <title>Mantik offline — open lessons</title>
</head>
<body>
  <p><a href="${startRel}">Open ${TRACK_LABELS[section] ?? section} lessons</a></p>
  <p>Run a local web server from this folder (see README-OFFLINE.txt), then use the link above.</p>
</body>
</html>
`;

  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => resolve({ zipPath, zipName, bytes: archive.pointer() }));
    archive.on('error', reject);
    output.on('error', reject);

    archive.pipe(output);
    archive.append(bundle.readme, { name: `${rootPrefix}/README-OFFLINE.txt` });
    archive.append(launcherHtml, { name: `${rootPrefix}/OPEN-LESSONS.html` });

    for (const { distRel, html } of bundle.pages) {
      archive.append(html, { name: `${rootPrefix}/${distRel}` });
    }

    for (const rel of bundle.assetRels) {
      const abs = path.join(distDir, rel);
      archive.file(abs, { name: `${rootPrefix}/${rel}` });
    }

    archive.finalize();
  });
}

async function main() {
  if (!fs.existsSync(MANIFEST_DIR)) {
    console.error('offline manifests missing — run generate-offline-module-manifests.mjs first');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const file of fs.readdirSync(MANIFEST_DIR)) {
    if (!file.endsWith('.json')) continue;
    const section = file.replace(/\.json$/, '');
    const manifestPath = path.join(MANIFEST_DIR, file);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const readme = readmeText(section, manifest);

    const pages = manifest.pages.map((pageUrl) => {
      const distRel = urlToDistRel(pageUrl);
      const raw = fs.readFileSync(path.join(distDir, distRel), 'utf8');
      return { distRel, html: rewriteOfflineHtml(raw, pageUrl) };
    });

    const pageRelSet = new Set(pages.map((p) => p.distRel));
    const assetRels = [...new Set(manifest.assets.map((url) => urlToDistRel(url)))].filter(
      (rel) => !pageRelSet.has(rel),
    );

    const { zipPath, zipName, bytes } = await zipTrack(section, {
      readme,
      pages,
      assetRels,
    });

    manifest.bundleZip = `/offline/downloads/${zipName}`;
    manifest.bundleSizeBytes = bytes;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const mb = (bytes / (1024 * 1024)).toFixed(1);
    console.log(
      `offline zip ${section}: ${pages.length} pages + ${assetRels.length} assets → ${path.relative(root, zipPath)} (${mb} MB)`,
    );
  }
}

await main();
