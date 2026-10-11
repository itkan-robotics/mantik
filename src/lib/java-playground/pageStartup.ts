/** Start CheerpJ preload before React hydrates runnable examples. */
export function installJavaPageStartup(doc: Document = document): void {
  let started = false;

  const start = () => {
    if (started || !doc.querySelector('[data-jp-example], [data-jp-playground]')) return;
    started = true;
    const indicator = doc.querySelector<HTMLElement>('[data-jp-runtime-status]');
    const report = (message: string) => {
      if (!indicator) return;
      indicator.hidden = false;
      indicator.textContent = message;
    };
    report('Loading Java in the background…');
    void import('./preloadJavaRuntime')
      .then(({ preloadJavaRuntimeSoon }) => preloadJavaRuntimeSoon(report))
      .then(() => report('Java ready. Run an example when you are ready.'))
      .catch((error: unknown) => {
        started = false;
        report('Java could not finish loading. Click Run to retry.');
        console.warn('Java background startup failed:', error);
      });
  };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
  doc.addEventListener('astro:page-load', start);
}
