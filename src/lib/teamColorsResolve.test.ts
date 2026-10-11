import { describe, expect, it } from 'vitest';
import { buildRawTeamStyleVars, pickSiteThemeForTeamColors } from '@/lib/teamColorsResolve';

const TEAM_9128 = { primaryHex: '#023375', secondaryHex: '#000000' };

describe('pickSiteThemeForTeamColors', () => {
  it('uses light site theme for dark navy/black palettes', () => {
    expect(pickSiteThemeForTeamColors(TEAM_9128)).toBe('light');
  });

  it('keeps raw secondary as accent', () => {
    const vars = buildRawTeamStyleVars(TEAM_9128, 'light');
    expect(vars['--color-link']).toBe('#000000');
    expect(vars['--color-brand-primary']).toBe('#023375');
  });
});
