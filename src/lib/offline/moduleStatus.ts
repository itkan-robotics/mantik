import type { ModuleId, ModuleManifest, StoredModuleStatus } from './types';
import { OFFLINE_MODULES_STORAGE_KEY } from './types';

export type ModuleUiStatus = 'not_downloaded' | 'ready' | 'update_available';

export function loadStoredModules(): Partial<Record<ModuleId, StoredModuleStatus>> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OFFLINE_MODULES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<ModuleId, StoredModuleStatus>>;
  } catch {
    return {};
  }
}

export function saveModuleStatus(section: ModuleId, status: StoredModuleStatus): void {
  const all = loadStoredModules();
  all[section] = status;
  localStorage.setItem(OFFLINE_MODULES_STORAGE_KEY, JSON.stringify(all));
}

export function clearModuleStatus(section: ModuleId): void {
  const all = loadStoredModules();
  delete all[section];
  localStorage.setItem(OFFLINE_MODULES_STORAGE_KEY, JSON.stringify(all));
}

export function getModuleUiStatus(
  section: ModuleId,
  manifest: ModuleManifest | null,
): ModuleUiStatus {
  const stored = loadStoredModules()[section];
  if (!stored) return 'not_downloaded';
  if (!manifest) return 'ready';
  if (stored.version !== manifest.version) return 'update_available';
  return 'ready';
}
