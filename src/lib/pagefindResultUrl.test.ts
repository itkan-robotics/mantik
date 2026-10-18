import { describe, expect, it } from 'vitest';
import { normalizePagefindResult, stripTrailingSlashUrl } from './pagefindResultUrl';

describe('pagefindResultUrl', () => {
  it('strips trailing slash from lesson paths', () => {
    expect(stripTrailingSlashUrl('/ftc/unit-testing/')).toBe('/ftc/unit-testing');
  });

  it('leaves root unchanged', () => {
    expect(stripTrailingSlashUrl('/')).toBe('/');
  });

  it('normalizes sub_results', () => {
    const out = normalizePagefindResult({
      url: '/java/foo/',
      sub_results: [{ url: '/java/foo/#bar/' }],
    });
    expect(out.url).toBe('/java/foo');
    expect(out.sub_results?.[0].url).toBe('/java/foo/#bar');
  });
});
