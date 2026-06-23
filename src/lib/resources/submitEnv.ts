/** Google reCAPTCHA v2 test keys — always pass; local / non-prod only. */
export const RECAPTCHA_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
export const RECAPTCHA_TEST_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

export const RECAPTCHA_SCRIPT = 'https://www.google.com/recaptcha/api.js?render=explicit';
export const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export const SUBMIT_ENDPOINT = '/.netlify/functions/submit-resource';

/** Site key for the browser widget. Production builds require PUBLIC_RECAPTCHA_SITE_KEY. */
export function resolveRecaptchaSiteKey(publicKey: string | undefined, isDev: boolean): string | undefined {
  const trimmed = publicKey?.trim();
  if (trimmed) return trimmed;
  if (isDev) return RECAPTCHA_TEST_SITE_KEY;
  return undefined;
}

/** Secret for server-side siteverify. Never expose to the client. */
export function resolveRecaptchaSecretKey(
  secretKey: string | undefined,
  opts: { netlifyDev?: boolean; allowTestKeys?: boolean },
): string | undefined {
  const trimmed = secretKey?.trim();
  if (trimmed) return trimmed;
  if (opts.netlifyDev || opts.allowTestKeys) return RECAPTCHA_TEST_SECRET_KEY;
  return undefined;
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

export function isAllowedSubmitOrigin(origin: string | undefined, referer: string | undefined): boolean {
  const candidate = origin ?? referer;
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    const originBase = `${url.protocol}//${url.host}`;
    if (originBase === PRODUCTION_ORIGIN) return true;
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
