import { describe, expect, it } from 'vitest';
import { REFERENCE_PLANT } from '../reference/elevatorReference';
import { getTemplateForVendor } from './elevatorParser';
import { parsePlantConfig, plantWarnings } from './plantParser';
import { DEFAULT_TUNING } from '../types';

describe('plantParser', () => {
  it('parses plant constants from subsystem template', () => {
    const source = getTemplateForVendor('rev', DEFAULT_TUNING, REFERENCE_PLANT);
    const plant = parsePlantConfig(source);
    expect(plant).toEqual(REFERENCE_PLANT);
  });

  it('falls back to reference plant when constants are missing', () => {
    const plant = parsePlantConfig('public class ElevatorSubsystem {}');
    expect(plant).toEqual(REFERENCE_PLANT);
  });

  it('warns when setpoint is outside edited travel range', () => {
    const plant = { ...REFERENCE_PLANT, maxHeightM: 1.5 };
    const warnings = plantWarnings(plant, 999);
    expect(warnings.some((w) => w.includes('Setpoint outside'))).toBe(true);
  });
});
