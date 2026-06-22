import type { ArmPlantConfig, TuningConfig } from '../types';

export function armPlantConstantsBlock(plant: ArmPlantConfig): string {
  return `  // --- PLANT: browser simulation only (not sent to real hardware) ---
  private static final double kMassKg = ${plant.massKg};
  private static final double kArmLengthM = ${plant.armLengthM};
  private static final double kGearRatio = ${plant.gearRatio};
  private static final double kStartAngleDeg = ${plant.startAngleDeg};
  private static final double kSoftMinDeg = ${plant.softMinDeg};
  private static final double kSoftMaxDeg = ${plant.softMaxDeg};
  // Hard limits ±90° are fixed in browser physics — not editable here.`;
}
