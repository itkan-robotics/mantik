import { CHEERPJ_LOADER } from './constants';
import { isRunPhaseStatus } from './protocol';
import { dismissToast, showToast } from '@/lib/ui/toast';

export const JAVA_RUNTIME_OFFLINE_MESSAGE =
  'In-browser Java needs an internet connection. Downloaded lesson pages still work offline; Run does not.';

export const JAVA_LOADING_TOAST_ID = 'mantik-java-loading';
export const JAVA_OFFLINE_TOAST_ID = 'mantik-java-offline';

const CHEERPJ_PROBE_MS = 5_000;

let cheerpjCdnUnreachable = false;

export function resetJavaRuntimeConnectivity(): void {
  cheerpjCdnUnreachable = false;
}

export function markJavaCdnUnreachable(): void {
  cheerpjCdnUnreachable = true;
}

export function isJavaRuntimeOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  if (!navigator.onLine) return false;
  if (cheerpjCdnUnreachable) return false;
  return true;
}

export function notifyJavaRuntimeOffline(): void {
  showToast(JAVA_RUNTIME_OFFLINE_MESSAGE, {
    id: JAVA_OFFLINE_TOAST_ID,
    durationMs: 12_000,
    extraClass: 'notification-popup--offline',
  });
}

/** @returns false when offline (toast shown). */
export function assertJavaRuntimeOnline(): boolean {
  if (isJavaRuntimeOnline()) return true;
  notifyJavaRuntimeOffline();
  return false;
}

async function probeCheerpjCdn(): Promise<boolean> {
  if (typeof fetch === 'undefined') return true;
  try {
    // no-cors: success means the network delivered a response; CORS is not required.
    await fetch(CHEERPJ_LOADER, {
      method: 'GET',
      cache: 'no-store',
      mode: 'no-cors',
      credentials: 'omit',
      signal: AbortSignal.timeout(CHEERPJ_PROBE_MS),
    });
    return true;
  } catch {
    return false;
  }
}

/** Uses navigator.onLine plus a short CheerpJ CDN reachability check. */
export async function assertJavaRuntimeOnlineAsync(): Promise<boolean> {
  if (!assertJavaRuntimeOnline()) return false;
  const reachable = await probeCheerpjCdn();
  if (reachable) return true;
  markJavaCdnUnreachable();
  notifyJavaRuntimeOffline();
  return false;
}

const CDN_FAILURE_PATTERNS = [
  /cheerpjInit is missing/i,
  /Could not load the Java runtime/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /Load failed/i,
  JAVA_RUNTIME_OFFLINE_MESSAGE,
];

export function isJavaRuntimeUnavailableMessage(message: string): boolean {
  return CDN_FAILURE_PATTERNS.some((pattern) => pattern.test(message));
}

export function maybeNotifyJavaRuntimeUnavailable(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (!isJavaRuntimeUnavailableMessage(message)) return;
  markJavaCdnUnreachable();
  notifyJavaRuntimeOffline();
}

function isRuntimeLoadingMessage(message: string): boolean {
  if (/^Java ready\b/i.test(message)) return false;
  if (/^Java could not\b/i.test(message)) return false;
  if (message.startsWith('Loading Java')) return true;
  if (message.startsWith('Preparing the Java')) return true;
  if (message.startsWith('Warming up the compiler')) return true;
  return false;
}

export function syncJavaRuntimeLoadingToast(message: string): void {
  if (isRuntimeLoadingMessage(message)) {
    showToast(message, { id: JAVA_LOADING_TOAST_ID, durationMs: null });
    return;
  }
  if (
    /^Java ready\b/i.test(message) ||
    message.startsWith('Compiling') ||
    isRunPhaseStatus(message)
  ) {
    dismissToast(JAVA_LOADING_TOAST_ID);
  }
}

export function wrapJavaRuntimeStatus(onStatus?: (message: string) => void): (message: string) => void {
  return (message) => {
    syncJavaRuntimeLoadingToast(message);
    onStatus?.(message);
  };
}

export function installJavaConnectivityToasts(doc: Document = document): void {
  if (typeof window === 'undefined') return;
  const onOnline = () => {
    resetJavaRuntimeConnectivity();
    dismissToast(JAVA_OFFLINE_TOAST_ID);
  };
  window.addEventListener('online', onOnline);
  doc.addEventListener('astro:before-swap', () => window.removeEventListener('online', onOnline), {
    once: true,
  });
}
