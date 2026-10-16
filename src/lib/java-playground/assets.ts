import { ECJ_FILENAME } from './constants';
import { LAUNCHER_FILENAME } from './launcherAsset';

export { ECJ_FILENAME, LAUNCHER_FILENAME };

/** Astro/Vite base path without a trailing slash (`''` when the site is at `/`). */
export function siteBasePath(): string {
  const raw = (import.meta.env.BASE_URL as string | undefined) ?? '';
  if (!raw || raw === '/') return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function playgroundPublicUrl(filename: string): string {
  return `${siteBasePath()}/java-playground/${filename}`;
}

/** CheerpJ `/app` maps to the site origin, so include the Astro base path. */
export function cheerpjAppPath(filename: string): string {
  return `/app${siteBasePath()}/java-playground/${filename}`;
}

export function ecjClasspath(): string {
  return cheerpjAppPath(ECJ_FILENAME);
}

export function launcherClasspath(): string {
  return cheerpjAppPath(LAUNCHER_FILENAME);
}

/** A playground asset as a path Java can open, e.g. for staging into /files. */
export function playgroundAppPath(filename: string): string {
  return cheerpjAppPath(filename);
}
