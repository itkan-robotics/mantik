/** 1.0 = full handholding, ~0.15 = instructions only at end of guide */
export function aidLevel(stepIndex: number, totalSteps: number): number {
  const t = stepIndex / Math.max(totalSteps - 1, 1);
  return Math.exp(-3 * t);
}

export type AidTier = 'full' | 'medium' | 'minimal';

export function aidTier(level: number): AidTier {
  if (level > 0.7) return 'full';
  if (level > 0.3) return 'medium';
  return 'minimal';
}
