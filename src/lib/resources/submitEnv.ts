/** Google reCAPTCHA v2 test keys — always pass; local / non-prod only. */
export const RECAPTCHA_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
export const RECAPTCHA_TEST_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

export const RECAPTCHA_SCRIPT = 'https://www.google.com/recaptcha/api.js?render=explicit';
export const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export const SUBMIT_ENDPOINT = '/.netlify/functions/submit-resource';

export const PRODUCTION_HOSTNAME = 'mantik.netlify.app';

export function shouldUseRecaptchaTestKeys(opts: {
  isDev?: boolean;
  hostname?: string;
  netlifyDev?: boolean;
}): boolean {
  if (opts.netlifyDev || opts.isDev) return true;
  const host = opts.hostname?.toLowerCase() ?? '';
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.netlify.app') && host !== PRODUCTION_HOSTNAME) return true;
  return false;
}

/** Site key for the browser widget. Production hostname uses PUBLIC_RECAPTCHA_SITE_KEY. */
export function resolveRecaptchaSiteKey(
  publicKey: string | undefined,
  isDev: boolean,
  hostname?: string,
): string | undefined {
  if (shouldUseRecaptchaTestKeys({ isDev, hostname })) return RECAPTCHA_TEST_SITE_KEY;
  const trimmed = publicKey?.trim();
  if (trimmed) return trimmed;
  return undefined;
}

/** Secret for server-side siteverify. Never expose to the client. */
export function resolveRecaptchaSecretKey(
  secretKey: string | undefined,
  opts: { netlifyDev?: boolean; allowTestKeys?: boolean; hostname?: string },
): string | undefined {
  if (shouldUseRecaptchaTestKeys({ netlifyDev: opts.netlifyDev, hostname: opts.hostname })) {
    return RECAPTCHA_TEST_SECRET_KEY;
  }
  const trimmed = secretKey?.trim();
  if (trimmed) return trimmed;
  if (opts.allowTestKeys) return RECAPTCHA_TEST_SECRET_KEY;
  return undefined;
}

export function hostnameFromOrigin(origin: string | undefined, referer: string | undefined): string | undefined {
  const candidate = origin ?? referer;
  if (!candidate) return undefined;
  try {
    return new URL(candidate).hostname;
  } catch {
    return undefined;
  }
}

export const LOCAL_SUBMIT_ORIGINS = [
  'http://localhost:4321',
  'http://localhost:4322',
  'http://localhost:8888',
  'http://127.0.0.1:4321',
  'http://127.0.0.1:4322',
  'http://127.0.0.1:8888',
] as const;

export const PRODUCTION_ORIGIN = 'https://mantik.netlify.app';

/** Custom domains that host the FRC Aides GitHub Pages app. */
export const FRC_AIDES_ORIGINS = [
  'https://akhaled247.github.io',
  'https://aakhaled.com',
  'https://www.aakhaled.com',
] as const;

export const FRC_AIDES_HOSTNAMES = [
  'akhaled247.github.io',
  'aakhaled.com',
  'www.aakhaled.com',
] as const;

export type SubmitSource = 'frc-aides' | 'mantik' | 'local';

function isFrcAidesHostname(hostname: string): boolean {
  return (FRC_AIDES_HOSTNAMES as readonly string[]).includes(hostname.toLowerCase());
}

function isMantikHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === PRODUCTION_HOSTNAME) return true;
  return host.endsWith('.netlify.app') && host.includes('mantik');
}

/** Derive submit source from request Origin/Referer (never trust client body). */
export function resolveSubmitSource(
  origin: string | undefined,
  referer: string | undefined,
): SubmitSource {
  const hostname = hostnameFromOrigin(origin, referer)?.toLowerCase();
  if (!hostname) return 'mantik';
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'local';
  if (isFrcAidesHostname(hostname)) return 'frc-aides';
  if (isMantikHostname(hostname)) return 'mantik';
  return 'mantik';
}

export function submitSourceLabel(source: SubmitSource): string | undefined {
  if (source === 'frc-aides') return 'source-frc-aides';
  if (source === 'mantik') return 'source-mantik';
  return undefined;
}

export function submitSourceDisplayName(source: SubmitSource): string {
  if (source === 'frc-aides') return 'FRC Aides';
  if (source === 'mantik') return 'Mantik';
  return 'Local dev';
}

/** Full page URL from Referer, or Origin when Referer absent. */
export function submitPageUrl(origin: string | undefined, referer: string | undefined): string | undefined {
  const candidate = referer ?? origin;
  if (!candidate) return undefined;
  try {
    return new URL(candidate).href;
  } catch {
    return undefined;
  }
}

export function isAllowedSubmitOrigin(origin: string | undefined, referer: string | undefined): boolean {
  const candidate = origin ?? referer;
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    const originBase = `${url.protocol}//${url.host}`;
    if (originBase === PRODUCTION_ORIGIN) return true;
    if ((FRC_AIDES_ORIGINS as readonly string[]).includes(originBase)) return true;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    if ((LOCAL_SUBMIT_ORIGINS as readonly string[]).includes(originBase)) return true;
    if (url.hostname.endsWith('.netlify.app') && url.hostname.includes('mantik')) return true;
    return false;
  } catch {
    return false;
  }
}

export function corsAllowOrigin(origin: string | undefined, referer: string | undefined): string {
  const candidate = origin ?? referer;
  if (!candidate) return PRODUCTION_ORIGIN;
  try {
    const url = new URL(candidate);
    const originBase = `${url.protocol}//${url.host}`;
    if (isAllowedSubmitOrigin(originBase, undefined)) return originBase;
  } catch {
    /* fall through */
  }
  return PRODUCTION_ORIGIN;
}
