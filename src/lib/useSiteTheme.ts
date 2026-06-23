import { useEffect, useState } from 'react';

export type SiteTheme = 'light' | 'dark';

export function getSiteTheme(): SiteTheme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/** Subscribes to `html[data-theme]` changes from the global theme toggle. */
export function useSiteTheme(): SiteTheme {
  const [theme, setTheme] = useState<SiteTheme>(getSiteTheme);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(getSiteTheme());
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
