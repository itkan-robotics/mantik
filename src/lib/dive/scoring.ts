import { answerForms, normalizeAnswer } from './normalize';
import { TIER_POINTS, depthMetersForPoints } from './tiers';
import type { DiveAnswer, DivePrompt } from './types';

export interface MatchResult {
  matched: DiveAnswer | null;
  points: number;
  matchedText: string | null;
}

/** Collapse spaces for forgiving "parallel command group" vs ParallelCommandGroup. */
export function compact(s: string): string {
  return s.replace(/\s+/g, '');
}

export function formsMatch(normalizedInput: string, form: string): boolean {
  if (form === normalizedInput) return true;
  if (compact(form) === compact(normalizedInput)) return true;
  return false;
}

export function matchPromptAnswer(prompt: DivePrompt, rawInput: string): MatchResult {
  const normalized = normalizeAnswer(rawInput);
  if (!normalized) {
    return { matched: null, points: 0, matchedText: null };
  }

  let best: DiveAnswer | null = null;
  let bestPoints = 0;
  let bestText: string | null = null;

  for (const answer of prompt.answers) {
    const forms = answerForms(answer.text, answer.aliases);
    const hit = forms.some((f) => formsMatch(normalized, f));
    if (!hit) continue;
    const pts = TIER_POINTS[answer.tier];
    if (pts > bestPoints) {
      best = answer;
      bestPoints = pts;
      bestText = answer.text;
    }
  }

  return { matched: best, points: bestPoints, matchedText: bestText };
}

export function depthLineForScore(cumulativePoints: number, maxPoints: number, lineCount: number): number {
  if (lineCount <= 1) return 1;
  const ratio = maxPoints > 0 ? Math.min(1, cumulativePoints / maxPoints) : 0;
  return Math.max(1, Math.min(lineCount, Math.round(ratio * lineCount)));
}

export function roundDepthMeters(points: number): number {
  return depthMetersForPoints(points);
}
