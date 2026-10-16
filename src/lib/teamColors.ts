/**
 * FRC team colors via https://api.frc-colors.com (see https://github.com/jonahsnider/frc-colors).
 */

import {
  buildRawTeamStyleVars,
  pickSiteThemeForTeamColors,
  TEAM_CSS_VAR_KEYS,
  type SiteColorMode,
  type TeamThemeVars,
} from '@/lib/teamColorsResolve';

export const FRC_COLORS_API = 'https://api.frc-colors.com/v1';

export interface TeamColorCache {
  primaryHex: string;
  secondaryHex: string;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidTeamNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 99_999;
}

export function sanitizeTeamColors(raw: unknown): TeamColorCache | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const primaryHex = o.primaryHex;
  const secondaryHex = o.secondaryHex;
  if (typeof primaryHex !== 'string' || typeof secondaryHex !== 'string') return null;
  if (!HEX_RE.test(primaryHex) || !HEX_RE.test(secondaryHex)) return null;
  return { primaryHex, secondaryHex };
}

export function sanitizeTeamStyleVars(raw: unknown): TeamThemeVars | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as TeamThemeVars;
}

export async function fetchTeamColors(teamNumber: number): Promise<TeamColorCache> {
  const res = await fetch(`${FRC_COLORS_API}/team/${teamNumber}`);
  if (!res.ok) {
    throw new Error(res.status === 400 ? 'Invalid team number.' : 'Could not load team colors. Try again later.');
  }
  const data = (await res.json()) as { primaryHex?: string; secondaryHex?: string };
  const colors = sanitizeTeamColors(data);
  if (!colors) throw new Error('No colors are available for this team yet.');
  return colors;
}

function clearTeamStyleProps(html: HTMLElement): void {
  html.removeAttribute('data-team-colors');
  for (const prop of TEAM_CSS_VAR_KEYS) html.style.removeProperty(prop);
}

function applyTeamStyleProps(html: HTMLElement, vars: TeamThemeVars): void {
  html.setAttribute('data-team-colors', '');
  for (const prop of TEAM_CSS_VAR_KEYS) {
    const value = vars[prop];
    if (value != null) html.style.setProperty(prop, value);
    else html.style.removeProperty(prop);
  }
}

export function teamColorsBundle(colors: TeamColorCache): {
  teamSiteTheme: SiteColorMode;
  teamStyleVars: TeamThemeVars;
} {
  const teamSiteTheme = pickSiteThemeForTeamColors(colors);
  return { teamSiteTheme, teamStyleVars: buildRawTeamStyleVars(colors, teamSiteTheme) };
}

/** Apply raw team tokens for the forced site theme (inline on <html>). */
export function applyTeamColors(colors: TeamColorCache | null, siteTheme: SiteColorMode): void {
  const html = document.documentElement;
  if (!colors) {
    clearTeamStyleProps(html);
    return;
  }
  applyTeamStyleProps(html, buildRawTeamStyleVars(colors, siteTheme));
}

export { pickSiteThemeForTeamColors, buildRawTeamStyleVars };
