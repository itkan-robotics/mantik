/** Normalize free-text answers for matching. */
export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')
    .replace(/[`'"]/g, '');
}

export function answerForms(text: string, aliases?: string[]): string[] {
  const forms = new Set<string>();
  forms.add(normalizeAnswer(text));
  for (const a of aliases ?? []) {
    const n = normalizeAnswer(a);
    if (n) forms.add(n);
  }
  return [...forms];
}
