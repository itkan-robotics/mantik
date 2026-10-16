import {
  assertJavaRuntimeOnlineAsync,
  installJavaConnectivityToasts,
  isJavaRuntimeOnline,
  maybeNotifyJavaRuntimeUnavailable,
  syncJavaRuntimeLoadingToast,
  wrapJavaRuntimeStatus,
} from './javaRuntimeToast';

/** Start CheerpJ preload before React hydrates runnable examples. */
export function installJavaPageStartup(doc: Document = document): void {
  let started = false;
  installJavaConnectivityToasts(doc);

  const start = () => {
    if (started || !doc.querySelector('[data-jp-example], [data-jp-playground]')) return;
    const indicator = doc.querySelector<HTMLElement>('[data-jp-runtime-status]');
    const report = (message: string) => {
      if (indicator) {
        indicator.hidden = false;
        indicator.textContent = message;
      }
      syncJavaRuntimeLoadingToast(message);
    };

    void (async () => {
      if (!(await assertJavaRuntimeOnlineAsync())) {
        report('In-browser Java needs an internet connection.');
        return;
      }

      started = true;
      report('Loading Java in the background…');
      try {
        const mod = await import('./cheerpjRunner');
        if (typeof window !== 'undefined') {
          (window as unknown as { __jpDumpResources?: typeof mod.dumpCheerpjResources }).__jpDumpResources =
            mod.dumpCheerpjResources;
        }
        await mod.preloadJavaRuntime(wrapJavaRuntimeStatus(report));
        report('Java ready. Run an example when you are ready.');
      } catch (error: unknown) {
        started = false;
        maybeNotifyJavaRuntimeUnavailable(error);
        report('Java could not finish loading. Click Run to retry.');
        console.warn('Java background startup failed:', error);
      }
    })();
  };

  const retryWhenOnline = () => {
    if (!doc.querySelector('[data-jp-example], [data-jp-playground]')) return;
    if (started || !isJavaRuntimeOnline()) return;
    start();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', retryWhenOnline);
    doc.addEventListener(
      'astro:before-swap',
      () => window.removeEventListener('online', retryWhenOnline),
      { once: true },
    );
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
  doc.addEventListener('astro:page-load', start);
}
