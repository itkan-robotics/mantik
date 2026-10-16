/**
 * Reader preferences: theme, text size, line spacing, contrast, motion, team colors.
 *
 * Stored as one JSON object in localStorage and applied as `data-*` attributes
 * on <html>, which the CSS tokens in global.css key off. The inline boot script
 * in BaseLayout.astro applies the stored values before first paint (it cannot
 * import this module, so it duplicates the minimum); everything else — the
 * header toggle, the preferences panel — goes through here.
 */

import {
  applyTeamColors,
  fetchTeamColors,
  isValidTeamNumber,
  sanitizeTeamColors,
  sanitizeTeamStyleVars,
  teamColorsBundle,
  type TeamColorCache,
} from '@/lib/teamColors';
import type { SiteColorMode, TeamThemeVars } from '@/lib/teamColorsResolve';

export const PREFS_KEY = 'mantik-prefs';
export type { TeamColorCache };
/** Pre-preferences key; read once for migration so nobody's theme choice is lost. */
const LEGACY_THEME_KEY = 'mantik-theme';

export type Theme = 'system' | 'light' | 'dark';
export type TextSize = 'sm' | 'md' | 'lg' | 'xl';
export type Spacing = 'normal' | 'relaxed';
export type Contrast = 'normal' | 'high';
export type Motion = 'system' | 'reduce';

export interface Prefs {
  theme: Theme;
  text: TextSize;
  spacing: Spacing;
  contrast: Contrast;
  motion: Motion;
  teamNumber: number | null;
  teamColors: TeamColorCache | null;
  /** Site light/dark mode forced while team colors are active. */
  teamSiteTheme: SiteColorMode | null;
  /** Cached inline tokens for boot (raw team hex). */
  teamStyleVars: TeamThemeVars | null;
  /** Restored when team colors are cleared. */
  themeBeforeTeam: Theme | null;
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  text: 'md',
  spacing: 'normal',
  contrast: 'normal',
  motion: 'system',
  teamNumber: null,
  teamColors: null,
  teamSiteTheme: null,
  teamStyleVars: null,
  themeBeforeTeam: null,
};

const VALID: { [K in keyof Prefs]: readonly Prefs[K][] } = {
  theme: ['system', 'light', 'dark'],
  text: ['sm', 'md', 'lg', 'xl'],
  spacing: ['normal', 'relaxed'],
  contrast: ['normal', 'high'],
  motion: ['system', 'reduce'],
};

function sanitizeSiteTheme(v: unknown): SiteColorMode | null {
  return v === 'light' || v === 'dark' ? v : null;
}

function sanitize(raw: unknown): Prefs {
  const out: Prefs = { ...DEFAULT_PREFS };
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of Object.keys(VALID) as (keyof typeof VALID)[]) {
      const v = obj[key];
      if ((VALID[key] as readonly unknown[]).includes(v)) {
        (out as unknown as Record<string, unknown>)[key] = v;
      }
    }
    const teamNumber = obj.teamNumber;
    if (teamNumber === null || teamNumber === undefined) {
      out.teamNumber = null;
    } else if (isValidTeamNumber(teamNumber)) {
      out.teamNumber = teamNumber;
    }
    out.teamColors = sanitizeTeamColors(obj.teamColors);
    out.teamSiteTheme = sanitizeSiteTheme(obj.teamSiteTheme);
    out.teamStyleVars = sanitizeTeamStyleVars(obj.teamStyleVars);
    const themeBefore = obj.themeBeforeTeam;
    if (themeBefore === null || themeBefore === undefined) {
      out.themeBeforeTeam = null;
    } else if ((VALID.theme as readonly unknown[]).includes(themeBefore)) {
      out.themeBeforeTeam = themeBefore as Theme;
    }
    if (out.teamNumber === null || !out.teamColors) {
      out.teamColors = null;
      out.teamSiteTheme = null;
      out.teamStyleVars = null;
      out.themeBeforeTeam = null;
    } else if (!out.teamSiteTheme || !out.teamStyleVars) {
      const bundle = teamColorsBundle(out.teamColors);
      out.teamSiteTheme = bundle.teamSiteTheme;
      out.teamStyleVars = bundle.teamStyleVars;
    }
  }
  return out;
}

