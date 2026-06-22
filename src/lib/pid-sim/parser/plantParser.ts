import type { PlantConfig } from '../types';
import { REFERENCE_PLANT } from '../reference/elevatorReference';
import { motorRotationsToHeightM } from '../physics/units/encoderUnits';

const PLANT_CONST_PATTERN =
  /private\s+static\s+final\s+double\s+(kMassLbs|kMinHeightM|kMaxHeightM|kStartHeightM|kGearRatio|kDrumCircumferenceM)\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*;/g;

const JAVA_NAME_TO_FIELD: Record<string, keyof PlantConfig> = {
  kMassLbs: 'massLbs',
  kMinHeightM: 'minHeightM',
  kMaxHeightM: 'maxHeightM',
  kStartHeightM: 'startHeightM',
  kGearRatio: 'gearRatio',
  kDrumCircumferenceM: 'drumCircumferenceM',
};

/** Parse plant constants from subsystem Java; missing fields fall back to REFERENCE_PLANT. */
export function parsePlantConfig(source: string): PlantConfig {
  const partial: Partial<PlantConfig> = {};

  let match: RegExpExecArray | null;
  PLANT_CONST_PATTERN.lastIndex = 0;
  while ((match = PLANT_CONST_PATTERN.exec(source)) !== null) {
    const field = JAVA_NAME_TO_FIELD[match[1]];
    if (field) partial[field] = parseFloat(match[2]);
  }

  return {
    massLbs: partial.massLbs ?? REFERENCE_PLANT.massLbs,
    minHeightM: partial.minHeightM ?? REFERENCE_PLANT.minHeightM,
    maxHeightM: partial.maxHeightM ?? REFERENCE_PLANT.maxHeightM,
    startHeightM: partial.startHeightM ?? REFERENCE_PLANT.startHeightM,
    gearRatio: partial.gearRatio ?? REFERENCE_PLANT.gearRatio,
    drumCircumferenceM: partial.drumCircumferenceM ?? REFERENCE_PLANT.drumCircumferenceM,
  };
}

export function plantWarnings(plant: PlantConfig, setpointRot?: number): string[] {
  const warnings: string[] = [];

  if (plant.massLbs <= 0) {
    warnings.push('Plant mass (kMassLbs) should be greater than zero');
  }
  if (plant.gearRatio <= 0) {
    warnings.push('Plant gear ratio (kGearRatio) should be greater than zero');
  }
  if (plant.drumCircumferenceM <= 0) {
    warnings.push('Plant drum circumference (kDrumCircumferenceM) should be greater than zero');
  }
  if (plant.minHeightM >= plant.maxHeightM) {
    warnings.push('Plant min height must be less than max height');
  }
  if (
    plant.startHeightM < plant.minHeightM ||
    plant.startHeightM > plant.maxHeightM
  ) {
    warnings.push(
      `Start height (${plant.startHeightM} m) should be within travel (${plant.minHeightM}–${plant.maxHeightM} m)`,
    );
  }
  if (setpointRot !== undefined) {
    const setpointM = motorRotationsToHeightM(setpointRot, plant);
    if (setpointM > plant.maxHeightM || setpointM < plant.minHeightM) {
      warnings.push(
        `Setpoint outside plant travel range (${plant.minHeightM}–${plant.maxHeightM} m in height)`,
      );
    }
  }
  return warnings;
}

export function plantsEqual(a: PlantConfig, b: PlantConfig): boolean {
  return (
    a.massLbs === b.massLbs &&
    a.minHeightM === b.minHeightM &&
    a.maxHeightM === b.maxHeightM &&
    a.startHeightM === b.startHeightM &&
    a.gearRatio === b.gearRatio &&
    a.drumCircumferenceM === b.drumCircumferenceM
  );
}

/** Find 1-based line number of a plant constant declaration. */
export function findPlantConstLine(source: string, javaName: string): number | null {
  const pattern = new RegExp(
    `private\\s+static\\s+final\\s+double\\s+${javaName}\\s*=`,
  );
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return null;
}

/** Find 1-based line of the PLANT section header comment. */
export function findPlantSectionLine(source: string): number | null {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('PLANT')) return i + 1;
  }
  return null;
}
