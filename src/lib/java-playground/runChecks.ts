import { compileAndRunCases } from './cheerpjRunner';
import { outputMatchesPattern, outputsMatch } from './compareOutput';
import type { CheckResult, HiddenTest, StatusFn } from './types';

function outputMeetsTest(stdout: string, test: HiddenTest): boolean {
  if (test.pattern !== undefined) return outputMatchesPattern(stdout, test.pattern);
  if (test.stdout !== undefined) return outputsMatch(stdout, test.stdout);
  return false;
}

export async function runHiddenTests(
  source: string,
  tests: HiddenTest[],
  onStatus?: StatusFn,
  entryClass = 'Main',
): Promise<CheckResult> {
  const results = await compileAndRunCases(
    source,
    tests.map((test) => test.stdin ?? ''),
    onStatus,
    entryClass,
  );

  const cases = tests.map((test, i) => {
    const result = results[i] ?? results[0];
    const actual = result.compileFailed ? result.compileOutput : result.stdout;
    const ran = !result.compileFailed && !result.stderr.trim();
    return {
      name: test.name,
      passed: ran && outputMeetsTest(result.stdout, test),
      // A pattern test has no literal expected text, so show what it looks for.
      expected: test.describe ?? test.stdout ?? test.pattern ?? '',
      actual,
      compileFailed: result.compileFailed,
      stderr: result.stderr,
    };
  });

  return {
    passed: cases.filter((c) => c.passed).length,
    total: cases.length,
    cases,
  };
}
