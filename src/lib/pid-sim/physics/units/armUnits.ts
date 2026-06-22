import type { ArmPlantConfig } from '../../types';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Mechanism rotations per motor rotation. */
export function mechanismRotPerMotorRot(plant: ArmPlantConfig): number {
  return 1 / plant.gearRatio;
}

export function motorRotationsToAngleDeg(motorRot: number, plant: ArmPlantConfig): number {
  return motorRot * (360 / plant.gearRatio);
}

export function angleDegToMotorRotations(deg: number, plant: ArmPlantConfig): number {
  return deg * plant.gearRatio / 360;
}

export function motorRotationsToAngleRad(motorRot: number, plant: ArmPlantConfig): number {
  return motorRot * (2 * Math.PI / plant.gearRatio);
}

export function angleRadToMotorRotations(rad: number, plant: ArmPlantConfig): number {
  return rad * plant.gearRatio / (2 * Math.PI);
}

export function angleDegToRad(deg: number): number {
  return deg * DEG_TO_RAD;
}

export function angleRadToDeg(rad: number): number {
  return rad * RAD_TO_DEG;
}

export function rotPerSecToRadPerSec(rotPerSec: number, plant: ArmPlantConfig): number {
  return rotPerSec * (2 * Math.PI / plant.gearRatio);
}

export function radPerSecToRotPerSec(radPerSec: number, plant: ArmPlantConfig): number {
  return radPerSec * plant.gearRatio / (2 * Math.PI);
}

export function rotPerSec2ToRadPerSec2(rotPerSec2: number, plant: ArmPlantConfig): number {
  return rotPerSec2 * (2 * Math.PI / plant.gearRatio);
}

export function radPerSec2ToRotPerSec2(radPerSec2: number, plant: ArmPlantConfig): number {
  return radPerSec2 * plant.gearRatio / (2 * Math.PI);
}

export function radPerSecToDegPerSec(radPerSec: number): number {
  return radPerSec * RAD_TO_DEG;
}

export function maxMotorRotationsAtSoftLimit(plant: ArmPlantConfig): number {
  return Math.max(
    Math.abs(angleDegToMotorRotations(plant.softMinDeg, plant)),
    Math.abs(angleDegToMotorRotations(plant.softMaxDeg, plant)),
  );
}

export function travelFractionToSetpointRot(fraction: number, plant: ArmPlantConfig): number {
  const clamped = Math.max(0, Math.min(1, fraction));
  const deg = plant.softMinDeg + clamped * (plant.softMaxDeg - plant.softMinDeg);
  return angleDegToMotorRotations(deg, plant);
}
