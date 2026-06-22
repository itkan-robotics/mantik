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

export interface PidSimPalette {
  canvasBg: string;
  chartBg: string;
  gridStroke: string;
  axisStroke: string;
  labelText: string;
  mutedText: string;
  shaftStroke: string;
  limitStroke: string;
  pivotStroke: string;
}

export const PID_SIM_PALETTES: Record<SiteTheme, PidSimPalette> = {
  light: {
    canvasBg: '#f5f5f5',
    chartBg: '#ffffff',
    gridStroke: '#d4d4d4',
    axisStroke: '#666666',
    labelText: '#333333',
    mutedText: '#666666',
    shaftStroke: '#888888',
    limitStroke: '#aaaaaa',
    pivotStroke: '#555555',
  },
  dark: {
    canvasBg: '#141414',
    chartBg: '#1a1a1a',
    gridStroke: '#333333',
    axisStroke: '#888888',
    labelText: '#cccccc',
    mutedText: '#aaaaaa',
    shaftStroke: '#666666',
    limitStroke: '#888888',
    pivotStroke: '#444444',
  },
};

export function getPidSimPalette(theme: SiteTheme): PidSimPalette {
  return PID_SIM_PALETTES[theme];
}
