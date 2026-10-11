/** Normalize console output so Windows newlines and trailing spaces do not fail a check. */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

/**
 * Match normalized output against a regex source. An unparseable pattern is an
 * authoring bug, not a student mistake, so it fails loudly rather than silently.
 */
export function outputMatchesPattern(actual: string, pattern: string): boolean {
  return new RegExp(pattern).test(normalizeOutput(actual));
}
