import { describe, expect, it } from 'vitest';
import { rewriteOfflineHtml, urlPathToRelative } from '../../../scripts/offline-html-rewrite.mjs';

describe('offlineHtmlRewrite', () => {
  it('links nested lessons to index.html', () => {
    const html = '<a href="/frc/environment-setup">go</a>';
    const out = rewriteOfflineHtml(html, '/frc');
    expect(out).toMatch(/href="\.\/environment-setup\/index\.html"/);
  });

  it('keeps asset paths without index.html', () => {
    const html = '<link rel="stylesheet" href="/_astro/BaseLayout.css">';
    const out = rewriteOfflineHtml(html, '/frc');
    expect(out).toContain('href="../_astro/BaseLayout.css"');
    expect(out).not.toContain('index.html');
  });

  it('sibling lesson from nested page', () => {
    expect(urlPathToRelative('/frc/environment-setup', '/frc/intro-to-motors')).toBe('../intro-to-motors');
    const html = '<a href="/frc/intro-to-motors">next</a>';
    const out = rewriteOfflineHtml(html, '/frc/environment-setup');
    expect(out).toContain('href="../intro-to-motors/index.html"');
  });
});
