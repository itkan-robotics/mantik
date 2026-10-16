import { describe, expect, it } from 'vitest';
import { depthLineForScore, matchPromptAnswer } from './scoring';
import type { DivePrompt } from './types';

const commandGroups: DivePrompt = {
  id: 'command-group-type',
  prompt: 'Name one WPILib command group type.',
  answers: [
    { text: 'SequentialCommandGroup', aliases: ['sequential command group'], tier: 'common' },
    { text: 'ParallelCommandGroup', aliases: ['parallelcommandgroup'], tier: 'uncommon' },
    { text: 'ParallelRaceGroup', tier: 'rare' },
  ],
};

describe('matchPromptAnswer', () => {
  it('matches exact and compact alias forms', () => {
    expect(matchPromptAnswer(commandGroups, 'ParallelRaceGroup').points).toBe(60);
    expect(matchPromptAnswer(commandGroups, 'sequential command group').points).toBe(10);
    expect(matchPromptAnswer(commandGroups, 'parallel command group').points).toBe(15);
    expect(matchPromptAnswer(commandGroups, 'ParallelCommandGroup').points).toBe(15);
  });

  it('does not substring-match generic words', () => {
    expect(matchPromptAnswer(commandGroups, 'command').points).toBe(0);
    expect(matchPromptAnswer(commandGroups, 'parallel').points).toBe(0);
  });

  it('returns zero for unknown', () => {
    expect(matchPromptAnswer(commandGroups, 'nope').points).toBe(0);
  });
});

describe('depthLineForScore', () => {
  const maxPoints = 500;

  it('maps full score to last line', () => {
    expect(depthLineForScore(500, maxPoints, 400)).toBe(400);
  });

  it('is monotonic', () => {
    const a = depthLineForScore(100, maxPoints, 200);
    const b = depthLineForScore(300, maxPoints, 200);
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