export function loadPrefs(): Prefs {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return sanitize(JSON.parse(stored));
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === 'light' || legacy === 'dark') return { ...DEFAULT_PREFS, theme: legacy };
  } catch {
    /* private mode, blocked storage — fall through to defaults */
  }
  return { ...DEFAULT_PREFS };
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    /* nothing to do; the attributes are still applied for this page */
  }
}

export function hasActiveTeamColors(prefs: Prefs): boolean {
  return prefs.teamColors != null && prefs.teamSiteTheme != null;
}

/** The theme actually in effect once `system` is resolved against the OS. */
export function effectiveTheme(prefs: Prefs): 'light' | 'dark' {
  if (hasActiveTeamColors(prefs) && prefs.teamSiteTheme) return prefs.teamSiteTheme;
  if (prefs.theme !== 'system') return prefs.theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Stamp the attributes the stylesheet reads. Safe to call repeatedly. */
export function applyPrefs(prefs: Prefs): void {
  const html = document.documentElement;
  const theme = effectiveTheme(prefs);
  html.setAttribute('data-theme', theme);
  html.style.colorScheme = theme;
  html.setAttribute('data-text', prefs.text);
  html.setAttribute('data-spacing', prefs.spacing);
  html.setAttribute('data-contrast', prefs.contrast);
  html.setAttribute('data-motion', prefs.motion);
  if (prefs.teamColors && prefs.teamSiteTheme) {
    applyTeamColors(prefs.teamColors, prefs.teamSiteTheme);
  } else {
    applyTeamColors(null, theme);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#161314' : '#fafaf9');
  document.dispatchEvent(new CustomEvent('mantik:prefs', { detail: prefs }));
}

/** Fetch from FRC Colors API and apply site-wide team theme (prefs drawer + localStorage). */
export async function applyTeamColorsByNumber(teamNumber: number): Promise<Prefs> {
  if (!isValidTeamNumber(teamNumber)) {
    throw new Error('Enter a team number from 1 to 99999.');
  }
  const colors = await fetchTeamColors(teamNumber);
  return setTeamColorsPrefs(teamNumber, colors);
}

export function setTeamColorsPrefs(teamNumber: number, teamColors: TeamColorCache): Prefs {
  const current = loadPrefs();
  const bundle = teamColorsBundle(teamColors);
  const themeBeforeTeam =
    current.teamNumber == null ? current.theme : (current.themeBeforeTeam ?? current.theme);
  const next = sanitize({
    ...current,
    teamNumber,
    teamColors,
    teamSiteTheme: bundle.teamSiteTheme,
    teamStyleVars: bundle.teamStyleVars,
    themeBeforeTeam,
  });
  savePrefs(next);
  applyPrefs(next);
  return next;
}

export function clearTeamColorsPrefs(): Prefs {
  const current = loadPrefs();
  const restoredTheme = current.themeBeforeTeam ?? current.theme;
  const next = sanitize({
    ...current,
    theme: restoredTheme,
    teamNumber: null,
    teamColors: null,
    teamSiteTheme: null,
    teamStyleVars: null,
    themeBeforeTeam: null,
  });
  savePrefs(next);
  applyPrefs(next);
  return next;
}

export function updatePrefs(patch: Partial<Prefs>): Prefs {
  const current = loadPrefs();
  if (hasActiveTeamColors(current) && patch.theme !== undefined) {
    const { theme: _ignored, ...rest } = patch;
    patch = rest;
  }
  const next = sanitize({ ...current, ...patch });
  savePrefs(next);
  applyPrefs(next);
  return next;
}
