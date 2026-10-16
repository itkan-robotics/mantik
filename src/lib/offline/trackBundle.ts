import type { ModuleId } from './types';

export function trackBundleZipUrl(section: ModuleId): string {
  return `/offline/downloads/mantik-${section}.zip`;
}

export function formatBundleSize(bytes: number | undefined): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
