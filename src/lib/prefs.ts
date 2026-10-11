/**
 * Reader preferences: theme, text size, line spacing, contrast, motion.
 *
 * Stored as one JSON object in localStorage and applied as `data-*` attributes
 * on <html>, which the CSS tokens in global.css key off. The inline boot script
 * in BaseLayout.astro applies the stored values before first paint (it cannot
 * import this module, so it duplicates the minimum); everything else — the
 * header toggle, the preferences panel — goes through here.
 */

export const PREFS_KEY = 'mantik-prefs';
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
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  text: 'md',
  spacing: 'normal',
  contrast: 'normal',
  motion: 'system',
};

const VALID: { [K in keyof Prefs]: readonly Prefs[K][] } = {
  theme: ['system', 'light', 'dark'],
  text: ['sm', 'md', 'lg', 'xl'],
  spacing: ['normal', 'relaxed'],
  contrast: ['normal', 'high'],
  motion: ['system', 'reduce'],
};

function sanitize(raw: unknown): Prefs {
  const out: Prefs = { ...DEFAULT_PREFS };
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(VALID) as (keyof Prefs)[]) {
      const v = (raw as Record<string, unknown>)[key];
      if ((VALID[key] as readonly unknown[]).includes(v)) {
        (out as unknown as Record<string, unknown>)[key] = v;
      }
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

/** The theme actually in effect once `system` is resolved against the OS. */
export function effectiveTheme(prefs: Prefs): 'light' | 'dark' {
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
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#161314' : '#fafaf9');
  document.dispatchEvent(new CustomEvent('mantik:prefs', { detail: prefs }));
}

export function updatePrefs(patch: Partial<Prefs>): Prefs {
  const next = sanitize({ ...loadPrefs(), ...patch });
  savePrefs(next);
  applyPrefs(next);
  return next;
}
