import type { SectionId } from '@/config/navigation';

export type ModuleId = SectionId;

export interface ModuleManifest {
  section: ModuleId;
  version: string;
  generatedAt: string;
  pages: string[];
  assets: string[];
}

export interface StoredModuleStatus {
  version: string;
  completedAt: string;
}

export type ModuleDownloadPhase = 'idle' | 'manifest' | 'pages' | 'assets' | 'done' | 'error';

export interface ModuleDownloadProgress {
  phase: ModuleDownloadPhase;
  done: number;
  total: number;
  failedUrls: string[];
}

export function sectionCacheName(section: ModuleId): string {
  return `mantik-${section}`;
}

export const SHELL_CACHE_NAME = 'mantik-shell';

export const OFFLINE_MODULES_STORAGE_KEY = 'mantik-offline-modules';
