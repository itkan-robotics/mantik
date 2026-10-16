import { saveModuleStatus } from './moduleStatus';
import type { ModuleDownloadProgress, ModuleId, ModuleManifest } from './types';
import { SHELL_CACHE_NAME, sectionCacheName } from './types';

const BATCH_SIZE = 6;

export async function fetchModuleManifest(section: ModuleId): Promise<ModuleManifest> {
  const res = await fetch(`/offline/manifests/${section}.json`, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Could not load offline manifest for ${section} (${res.status})`);
  }
  return res.json() as Promise<ModuleManifest>;
}

async function cacheUrl(cache: Cache, url: string): Promise<void> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`${url} → ${response.status}`);
  }
  const body = await response.blob();
  const headers = new Headers(response.headers);
  const keys = new Set<string>([url, response.url]);
  if (url.endsWith('/')) keys.add(url.slice(0, -1) || '/');
  else keys.add(`${url}/`);
  await Promise.all(
    [...keys].map((key) => cache.put(key, new Response(body, { status: response.status, headers }))),
  );
}

async function runBatched(
  urls: string[],
  worker: (url: string) => Promise<void>,
  onProgress: (done: number, failed: string[]) => void,
): Promise<string[]> {
  const failed: string[] = [];
  let done = 0;

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (url) => {
        try {
          await worker(url);
        } catch {
          failed.push(url);
        } finally {
          done += 1;
          onProgress(done, [...failed]);
        }
      }),
    );
  }

  return failed;
}

export interface DownloadModuleOptions {
  onProgress?: (progress: ModuleDownloadProgress) => void;
}

export async function downloadModule(
  section: ModuleId,
  options: DownloadModuleOptions = {},
): Promise<{ pageFailures: string[]; assetFailures: string[] }> {
  const report = (partial: Partial<ModuleDownloadProgress> & { phase: ModuleDownloadProgress['phase'] }) => {
    options.onProgress?.({
      phase: partial.phase,
      done: partial.done ?? 0,
      total: partial.total ?? 0,
      failedUrls: partial.failedUrls ?? [],
    });
  };

  report({ phase: 'manifest', done: 0, total: 1 });
  const manifest = await fetchModuleManifest(section);

  const pageCache = await caches.open(sectionCacheName(section));
  const shellCache = await caches.open(SHELL_CACHE_NAME);

  const pageTotal = manifest.pages.length;
  report({ phase: 'pages', done: 0, total: pageTotal });

  const pageFailures = await runBatched(
    manifest.pages,
    (url) => cacheUrl(pageCache, url),
    (done, failed) => report({ phase: 'pages', done, total: pageTotal, failedUrls: failed }),
  );

  if (pageFailures.length > 0) {
    report({ phase: 'error', done: pageTotal, total: pageTotal, failedUrls: pageFailures });
    throw new Error(`${pageFailures.length} lesson page(s) could not be saved`);
  }

  const assetTotal = manifest.assets.length;
  report({ phase: 'assets', done: 0, total: assetTotal });

  const assetFailures = await runBatched(
    manifest.assets,
    (url) => cacheUrl(shellCache, url),
    (done, failed) => report({ phase: 'assets', done, total: assetTotal, failedUrls: failed }),
  );

  saveModuleStatus(section, {
    version: manifest.version,
    completedAt: new Date().toISOString(),
  });

  report({
    phase: assetFailures.length > 0 ? 'error' : 'done',
    done: assetTotal,
    total: assetTotal,
    failedUrls: assetFailures,
  });

  return { pageFailures, assetFailures };
}
