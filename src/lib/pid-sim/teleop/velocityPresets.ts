import type { FlywheelPlantConfig } from '../types';
import { velocityFractionToSetpointRotPerSec } from '../physics/units/flywheelUnits';

export const VELOCITY_PRESET_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const;

export const VELOCITY_PRESET_LABELS = ['0%', '25%', '50%', '75%', '100%'] as const;

export { velocityFractionToSetpointRotPerSec };
