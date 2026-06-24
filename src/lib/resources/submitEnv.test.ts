import { describe, expect, it } from 'vitest';
import {
  isAllowedSubmitOrigin,
  PRODUCTION_HOSTNAME,
  RECAPTCHA_TEST_SECRET_KEY,
  RECAPTCHA_TEST_SITE_KEY,
  resolveRecaptchaSecretKey,
  resolveRecaptchaSiteKey,
  shouldUseRecaptchaTestKeys,
} from './submitEnv';

describe('shouldUseRecaptchaTestKeys', () => {
  it('uses test keys on localhost and dev', () => {
    expect(shouldUseRecaptchaTestKeys({ isDev: true })).toBe(true);
    expect(shouldUseRecaptchaTestKeys({ netlifyDev: true })).toBe(true);
    expect(shouldUseRecaptchaTestKeys({ hostname: 'localhost' })).toBe(true);
    expect(shouldUseRecaptchaTestKeys({ hostname: '127.0.0.1' })).toBe(true);
  });

  it('uses test keys on Netlify preview hosts', () => {
    expect(
      shouldUseRecaptchaTestKeys({ hostname: 'deploy-preview-42--mantik.netlify.app' }),
    ).toBe(true);
  });

  it('uses production keys only on canonical hostname', () => {
    expect(shouldUseRecaptchaTestKeys({ hostname: PRODUCTION_HOSTNAME })).toBe(false);
  });
});

describe('isAllowedSubmitOrigin', () => {
  it('allows FRC Aides production domains', () => {
    expect(isAllowedSubmitOrigin('https://aakhaled.com', undefined)).toBe(true);
    expect(isAllowedSubmitOrigin('https://www.aakhaled.com', undefined)).toBe(true);
    expect(isAllowedSubmitOrigin('https://akhaled247.github.io', undefined)).toBe(true);
  });
});

describe('resolveRecaptchaSiteKey', () => {
  it('prefers test key on preview even when env key is set', () => {
    expect(
      resolveRecaptchaSiteKey('prod-site-key', false, 'deploy-preview-1--mantik.netlify.app'),
    ).toBe(RECAPTCHA_TEST_SITE_KEY);
  });

  it('uses production key on production hostname', () => {
    expect(resolveRecaptchaSiteKey('prod-site-key', false, PRODUCTION_HOSTNAME)).toBe(
      'prod-site-key',
    );
  });
});

describe('resolveRecaptchaSecretKey', () => {
  it('prefers test secret on preview even when env secret is set', () => {
    expect(
      resolveRecaptchaSecretKey('prod-secret', {
        hostname: 'deploy-preview-1--mantik.netlify.app',
      }),
    ).toBe(RECAPTCHA_TEST_SECRET_KEY);
  });

  it('uses production secret on production hostname', () => {
    expect(
      resolveRecaptchaSecretKey('prod-secret', { hostname: PRODUCTION_HOSTNAME }),
    ).toBe('prod-secret');
  });
});
