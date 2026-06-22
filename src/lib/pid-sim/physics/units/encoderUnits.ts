import type { PlantConfig } from '../../types';

/** Meters of elevator travel per motor shaft rotation. */
export function metersPerMotorRotation(plant: PlantConfig): number {
  return plant.drumCircumferenceM / plant.gearRatio;
}

export function heightMToMotorRotations(heightM: number, plant: PlantConfig): number {
  return heightM * plant.gearRatio / plant.drumCircumferenceM;
}

export function motorRotationsToHeightM(rotations: number, plant: PlantConfig): number {
  return rotations * metersPerMotorRotation(plant);
}

export function linearMpsToRotPerSec(velocityMps: number, plant: PlantConfig): number {
  return velocityMps / metersPerMotorRotation(plant);
}

export function rotPerSecToLinearMps(velocityRotPerSec: number, plant: PlantConfig): number {
  return velocityRotPerSec * metersPerMotorRotation(plant);
}

export function linearMps2ToRotPerSec2(accelMps2: number, plant: PlantConfig): number {
  return accelMps2 / metersPerMotorRotation(plant);
}

export function rotPerSec2ToLinearMps2(accelRotPerSec2: number, plant: PlantConfig): number {
  return accelRotPerSec2 * metersPerMotorRotation(plant);
}

export function maxMotorRotations(plant: PlantConfig): number {
  return heightMToMotorRotations(plant.maxHeightM, plant);
}
