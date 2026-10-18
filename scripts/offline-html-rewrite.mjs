/**
 * Rewrite root-absolute same-origin URLs in built HTML to relative paths for offline ZIP packs.
 */

/** @param {string} pageUrl e.g. /frc/environment-setup or / */
export function pageUrlDepth(pageUrl) {
  if (!pageUrl || pageUrl === '/') return 0;
  return pageUrl.split('/').filter(Boolean).length;
}

/**
 * Relative path from a lesson page URL to another site-root URL.
 * @param {string} fromPageUrl
 * @param {string} toUrl path starting with /
 */
export function urlPathToRelative(fromPageUrl, toUrl) {
  const toClean = toUrl.split('#')[0].split('?')[0];
  const fromParts = fromPageUrl === '/' ? [] : fromPageUrl.split('/').filter(Boolean);
  const toParts = toClean === '/' ? [] : toClean.split('/').filter(Boolean);

  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i += 1;
  }
  const up = fromParts.length - i;
  const down = toParts.slice(i);
  let rel = up === 0 ? './' : '../'.repeat(up);
  if (down.length) rel += down.join('/');
  if (rel.endsWith('/')) return rel;
  if (rel === './') return down.length ? down.join('/') : './';
  return rel;
}

const ROOT_ATTR_RE =
  /\b(href|src|component-url|renderer-url)=(["'])\/(?!\/)([^"'#?]*)(\?[^"']*)?(#[^"']*)?\2/gi;

const STATIC_ASSET_EXT =
  /\.(css|js|mjs|json|svg|png|jpe?g|webp|gif|wasm|webmanifest|ico|woff2?|ttf|map)$/i;

/** @param {string} targetPath absolute path e.g. /frc/foo */
function isStaticAssetPath(targetPath) {
  const pathOnly = targetPath.split('#')[0].split('?')[0];
  if (pathOnly === '/') return false;
  if (
    pathOnly.startsWith('/_astro/') ||
    pathOnly.startsWith('/media/') ||
    pathOnly.startsWith('/icons/') ||
    pathOnly.startsWith('/pagefind/')
  ) {
    return true;
  }
  return STATIC_ASSET_EXT.test(pathOnly);
}

/** @param {string} pathPart path after leading slash in attribute */
function normalizeTargetPath(pathPart) {
  if (!pathPart) return '/';
  const trimmed = pathPart.replace(/\/+$/, '');
  return trimmed ? `/${trimmed}` : '/';
}

/**
 * Simple static servers often do not map /path/ to /path/index.html — use explicit files for pages.
 * @param {string} rel
 * @param {string} targetPath
 */
function offlinePageHref(rel, targetPath) {
  if (rel.endsWith('.html')) return rel;
  if (targetPath === '/') {
    if (rel === './') return 'index.html';
    return rel.endsWith('/') ? `${rel}index.html` : `${rel}/index.html`;
  }
  return rel.endsWith('/') ? `${rel}index.html` : `${rel}/index.html`;
}

/**
 * @param {string} html
 * @param {string} pageUrl
 */
export function rewriteOfflineHtml(html, pageUrl) {
  return html.replace(ROOT_ATTR_RE, (match, attr, quote, pathPart, query = '', hash = '') => {
    const targetPath = normalizeTargetPath(pathPart);
    let rel = urlPathToRelative(pageUrl, targetPath);
    if (attr.toLowerCase() === 'href' && !isStaticAssetPath(targetPath)) {
      rel = offlinePageHref(rel, targetPath);
    }
    return `${attr}=${quote}${rel}${query ?? ''}${hash ?? ''}${quote}`;
  });
}
