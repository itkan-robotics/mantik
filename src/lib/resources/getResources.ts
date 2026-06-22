import rawCatalog from '@/data/resources.json';
import { resourcesCatalogSchema, type ResourceEntry } from './schema';

let cached: ResourceEntry[] | null = null;

export function getResources(): ResourceEntry[] {
  if (cached) return cached;
  const parsed = resourcesCatalogSchema.parse(rawCatalog);
  cached = parsed.resources;
  return cached;
}

export function getMinorTags(resources: ResourceEntry[]): string[] {
  const set = new Set(resources.map((r) => r.minor));
  return [...set].sort((a, b) => a.localeCompare(b));
}
