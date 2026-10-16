import { describe, expect, it } from 'vitest';
import { pathWithBase } from './pathWithBase';

describe('pathWithBase', () => {
  it('returns path unchanged when base is root', () => {
    expect(pathWithBase('/java/java-intro')).toBe('/java/java-intro');
  });
});
