import { describe, expect, it } from 'vitest';
import { normalizeOutput, outputsMatch } from './compareOutput';
import { allExerciseIds, getExercise } from './exercises';
import { assertPublicMain, publicClassName } from './sourceChecks';

describe('normalizeOutput', () => {
  it('treats CRLF and trailing spaces as equivalent', () => {
    expect(normalizeOutput('Hello \r\nWorld  \r\n')).toBe('Hello\nWorld');
  });

  it('trims leading and trailing blank lines', () => {
    expect(normalizeOutput('\n\nA\nB\n\n')).toBe('A\nB');
  });
});

describe('outputsMatch', () => {
  it('matches after normalization', () => {
    expect(outputsMatch('Hello, Java!\r\nI am learning to print.\n', 'Hello, Java!\nI am learning to print.')).toBe(
      true,
    );
  });

  it('rejects different text', () => {
    expect(outputsMatch('Hello', 'Hello!')).toBe(false);
  });
});

describe('assertPublicMain', () => {
  it('accepts public class Main', () => {
    expect(assertPublicMain('public class Main {\n  public static void main(String[] args) {}\n}')).toBeNull();
  });

  it('ignores comments when finding the class name', () => {
    const source = `
      // public class Other
      /* public class Nested */
      public class Main {
        public static void main(String[] args) {}
      }
    `;
    expect(publicClassName(source)).toBe('Main');
    expect(assertPublicMain(source)).toBeNull();
  });

  it('requires a main method', () => {
    const message = assertPublicMain('public class Main {}');
    expect(message).toContain('main method');
  });

  it('rejects a different public class name', () => {
    const message = assertPublicMain('public class Robot {}');
    expect(message).toContain('Main');
    expect(message).toContain('Robot');
  });
});

describe('exercise catalog', () => {
  it('has unique ids, a compilable starter, and usable hidden tests', () => {
    const ids = allExerciseIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(40);
    for (const id of ids) {
      const exercise = getExercise(id);
      expect(exercise).toBeDefined();
      // Assignments name their own file; lesson playgrounds default to Main.
      expect(assertPublicMain(exercise!.starter, exercise!.entryClass)).toBeNull();
      expect(exercise!.tests.length).toBeGreaterThan(0);
      for (const test of exercise!.tests) {
        // Every test needs something to compare against, literal or pattern.
        const target = test.pattern ?? test.stdout;
        expect(target, `${id} / ${test.name}`).toBeDefined();
        expect(target!.length, `${id} / ${test.name}`).toBeGreaterThan(0);
        if (test.pattern !== undefined) {
          // An unparseable pattern would fail every student silently.
          expect(() => new RegExp(test.pattern!), `${id} / ${test.name}`).not.toThrow();
          expect(test.describe, `${id} / ${test.name}`).toBeTruthy();
        }
      }
    }
  });
});
