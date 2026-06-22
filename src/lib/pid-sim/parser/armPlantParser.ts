import type { ArmPlantConfig } from '../types';
import { REFERENCE_ARM_PLANT } from '../reference/armReference';

const PLANT_CONST_PATTERN =
  /private\s+static\s+final\s+double\s+(kMassKg|kArmLengthM|kGearRatio|kStartAngleDeg|kSoftMinDeg|kSoftMaxDeg)\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*;/g;

const JAVA_NAME_TO_FIELD: Record<string, keyof ArmPlantConfig> = {
  kMassKg: 'massKg',
  kArmLengthM: 'armLengthM',
  kGearRatio: 'gearRatio',
  kStartAngleDeg: 'startAngleDeg',
  kSoftMinDeg: 'softMinDeg',
  kSoftMaxDeg: 'softMaxDeg',
};

export function parseArmPlantConfig(source: string): ArmPlantConfig {
  const partial: Partial<ArmPlantConfig> = {};

  let match: RegExpExecArray | null;
  PLANT_CONST_PATTERN.lastIndex = 0;
  while ((match = PLANT_CONST_PATTERN.exec(source)) !== null) {
    const field = JAVA_NAME_TO_FIELD[match[1]];
    if (field) partial[field] = parseFloat(match[2]);
  }

  return {
    massKg: partial.massKg ?? REFERENCE_ARM_PLANT.massKg,
    armLengthM: partial.armLengthM ?? REFERENCE_ARM_PLANT.armLengthM,
    gearRatio: partial.gearRatio ?? REFERENCE_ARM_PLANT.gearRatio,
    startAngleDeg: partial.startAngleDeg ?? REFERENCE_ARM_PLANT.startAngleDeg,
    softMinDeg: partial.softMinDeg ?? REFERENCE_ARM_PLANT.softMinDeg,
    softMaxDeg: partial.softMaxDeg ?? REFERENCE_ARM_PLANT.softMaxDeg,
    hardMinDeg: REFERENCE_ARM_PLANT.hardMinDeg,
    hardMaxDeg: REFERENCE_ARM_PLANT.hardMaxDeg,
  };
}

export function armPlantWarnings(plant: ArmPlantConfig, setpointRot?: number): string[] {
  const warnings: string[] = [];

  if (plant.massKg <= 0) warnings.push('Plant mass (kMassKg) should be greater than zero');
  if (plant.armLengthM <= 0) warnings.push('Arm length (kArmLengthM) should be greater than zero');
  if (plant.gearRatio <= 0) warnings.push('Gear ratio (kGearRatio) should be greater than zero');
  if (plant.softMinDeg >= plant.softMaxDeg) {
    warnings.push('Soft min angle should be less than soft max angle');
  }

  if (setpointRot !== undefined) {
    const deg = (setpointRot * 360) / plant.gearRatio;
    if (deg > plant.softMaxDeg + 1 || deg < plant.softMinDeg - 1) {
      warnings.push(
        `Setpoint (${deg.toFixed(1)}°) is outside soft limits (${plant.softMinDeg}° to ${plant.softMaxDeg}°)`,
      );
    }
  }

  return warnings;
}

export function armPlantsEqual(a: ArmPlantConfig, b: ArmPlantConfig): boolean {
  return (
    a.massKg === b.massKg &&
    a.armLengthM === b.armLengthM &&
    a.gearRatio === b.gearRatio &&
    a.startAngleDeg === b.startAngleDeg &&
    a.softMinDeg === b.softMinDeg &&
    a.softMaxDeg === b.softMaxDeg
  );
}

export function findArmPlantSectionLine(source: string): number | null {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('PLANT: browser simulation')) return i + 1;
    if (lines[i].includes('kMassKg')) return i + 1;
  }
  return null;
}
