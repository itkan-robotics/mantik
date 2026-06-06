import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagefindDist = path.join(root, 'dist', 'pagefind');
const pagefindModules = path.join(root, 'node_modules', 'pagefind');

const MIME_TYPES = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.pfindex': 'application/octet-stream',
  '.pagefind': 'application/octet-stream',
  '.wasm': 'application/wasm',
};

function resolvePagefindFile(urlPath) {
  const rel = urlPath.replace(/^\/pagefind\//, '').split('?')[0];
  if (!rel || rel.includes('..')) return null;

  const distFile = path.join(pagefindDist, rel);
  if (fs.existsSync(distFile) && fs.statSync(distFile).isFile()) return distFile;

  const moduleFile = path.join(pagefindModules, rel);
  if (fs.existsSync(moduleFile) && fs.statSync(moduleFile).isFile()) return moduleFile;

  return null;
}

/** Serve Pagefind assets from dist/pagefind (or node_modules fallback) during astro dev. */
export function pagefindDevPlugin() {
  return {
    name: 'pagefind-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/pagefind/')) return next();

        const filePath = resolvePagefindFile(req.url);
        if (!filePath) {
          res.statusCode = 404;
          res.end('Pagefind asset not found');
          return;
        }

        const ext = path.extname(filePath);
        res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}
