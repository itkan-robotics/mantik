import type { PlantConfig } from '../types';
import { REFERENCE_PLANT } from '../reference/elevatorReference';

/** Stub — returns default plant until editable plant constants ship. */
export function parsePlantConfig(_source: string): PlantConfig {
  return { ...REFERENCE_PLANT };
}
