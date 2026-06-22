import type { FlywheelPlantConfig, TuningConfig, Vendor } from '../types';
import { FlywheelPlant } from '../physics/plant/flywheelPlant';
import { motorForVendor } from '../physics/vendorMotor';
import { wheelRpmToMotorRotPerSec } from '../physics/units/flywheelUnits';

/**
 * Plant from controls_js_sim flywheel-plant.js (0.55 kg, 3 in radius, 5:1).
 * Browser uses NEO/Kraken via vendorMotor — not 775-pro from reference JS.
 */
export const REFERENCE_FLYWHEEL_PLANT: FlywheelPlantConfig = {
  massKg: 0.55,
  radiusM: 0.0762,
  gearRatio: 5,
  maxRpm: 6000,
};

/** Default setpoint for kV lesson — 1 motor rot/s. */
export const DEFAULT_FLYWHEEL_SETPOINT_ROT_PER_SEC = 1;

/** Example lesson target: 417 wheel RPM → motor rot/s (hint only). */
export const EXAMPLE_LESSON_WHEEL_RPM = 417;

export function exampleLessonMotorRotPerSec(plant: FlywheelPlantConfig = REFERENCE_FLYWHEEL_PLANT): number {
  return wheelRpmToMotorRotPerSec(EXAMPLE_LESSON_WHEEL_RPM, plant);
}

function kvHintAtOneRotPerSec(vendor: Vendor): number {
  const plant = new FlywheelPlant(motorForVendor(vendor), REFERENCE_FLYWHEEL_PLANT);
  return plant.estimateVoltageForMotorRotPerSec(1);
}

export const REV_FLYWHEEL_KV_HINT = kvHintAtOneRotPerSec('rev');
export const CTRE_FLYWHEEL_KV_HINT = kvHintAtOneRotPerSec('ctre');

/** Soft reference ranges — hints only, not correct answers. */
export const FLYWHEEL_TUNING_REFERENCE = {
  kS: {
    start: 0.1,
    hint: 'kS is static friction feedforward in volts. Start small. In simulation friction is minimal; on real hardware kS helps the wheel start from rest.',
  },
  kV: {
    revHint: REV_FLYWHEEL_KV_HINT,
    ctreHint: CTRE_FLYWHEEL_KV_HINT,
    hint: 'kV is in V/(rot/s). Set setpoint to 1 motor rot/s, then use the kS-doubling trick from the shooter lesson to find the voltage that holds 1 rot/s. Copy that value into kV.',
  },
  kP: {
    start: 0.001,
    hint: 'kP for velocity is very small (often 0.001–0.01). It adds voltage proportional to velocity error. kV should do most of the work.',
  },
  kI: {
    typical: 0,
    hint: 'Flywheels usually keep kI at 0 unless you have steady velocity error after kV and kP tuning.',
  },
  kD: {
    typical: 0,
    hint: 'Start at 0 unless you need extra damping after kP tuning.',
  },
  setpoint: {
    hint: 'Setpoint is target velocity in motor rot/s. TraceView shows wheel RPM. Example: 417 wheel RPM ≈ (417/60)×gearRatio motor rot/s.',
  },
};

export const FLYWHEEL_KP_SLIDER_MAX = 0.05;
export const FLYWHEEL_SETPOINT_SLIDER_MAX = 100;

export function flywheelTuningWarnings(config: TuningConfig, plant: FlywheelPlantConfig): string[] {
  const warnings: string[] = [];
  const maxMotor = wheelRpmToMotorRotPerSec(plant.maxRpm, plant);
  if (config.setpoint > maxMotor + 0.01) {
    warnings.push(
      `Setpoint (${config.setpoint.toFixed(2)} motor rot/s) exceeds plant max (${maxMotor.toFixed(2)} motor rot/s / ${plant.maxRpm} wheel RPM)`,
    );
  }
  if (config.setpoint < 0) {
    warnings.push('Flywheel velocity setpoint should be zero or positive');
  }
  return warnings;
}
