import type { DiveTier } from './types';

/** Points per tier (Krillion-style). Each point = 10 m depth. */
export const TIER_POINTS: Record<DiveTier, number> = {
  common: 10,
  uncommon: 15,
  schooler: 30,
  rare: 60,
  deep: 85,
  krillion: 100,
};

export const TIER_LABELS: Record<DiveTier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  schooler: 'Schooler',
  rare: 'Rare',
  deep: 'Deep cut',
  krillion: 'Krillion',
};

export function depthMetersForPoints(points: number): number {
  return points * 10;
}
