import type { TuningConfig } from '../types';
import { TUNER_KP_OPTIMAL, REFERENCE_PLANT } from '../reference/elevatorReference';
import { DEFAULT_TUNING } from '../types';
import { computeHoldVoltage } from './elevatorPlant';
import { getNeo } from './dcMotor';

export interface GoldenScenario {
  id: string;
  durationSec: number;
  config: TuningConfig;
}

const holdVoltage = computeHoldVoltage(getNeo(1), REFERENCE_PLANT);

/**
 * Known browser vs desktop divergence sources (see plan Part 4 Step 2):
 * - Control: explicit P-only in TS vs SparkMax/Phoenix sim closed-loop in YAMS
 * - kP units: tuner scale (SparkMax/Phoenix-like); physics converts via tunerKpToPhysics()
 * - Trapezoid profile: lightweight TS port; timing may differ slightly from WPILib TrapezoidProfile
 * - kS: in feedforward only, not hidden plant friction (by design for pedagogy)
 * Golden traces use wpilibReferenceRunner (same plant + step setpoint loop as Java export).
 */
export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  {
    id: 'kg-hold',
    durationSec: 3,
    config: {
      ...DEFAULT_TUNING,
      kG: holdVoltage,
      setpoint: REFERENCE_PLANT.startHeightM,
    },
  },
  {
    id: 'kp-0.1',
    durationSec: 4,
    config: {
      ...DEFAULT_TUNING,
      kG: holdVoltage,
      kP: 1,
      setpoint: 2,
    },
  },
  {
    id: 'kp-0.5',
    durationSec: 4,
    config: {
      ...DEFAULT_TUNING,
      kG: holdVoltage,
      kP: 4,
      setpoint: 2,
    },
  },
  {
    id: 'kp-optimal',
    durationSec: 4,
    config: {
      ...DEFAULT_TUNING,
      kG: holdVoltage,
      kP: TUNER_KP_OPTIMAL,
      setpoint: 2,
    },
  },
  {
    id: 'kp-2x-optimal',
    durationSec: 4,
    config: {
      ...DEFAULT_TUNING,
      kG: holdVoltage,
      kP: TUNER_KP_OPTIMAL * 2,
      setpoint: 2,
    },
  },
];
