/**
 * Mantik service worker (injectManifest). Postbuild re-inject runs after Pagefind + offline manifests.
 */
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';
import {
  LEARNING_SECTIONS,
  NAVIGATION_DENYLIST,
  ONLINE_ONLY_PATH_PREFIXES,
} from './sw-config';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST, { directoryIndex: 'index.html' });
clientsClaim();

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const SECTION_CACHE_NAMES = LEARNING_SECTIONS.map((section) => `mantik-${section}`);

async function matchCachedDocument(url: URL): Promise<Response | null> {
  const origin = url.origin;
  const pathname = url.pathname;
  const paths = new Set([pathname]);
  if (pathname.endsWith('/')) {
    paths.add(pathname.slice(0, -1) || '/');
  } else {
    paths.add(`${pathname}/`);
  }

  const cacheNames = [...SECTION_CACHE_NAMES, 'mantik-shell'];
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    for (const path of paths) {
      const keys = [new URL(path, origin).href, path];
      for (const key of keys) {
        const hit = await cache.match(key);
        if (hit) return hit;
      }
    }
  }
  return null;
}

function isOfflineContext(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function serveOfflineHelpOrError(): Promise<Response> {
  if (isOfflineContext()) {
    const offline = await matchPrecache('/offline/index.html');
    if (offline) return offline;
  }
  return Response.error();
}

function isLessonPath(pathname: string): boolean {
  return LEARNING_SECTIONS.some(
    (section) => pathname === `/${section}` || pathname.startsWith(`/${section}/`),
  );
}

registerRoute(
  new NavigationRoute(
    async ({ url, request }) => {
      if (isOfflineContext()) {
        const cached = await matchCachedDocument(url);
        if (cached) return cached;
        const precached = await matchPrecache(request);
        if (precached) return precached;
        if (isLessonPath(url.pathname)) {
          return serveOfflineHelpOrError();
        }
      }

      try {
        const response = await fetch(request);
        if (response.ok || response.status === 304 || response.type === 'opaqueredirect') {
          return response;
        }
        if (response.status >= 400) {
          return response;
        }
        return response;
      } catch {
        const cached = await matchCachedDocument(url);
        if (cached) return cached;

        const precached = await matchPrecache(request);
        if (precached) return precached;

        return serveOfflineHelpOrError();
      }
    },
    { denylist: NAVIGATION_DENYLIST },
  ),
);

function sectionRuntimeCache(section: string): void {
  registerRoute(
    ({ url }) => {
      const path = url.pathname;
      if (path === '/frc/2026-public-repositories' || path.startsWith('/frc/2026-public-repositories/')) {
        return false;
      }
      return path === `/${section}` || path.startsWith(`/${section}/`);
    },
    new StaleWhileRevalidate({
      cacheName: `mantik-${section}`,
      plugins: [new ExpirationPlugin({ maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 30 })],
    }),
    'GET',
  );
}

for (const section of LEARNING_SECTIONS) {
  sectionRuntimeCache(section);
}

registerRoute(
  ({ url }) => url.pathname.startsWith('/_astro/'),
  new StaleWhileRevalidate({
    cacheName: 'mantik-shell',
    plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
  'GET',
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/media/'),
  new StaleWhileRevalidate({
    cacheName: 'mantik-shell',
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
  'GET',
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/pagefind/'),
  new CacheFirst({
    cacheName: 'mantik-pagefind',
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 14 })],
  }),
  'GET',
);

registerRoute(
  ({ url }) =>
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'mantik-external-fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
  'GET',
);

registerRoute(
  ({ url }) => url.hostname === 'cdnjs.cloudflare.com' && url.pathname.includes('font-awesome'),
  new StaleWhileRevalidate({
    cacheName: 'mantik-external-fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
  'GET',
);

for (const prefix of ONLINE_ONLY_PATH_PREFIXES) {
  registerRoute(({ url }) => url.pathname.startsWith(prefix), new NetworkOnly(), 'GET');
}
