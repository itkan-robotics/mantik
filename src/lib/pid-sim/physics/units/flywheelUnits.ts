import type { FlywheelPlantConfig } from '../../types';

/** Wheel rad/s from motor encoder rot/s. */
export function motorRotPerSecToWheelRadPerSec(
  motorRotPerSec: number,
  plant: FlywheelPlantConfig,
): number {
  return ((motorRotPerSec * 2 * Math.PI) / plant.gearRatio);
}

/** Motor encoder rot/s from wheel rad/s. */
export function wheelRadPerSecToMotorRotPerSec(
  wheelRadPerSec: number,
  plant: FlywheelPlantConfig,
): number {
  return (wheelRadPerSec * plant.gearRatio) / (2 * Math.PI);
}

/** Wheel RPM for TraceView / mechanism display. */
export function motorRotPerSecToWheelRpm(
  motorRotPerSec: number,
  plant: FlywheelPlantConfig,
): number {
  return (motorRotPerSec / plant.gearRatio) * 60;
}

export function wheelRpmToMotorRotPerSec(
  wheelRpm: number,
  plant: FlywheelPlantConfig,
): number {
  return (wheelRpm / 60) * plant.gearRatio;
}

export function wheelRadPerSecToWheelRpm(wheelRadPerSec: number): number {
  return (wheelRadPerSec * 60) / (2 * Math.PI);
}

export function wheelRpmToWheelRadPerSec(wheelRpm: number): number {
  return (wheelRpm * 2 * Math.PI) / 60;
}

/** Max motor rot/s from plant RPM cap. */
export function maxMotorRotPerSec(plant: FlywheelPlantConfig): number {
  return wheelRpmToMotorRotPerSec(plant.maxRpm, plant);
}

/** Velocity preset fraction → motor rot/s setpoint. */
export function velocityFractionToSetpointRotPerSec(
  fraction: number,
  plant: FlywheelPlantConfig,
): number {
  const clamped = Math.max(0, Math.min(1, fraction));
  return clamped * maxMotorRotPerSec(plant);
}
