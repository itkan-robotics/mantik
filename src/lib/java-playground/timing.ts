export interface JpTimings {
  loader?: number;
  init?: number;
  stage?: number;
  server?: number;
  warmup?: number;
  compile?: number;
  run?: number;
}

export function isJpDebug(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('jpDebug') != null;
  } catch {
    return false;
  }
}

export function logJpTimings(timings: JpTimings | undefined): void {
  if (!timings || !isJpDebug()) return;
  const parts = Object.entries(timings)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .map(([label, ms]) => `${label}=${Math.round(ms)}ms`);
  if (parts.length === 0) return;
  console.debug(`[jp] ${parts.join(' ')}`);
}

export function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
