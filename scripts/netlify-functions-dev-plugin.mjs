import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUBMIT_PATH = '/.netlify/functions/submit-resource';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function normalizeHeaders(req) {
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers[key] = Array.isArray(value) ? value[0] : value;
  }
  return headers;
}

/** Run Netlify function handlers during `astro dev` without `netlify dev`. */
export function netlifyFunctionsDevPlugin() {
  return {
    name: 'netlify-functions-dev',
    configureServer(server) {
      const env = loadEnv('development', root, '');
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }

      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (pathname !== SUBMIT_PATH) return next();

        try {
          const mod = await server.ssrLoadModule('/netlify/functions/submit-resource.ts');
          const body =
            req.method === 'POST' || req.method === 'OPTIONS' ? await readBody(req) : '';

          const result = await mod.handler(
            {
              httpMethod: req.method ?? 'GET',
              body,
              headers: normalizeHeaders(req),
              path: pathname,
            },
            {},
          );

          if (result.headers) {
            for (const [key, value] of Object.entries(result.headers)) {
              if (value) res.setHeader(key, value);
            }
          }
          res.statusCode = result.statusCode ?? 500;
          res.end(result.body ?? '');
        } catch (err) {
          console.error('[netlify-functions-dev]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Dev function error.' }));
        }
      });
    },
  };
}
