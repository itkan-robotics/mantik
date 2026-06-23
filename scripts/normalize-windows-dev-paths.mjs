/** Netlify dev on Windows proxies index paths with backslashes (e.g. /resources\\index). */
export function normalizeWindowsDevPathsPlugin() {
  return {
    name: 'normalize-windows-dev-paths',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.includes('\\')) {
          const from = req.url;
          req.url = req.url.replace(/\\/g, '/');
          // #region agent log
          fetch('http://127.0.0.1:7713/ingest/0792fdda-7db2-40da-ac1d-efee5dfcc651', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '78ce2e' },
            body: JSON.stringify({
              sessionId: '78ce2e',
              location: 'normalize-windows-dev-paths.mjs',
              message: 'normalized windows path',
              data: { from, to: req.url },
              timestamp: Date.now(),
              hypothesisId: 'F',
              runId: 'post-fix',
            }),
          }).catch(() => {});
          // #endregion
        }
        next();
      });
    },
  };
}
