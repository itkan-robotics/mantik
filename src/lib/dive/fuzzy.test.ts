import { describe, expect, it } from 'vitest';
import { levenshtein, suggestCloseAnswer } from './fuzzy';
import type { DivePrompt } from './types';

const commandGroups: DivePrompt = {
  id: 'x',
  prompt: 'Name one WPILib command group type.',
  answers: [
    { text: 'SequentialCommandGroup', aliases: ['sequential command group'], tier: 'common' },
    { text: 'ParallelRaceGroup', tier: 'rare' },
  ],
};

describe('levenshtein', () => {
  it('counts single-char edits', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(levenshtein('abc', 'abd')).toBe(1);
  });
});

describe('suggestCloseAnswer', () => {
  it('suggests typo near a canonical answer', () => {
    const s = suggestCloseAnswer(commandGroups, 'ParallelRaceGrop');
    expect(s?.displayText).toBe('ParallelRaceGroup');
  });

  it('returns null on exact match path', () => {
    expect(suggestCloseAnswer(commandGroups, 'ParallelRaceGroup')).toBeNull();
  });

  it('returns null when too far', () => {
    expect(suggestCloseAnswer(commandGroups, 'completely unrelated')).toBeNull();
  });
});
