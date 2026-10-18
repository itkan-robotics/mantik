import { describe, expect, it } from 'vitest';
import { JAVA_PLAYGROUND_SECTIONS, sectionHasJavaPlayground } from './playgroundSections';

describe('sectionHasJavaPlayground', () => {
  it('includes java and comp', () => {
    expect(JAVA_PLAYGROUND_SECTIONS).toEqual(['java', 'comp']);
    expect(sectionHasJavaPlayground('java')).toBe(true);
    expect(sectionHasJavaPlayground('comp')).toBe(true);
  });

  it('excludes ftc and frc', () => {
    expect(sectionHasJavaPlayground('ftc')).toBe(false);
    expect(sectionHasJavaPlayground('frc')).toBe(false);
  });
});
