/** Join a site-root-relative path with Astro `BASE_URL` without producing `//` URLs. */
export function pathWithBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  if (!base || base === '/') return path;
  return `${base.replace(/\/$/, '')}${path}`;
}
