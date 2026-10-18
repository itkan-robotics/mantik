/** Match Astro `trailingSlash: 'never'` — Pagefind defaults to `/path/` for index.html pages. */
export function stripTrailingSlashUrl(url: string): string {
  if (!url || url === '/') return url;
  return url.replace(/\/+$/, '') || '/';
}

export type PagefindUiResult = {
  url: string;
  sub_results?: { url: string }[];
};

export function normalizePagefindResult<T extends PagefindUiResult>(result: T): T {
  result.url = stripTrailingSlashUrl(result.url);
  if (result.sub_results) {
    for (const sub of result.sub_results) {
      sub.url = stripTrailingSlashUrl(sub.url);
    }
  }
  return result;
}
