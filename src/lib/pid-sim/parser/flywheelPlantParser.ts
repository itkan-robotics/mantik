import type { FlywheelPlantConfig } from '../types';
import { REFERENCE_FLYWHEEL_PLANT } from '../reference/flywheelReference';

const PLANT_CONST_PATTERN =
  /private\s+static\s+final\s+double\s+(kMassKg|kRadiusM|kGearRatio|kMaxRpm)\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*;/g;

const JAVA_NAME_TO_FIELD: Record<string, keyof FlywheelPlantConfig> = {
  kMassKg: 'massKg',
  kRadiusM: 'radiusM',
  kGearRatio: 'gearRatio',
  kMaxRpm: 'maxRpm',
};

export function parseFlywheelPlantConfig(source: string): FlywheelPlantConfig {
  const partial: Partial<FlywheelPlantConfig> = {};

  let match: RegExpExecArray | null;
  PLANT_CONST_PATTERN.lastIndex = 0;
  while ((match = PLANT_CONST_PATTERN.exec(source)) !== null) {
    const field = JAVA_NAME_TO_FIELD[match[1]];
    if (field) partial[field] = parseFloat(match[2]);
  }

  return {
    massKg: partial.massKg ?? REFERENCE_FLYWHEEL_PLANT.massKg,
    radiusM: partial.radiusM ?? REFERENCE_FLYWHEEL_PLANT.radiusM,
    gearRatio: partial.gearRatio ?? REFERENCE_FLYWHEEL_PLANT.gearRatio,
    maxRpm: partial.maxRpm ?? REFERENCE_FLYWHEEL_PLANT.maxRpm,
  };
}

export function flywheelPlantWarnings(plant: FlywheelPlantConfig, setpointRotPerSec?: number): string[] {
  const warnings: string[] = [];

  if (plant.massKg <= 0) warnings.push('Plant mass (kMassKg) should be greater than zero');
  if (plant.radiusM <= 0) warnings.push('Wheel radius (kRadiusM) should be greater than zero');
  if (plant.gearRatio <= 0) warnings.push('Gear ratio (kGearRatio) should be greater than zero');
  if (plant.maxRpm <= 0) warnings.push('Max RPM (kMaxRpm) should be greater than zero');

  if (setpointRotPerSec !== undefined) {
    const maxMotor = (plant.maxRpm / 60) * plant.gearRatio;
    if (setpointRotPerSec > maxMotor + 0.01) {
      warnings.push(
        `Setpoint (${setpointRotPerSec.toFixed(2)} motor rot/s) exceeds max (${maxMotor.toFixed(2)} motor rot/s)`,
      );
    }
  }

  return warnings;
}

export function flywheelPlantsEqual(a: FlywheelPlantConfig, b: FlywheelPlantConfig): boolean {
  return (
    a.massKg === b.massKg &&
    a.radiusM === b.radiusM &&
    a.gearRatio === b.gearRatio &&
    a.maxRpm === b.maxRpm
  );
}

export function findFlywheelPlantSectionLine(source: string): number | null {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('PLANT: browser simulation')) return i + 1;
    if (lines[i].includes('kMassKg')) return i + 1;
  }
  return null;
}
