import { useEffect, useState } from 'react';

export type SiteTheme = 'light' | 'dark';

export function getSiteTheme(): SiteTheme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/** Subscribes to theme changes from reader preferences (`mantik:prefs` + `data-theme`). */
export function useSiteTheme(): SiteTheme {
  const [theme, setTheme] = useState<SiteTheme>(getSiteTheme);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(getSiteTheme());
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('mantik:prefs', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('mantik:prefs', sync);
    };
  }, []);

  return theme;
}
