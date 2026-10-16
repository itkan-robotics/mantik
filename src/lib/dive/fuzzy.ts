import { answerForms, normalizeAnswer } from './normalize';
import { formsMatch } from './scoring';
import { TIER_POINTS } from './tiers';
import type { DiveAnswer, DivePrompt } from './types';

function compact(s: string): string {
  return s.replace(/\s+/g, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const row = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[b.length];
}

export interface CloseAnswerSuggestion {
  displayText: string;
  answer: DiveAnswer;
}

function maxEditDistanceForLength(len: number): number {
  if (len <= 4) return 1;
  if (len <= 9) return 2;
  return 3;
}

/** Near-miss typo suggestion when input does not exactly match any accepted form. */
export function suggestCloseAnswer(prompt: DivePrompt, rawInput: string): CloseAnswerSuggestion | null {
  const normalized = normalizeAnswer(rawInput);
  if (!normalized || normalized.length < 3) return null;

  const compactIn = compact(normalized);
  let best: { dist: number; displayText: string; answer: DiveAnswer } | null = null;

  for (const answer of prompt.answers) {
    for (const form of answerForms(answer.text, answer.aliases)) {
      if (formsMatch(normalized, form)) return null;

      const cf = compact(form);
      if (!cf) continue;
      const dist = levenshtein(compactIn, cf);
      if (dist === 0) return null;

      const maxLen = Math.max(compactIn.length, cf.length);
      const threshold = maxEditDistanceForLength(maxLen);
      if (dist > threshold) continue;

      const better =
        !best ||
        dist < best.dist ||
        (dist === best.dist && TIER_POINTS[answer.tier] > TIER_POINTS[best.answer.tier]);

      if (better) {
        best = { dist, displayText: answer.text, answer };
      }
    }
  }

  return best ? { displayText: best.displayText, answer: best.answer } : null;
}
