/** Netlify dev on Windows proxies index paths with backslashes (e.g. /resources\\index). */
export function normalizeWindowsDevPathsPlugin() {
  return {
    name: 'normalize-windows-dev-paths',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.includes('\\')) {
          req.url = req.url.replace(/\\/g, '/');
        }
        next();
      });
    },
  };
}
