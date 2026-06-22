import type { PlantConfig, TuningConfig, Vendor } from '../types';
import { motorForVendor } from '../physics/vendorMotor';
import { VerticalElevatorPlant } from '../physics/plant/verticalElevatorPlant';
import {
  heightMToMotorRotations,
  maxMotorRotations,
  motorRotationsToHeightM,
} from '../physics/units/encoderUnits';

/** Plant parameters from mantik-pid-practice ElevatorSubsystem (YAMS reference repo). */
export const REFERENCE_PLANT: PlantConfig = {
  massLbs: 16,
  minHeightM: 0,
  maxHeightM: 3,
  startHeightM: 0.5,
  gearRatio: 12,
  drumCircumferenceM: 0.25 * 22 * 0.0254,
};

export const DEFAULT_SETPOINT_ROT = heightMToMotorRotations(
  REFERENCE_PLANT.startHeightM,
  REFERENCE_PLANT,
);

export const MAX_SETPOINT_ROT = maxMotorRotations(REFERENCE_PLANT);

function holdVoltageFor(vendor: Vendor): number {
  const plant = new VerticalElevatorPlant(motorForVendor(vendor), REFERENCE_PLANT);
  return plant.getHoldVoltage();
}

export const REV_HOLD_KG = holdVoltageFor('rev');
export const CTRE_HOLD_KG = holdVoltageFor('ctre');

/** Soft reference ranges — hints only, not correct answers. */
export const TUNING_REFERENCE = {
  kG: {
    revHoldHint: REV_HOLD_KG,
    ctreHoldHint: CTRE_HOLD_KG,
    hint: 'kG depends on mass, gearing, and motor. Use binary search: increase until the carriage creeps up, then reduce until it holds still. Hold voltage differs between REV NEO and CTRE Kraken.',
  },
  kP: {
    start: 0.1,
    hint: 'kP is in volts per motor rotation (V/rot). Start at 0.1 and double until the position trace looks rectangular. Values align with SparkMax / Phoenix tuner scales more closely than the old meter-based sim.',
  },
  kI: { typical: 0, hint: 'Elevators usually keep kI at 0 unless you have steady-state error after kP tuning.' },
  kD: { typical: 0, hint: 'Start at 0 unless you need extra damping after kP tuning.' },
  kS: { hint: 'kS overcomes static friction. Tune after kG/kP if the mechanism sticks at rest.' },
  kV: {
    hint: 'kV is in V/(rot/s). Tune during motion profiling if cruise phase lags behind the profile.',
  },
  kA: {
    hint: 'kA is in V/(rot/s²). Tune when accel or decel ramps feel weak. Edit kA in ElevatorSubsystem.java — SpringTune has no kA slider yet.',
  },
  maxMotion: {
    hint: 'Max velocity and accel are in rot/s and rot/s². Zero means no profiling — the setpoint jumps instantly. Non-zero values generate a trapezoid path. Start conservative, then increase until overshoot or vibration appears.',
  },
} as const;

export function tuningWarnings(config: TuningConfig, vendor: Vendor = 'rev'): string[] {
  const warnings: string[] = [];
  const holdHint = vendor === 'rev' ? REV_HOLD_KG : CTRE_HOLD_KG;
  if (config.kG > holdHint * 2.5) {
    warnings.push(`kG above ${(holdHint * 2.5).toFixed(2)} V is unusually high for this ${vendor.toUpperCase()} plant`);
  }
  if (config.kP > 200) {
    warnings.push('kP above 200 V/rot often causes heavy oscillation on this plant');
  }
  const setpointM = motorRotationsToHeightM(config.setpoint, REFERENCE_PLANT);
  if (setpointM > REFERENCE_PLANT.maxHeightM || setpointM < REFERENCE_PLANT.minHeightM) {
    warnings.push(
      `Setpoint outside travel range (${REFERENCE_PLANT.minHeightM}–${REFERENCE_PLANT.maxHeightM} m in height)`,
    );
  }
  return warnings;
}

/** SpringTune kP slider max (V/rot). */
export const KP_SLIDER_MAX = 150;
