import type { SectionId } from '@/config/navigation';

export type DiveTier =
  | 'common'
  | 'uncommon'
  | 'schooler'
  | 'rare'
  | 'deep'
  | 'krillion';

export interface DiveAnswer {
  text: string;
  aliases?: string[];
  tier: DiveTier;
}

export interface DivePrompt {
  id: string;
  prompt: string;
  answers: DiveAnswer[];
  learnMore?: { section: SectionId; lessonId: string };
}

export interface DivePromptPack {
  version: number;
  roundCount: number;
  readDelayMs: number;
  answerMs: number;
  maxScorePerRun: number;
  prompts: DivePrompt[];
}

export interface DiveRosterTeam {
  teamNumber: number;
  teamName: string;
  normEpa: number | null;
  linkToCodebases: string;
  chosenFile: string;
  lineCount: number;
  license: string | null;
}

export interface DiveRoster {
  generatedAt: string;
  teamLimit: number;
  sourceIndex: string;
  teams: DiveRosterTeam[];
}

export interface DiveTeamMeta extends DiveRosterTeam {
  robotFile: string | null;
  robotLineCount: number;
  containerFile: string | null;
  containerLineCount: number;
  sha: string;
  sourceUrl: string;
  fetchedAt: string;
}

export interface DiveRoundResult {
  promptId: string;
  prompt: string;
  userAnswer: string;
  /** Set when player accepted a “did you mean?” suggestion. */
  confirmedSuggestion?: string;
  matchedText: string | null;
  tier: DiveTier | null;
  points: number;
  depthMeters: number;
  depthLine: number;
}

export interface DiveRunSummary {
  teamNumber: number;
  totalPoints: number;
  maxPoints: number;
  totalDepthMeters: number;
  finalLine: number;
  lineCount: number;
  rounds: DiveRoundResult[];
}
