import type { FlywheelPlantConfig } from '../types';

export function flywheelPlantConstantsBlock(plant: FlywheelPlantConfig): string {
  return `  // --- PLANT: browser simulation only (not sent to real hardware) ---
  private static final double kMassKg = ${plant.massKg};
  private static final double kRadiusM = ${plant.radiusM};
  private static final double kGearRatio = ${plant.gearRatio};
  private static final double kMaxRpm = ${plant.maxRpm};`;
}
