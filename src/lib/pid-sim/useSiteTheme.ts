export type { SiteTheme } from '@/lib/useSiteTheme';
export { getSiteTheme, useSiteTheme } from '@/lib/useSiteTheme';

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

export const PID_SIM_PALETTES: Record<'light' | 'dark', PidSimPalette> = {
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

export function getPidSimPalette(theme: 'light' | 'dark'): PidSimPalette {
  return PID_SIM_PALETTES[theme];
}
