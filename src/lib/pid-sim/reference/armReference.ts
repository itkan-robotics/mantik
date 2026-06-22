import type { ArmPlantConfig, TuningConfig, Vendor } from '../types';
import { motorForVendor } from '../physics/vendorMotor';
import { ArmPlant } from '../physics/plant/armPlant';
import { angleDegToMotorRotations } from '../physics/units/armUnits';

/**
 * Plant from controls_js_sim vertical-arm-plant.js (5 kg, 1 m, 100:1 NEO).
 * Angle limits per Mantik spec: 0° start, ±60° soft (editable), ±90° hard (fixed).
 */
export const REFERENCE_ARM_PLANT: ArmPlantConfig = {
  massKg: 5,
  armLengthM: 1,
  gearRatio: 100,
  startAngleDeg: 0,
  softMinDeg: -60,
  softMaxDeg: 60,
  hardMinDeg: -90,
  hardMaxDeg: 90,
};

export const DEFAULT_ARM_SETPOINT_ROT = angleDegToMotorRotations(
  REFERENCE_ARM_PLANT.startAngleDeg,
  REFERENCE_ARM_PLANT,
);

function holdVoltageFor(vendor: Vendor): number {
  const plant = new ArmPlant(motorForVendor(vendor), REFERENCE_ARM_PLANT);
  return plant.getHoldVoltageHorizontal();
}

export const REV_ARM_HOLD_KG = holdVoltageFor('rev');
export const CTRE_ARM_HOLD_KG = holdVoltageFor('ctre');

/** Soft reference ranges — hints only, not correct answers. */
export const ARM_TUNING_REFERENCE = {
  kG: {
    revHoldHint: REV_ARM_HOLD_KG,
    ctreHoldHint: CTRE_ARM_HOLD_KG,
    hint: 'Arm gravity feedforward uses kG · cos(angle). Tune kG at your setpoint angle with binary search: increase until the arm creeps, then reduce until the position trace is flat. Hold voltage at horizontal differs between REV NEO and CTRE Kraken.',
  },
  kP: {
    start: 0.1,
    hint: 'kP is in volts per motor rotation (V/rot). Start at 0.1 and double until the arm reaches the setpoint. Watch for overshoot — arms near hard stops can ram limits if kP is too high.',
  },
  kI: {
    typical: 0,
    hint: 'Arms usually keep kI at 0 unless you have steady-state error after kP tuning.',
  },
  kD: {
    typical: 0,
    hint: 'Start at 0 unless you need extra damping after kP tuning.',
  },
  kS: {
    hint: 'kS overcomes static friction. Tune after kG/kP if the mechanism sticks at rest.',
  },
  kV: {
    hint: 'kV is in V/(rot/s). Tune during motion profiling if cruise phase lags behind the profile.',
  },
  kA: {
    hint: 'kA is in V/(rot/s²). Tune when accel or decel ramps feel weak. Edit kA in ArmSubsystem.java — SpringTune has no kA slider yet.',
  },
  maxMotion: {
    hint: 'Max velocity and accel are in rot/s and rot/s² in code (lesson video may show deg/s). Zero means no profiling — the setpoint jumps instantly. Non-zero values generate a trapezoid path.',
  },
} as const;

export function armTuningWarnings(config: TuningConfig, vendor: Vendor = 'rev'): string[] {
  const warnings: string[] = [];
  const holdHint = vendor === 'rev' ? REV_ARM_HOLD_KG : CTRE_ARM_HOLD_KG;
  if (config.kG > holdHint * 2.5) {
    warnings.push(
      `kG above ${(holdHint * 2.5).toFixed(2)} V is unusually high for this ${vendor.toUpperCase()} arm plant`,
    );
  }
  if (config.kP > 200) {
    warnings.push('kP above 200 V/rot often causes heavy oscillation on this plant');
  }
  return warnings;
}

/** SpringTune kP slider max (V/rot). */
export const ARM_KP_SLIDER_MAX = 150;

export const ARM_SETPOINT_SLIDER_MAX = angleDegToMotorRotations(
  REFERENCE_ARM_PLANT.softMaxDeg,
  REFERENCE_ARM_PLANT,
);
