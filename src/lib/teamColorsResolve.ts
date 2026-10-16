/**
 * Pick site light/dark mode for raw FRC team colors (no hex adjustment).
 */

import type { TeamColorCache } from '@/lib/teamColors';

export type SiteColorMode = 'light' | 'dark';

const BG: Record<SiteColorMode, string> = { light: '#fafaf9', dark: '#161314' };

export type TeamThemeVars = Record<string, string>;

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function srgbChannel(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Which site theme fits the team's raw colors better (dark colors → light site). */
export function pickSiteThemeForTeamColors(colors: TeamColorCache): SiteColorMode {
  const samples = [colors.primaryHex, colors.secondaryHex];
  let lightScore = 0;
  let darkScore = 0;
  for (const fg of samples) {
    lightScore += contrastRatio(fg, BG.light);
    darkScore += contrastRatio(fg, BG.dark);
  }
  if (lightScore !== darkScore) return lightScore > darkScore ? 'light' : 'dark';
  const avgL =
    (relativeLuminance(colors.primaryHex) + relativeLuminance(colors.secondaryHex)) / 2;
  return avgL < 0.45 ? 'light' : 'dark';
}

function hexToRgbChannels(hex: string): string {
  const { r, g, b } = parseHex(hex);
  return `${r}, ${g}, ${b}`;
}

function buttonLabelColor(accent: string): string {
  return relativeLuminance(accent) > 0.45 ? '#27272a' : '#ffffff';
}

function rgbaFromHex(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Map API hex to site tokens without changing team colors. */
export function buildRawTeamStyleVars(colors: TeamColorCache, siteTheme: SiteColorMode): TeamThemeVars {
  const { primaryHex, secondaryHex } = colors;
  const vars: TeamThemeVars = {
    '--mantik-team-primary': primaryHex,
    '--mantik-team-secondary': secondaryHex,
    '--color-accent': secondaryHex,
    '--color-brand-content': secondaryHex,
    '--color-link': secondaryHex,
    '--color-foreground-border': rgbaFromHex(secondaryHex, siteTheme === 'light' ? 0.12 : 0.28),
    '--color-background-hover': rgbaFromHex(secondaryHex, siteTheme === 'light' ? 0.08 : 0.12),
    '--color-inline-code-background': rgbaFromHex(secondaryHex, siteTheme === 'light' ? 0.07 : 0.12),
    '--btn-1-bg': secondaryHex,
    '--btn-1-border': secondaryHex,
    '--btn-1-color': buttonLabelColor(secondaryHex),
    '--btn-1-bg-hover': `color-mix(in srgb, ${secondaryHex} 82%, black)`,
    '--btn-1-border-hover': `color-mix(in srgb, ${secondaryHex} 82%, black)`,
    '--btn-1-color-hover': buttonLabelColor(secondaryHex),
  };
  if (siteTheme === 'light') {
    vars['--color-brand-primary'] = primaryHex;
    vars['--color-brand-primary-rgb'] = hexToRgbChannels(primaryHex);
  }
  return vars;
}

export const TEAM_CSS_VAR_KEYS = [
  '--mantik-team-primary',
  '--mantik-team-secondary',
  '--color-accent',
  '--color-brand-content',
  '--color-link',
  '--color-brand-primary',
  '--color-brand-primary-rgb',
  '--color-foreground-border',
  '--color-background-hover',
  '--color-inline-code-background',
  '--btn-1-bg',
  '--btn-1-border',
  '--btn-1-color',
  '--btn-1-bg-hover',
  '--btn-1-border-hover',
  '--btn-1-color-hover',
] as const;
