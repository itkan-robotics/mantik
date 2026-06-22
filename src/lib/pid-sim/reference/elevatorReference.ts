import type { PlantConfig, TuningConfig } from '../types';
import { getNeo } from '../physics/dcMotor';
import { computeHoldVoltage, computeOptimalKpFromPlant, computeTheoreticalKA, computeTheoreticalKV } from '../physics/elevatorPlant';

/** Plant parameters from mantik-pid-practice ElevatorSubsystem (YAMS reference repo). */
export const REFERENCE_PLANT: PlantConfig = {
  massLbs: 16,
  minHeightM: 0,
  maxHeightM: 3,
  startHeightM: 0.5,
  gearRatio: 12, // 3:1 × 4:1
  drumCircumferenceM: 0.25 * 22 * 0.0254, // inches per rotation → meters
};

const REFERENCE_MOTOR = getNeo(1);

/** SysId-style theoretical gains for this plant+motor (hints only). */
export const THEORETICAL_KV = computeTheoreticalKV(REFERENCE_MOTOR, REFERENCE_PLANT);
export const THEORETICAL_KA = computeTheoreticalKA(REFERENCE_MOTOR, REFERENCE_PLANT);
export const THEORETICAL_KG = computeHoldVoltage(REFERENCE_MOTOR, REFERENCE_PLANT);

/** Physics motor: WPILib DCMotor.getNEO(1) — matches mantik-pid-practice SparkWrapper. */
export const SIM_MOTOR = 'NEO-1' as const;

/** WPILib-native kP (V/m) for near-target ζ on this plant — derived from motor matrices. */
export const OPTIMAL_KP = computeOptimalKpFromPlant(REFERENCE_MOTOR, REFERENCE_PLANT);

/**
 * Well-tuned kP in SparkMax/Phoenix-like tuner units (lesson videos often ~12–32 on this plant).
 * User-facing kP in code and sliders uses this scale; physics converts internally.
 */
export const TUNER_KP_OPTIMAL = 22;

/** Multiply tuner kP by this to get WPILib V/m applied in the control loop. */
export const TUNER_KP_FACTOR = OPTIMAL_KP / TUNER_KP_OPTIMAL;

export function tunerKpToPhysics(tunerKp: number): number {
  return tunerKp * TUNER_KP_FACTOR;
}

export function physicsKpToTuner(physicsKp: number): number {
  return physicsKp / TUNER_KP_FACTOR;
}

/** Soft reference ranges — hints only, not correct answers. */
export const TUNING_REFERENCE = {
  kG: {
    typicalMax: 1.5,
    lessonExample: 0.61,
    hint: 'Simulated elevators often need kG below ~1. The lesson binary-search example landed near 0.61.',
  },
  kP: {
    start: 0.1,
    optimal: TUNER_KP_OPTIMAL,
    oscillationAbove: TUNER_KP_OPTIMAL * 1.5,
    hint: 'Start low and double (0.1 → 0.2 → 0.4 … or 6 → 12 → 24 on tuners). A good kP for this plant is often in the 12–32 range — same scale as SparkMax/Phoenix sliders in the lesson videos.',
  },
  kI: { typical: 0, hint: 'Elevators usually keep kI at 0 unless you have steady-state error after kP tuning.' },
  kD: { typical: 0, hint: 'Elevators usually keep kD at 0 unless you need extra damping after kP tuning.' },
  kS: { hint: 'kS overcomes static friction. Tune after kG/kP if the mechanism sticks at rest.' },
  kV: {
    hint: 'kV compensates for back-EMF during motion. WPILib SysId / ReCalc can estimate it from the plant. On this reference elevator, theoretical kV is often a few V·s/m — tune until cruise segments on TraceView match the profile slope.',
  },
  maxMotion: {
    hint: 'WPILib elevator tuning starts around 0.3 m/s and 0.3 m/s² max motion for smooth profiling. Zero means no software cap (step setpoint for kG/kP tuning).',
  },
} as const;

export function tuningWarnings(config: TuningConfig): string[] {
  const warnings: string[] = [];
  if (config.kG > TUNING_REFERENCE.kG.typicalMax * 2) {
    warnings.push(`kG above ${TUNING_REFERENCE.kG.typicalMax * 2} is unusually high for this elevator plant`);
  }
  if (config.kP > TUNING_REFERENCE.kP.oscillationAbove) {
    warnings.push(
      `kP above ${TUNING_REFERENCE.kP.oscillationAbove} often causes oscillation on this plant`,
    );
  }
  if (config.setpoint > REFERENCE_PLANT.maxHeightM || config.setpoint < REFERENCE_PLANT.minHeightM) {
    warnings.push(`Setpoint outside travel range (${REFERENCE_PLANT.minHeightM}–${REFERENCE_PLANT.maxHeightM} m)`);
  }
  return warnings;
}
