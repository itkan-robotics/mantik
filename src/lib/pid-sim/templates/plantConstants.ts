import type { PlantConfig } from '../types';

/** Java plant block shared by REV and CTRE elevator templates. */
export function plantConstantsBlock(plant: PlantConfig): string {
  return `  // --- PLANT: browser simulation physics (not sent to motor hardware) ---
  private static final double kMassLbs = ${plant.massLbs};
  private static final double kMinHeightM = ${plant.minHeightM};
  private static final double kMaxHeightM = ${plant.maxHeightM};
  private static final double kStartHeightM = ${plant.startHeightM};
  private static final double kGearRatio = ${plant.gearRatio};
  private static final double kDrumCircumferenceM = ${plant.drumCircumferenceM};`;
}
