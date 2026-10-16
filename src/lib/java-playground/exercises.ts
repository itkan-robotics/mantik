import type { JavaPlaygroundExercise } from './types';
import { ALGORITHMS } from './catalog/algo';
import { BASICS } from './catalog/basics';
import { CONCURRENCY } from './catalog/concurrency';
import { DATA_STRUCTURES } from './catalog/ds';
import { DESIGN_PATTERNS } from './catalog/dp';
import { FUNCTIONS } from './catalog/fn';
import { LOGIC } from './catalog/logic';
import { LOOPS } from './catalog/loops';
import { OOP } from './catalog/oop';

const ALL: JavaPlaygroundExercise[] = [
  ...BASICS,
  ...LOGIC,
  ...LOOPS,
  ...OOP,
  ...DATA_STRUCTURES,
  ...ALGORITHMS,
  ...FUNCTIONS,
  ...DESIGN_PATTERNS,
  ...CONCURRENCY,
];

export const EXERCISES: Record<string, JavaPlaygroundExercise> = Object.fromEntries(
  ALL.map((exercise) => [exercise.id, exercise]),
);

export function getExercise(id: string): JavaPlaygroundExercise | undefined {
  return EXERCISES[id];
}

export function allExerciseIds(): string[] {
  return Object.keys(EXERCISES);
}
