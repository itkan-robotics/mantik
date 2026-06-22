import { describe, expect, it } from 'vitest';
import { REFERENCE_PLANT } from '../reference/elevatorReference';
import { motorRotationsToHeightM } from '../physics/units/encoderUnits';
import {
  DEFAULT_TELEOP_BINDINGS,
  formatKeyLabel,
  isLetterKey,
  loadTeleopBindings,
  sanitizeTeleopBindings,
  travelFractionToSetpointRot,
} from './travelPresets';

describe('travelPresets', () => {
  it('maps fractions to plant travel in motor rotations', () => {
    const bottom = travelFractionToSetpointRot(0, REFERENCE_PLANT);
    const top = travelFractionToSetpointRot(1, REFERENCE_PLANT);
    expect(motorRotationsToHeightM(bottom, REFERENCE_PLANT)).toBeCloseTo(
      REFERENCE_PLANT.minHeightM,
      6,
    );
    expect(motorRotationsToHeightM(top, REFERENCE_PLANT)).toBeCloseTo(
      REFERENCE_PLANT.maxHeightM,
      6,
    );
  });

  it('uses custom min/max when plant is edited', () => {
    const plant = { ...REFERENCE_PLANT, minHeightM: 0.5, maxHeightM: 2.5 };
    const mid = travelFractionToSetpointRot(0.5, plant);
    expect(motorRotationsToHeightM(mid, plant)).toBeCloseTo(1.5, 6);
  });

  it('defaults to QWERTY letter bindings', () => {
    expect(DEFAULT_TELEOP_BINDINGS).toEqual(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT']);
    expect(loadTeleopBindings()).toEqual([...DEFAULT_TELEOP_BINDINGS]);
  });

  it('rejects digit keys when sanitizing stored bindings', () => {
    const sanitized = sanitizeTeleopBindings(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']);
    expect(sanitized).toEqual([...DEFAULT_TELEOP_BINDINGS]);
  });

  it('formats letter key labels', () => {
    expect(isLetterKey('KeyQ')).toBe(true);
    expect(isLetterKey('Digit1')).toBe(false);
    expect(formatKeyLabel('KeyQ')).toBe('Q');
  });
});
