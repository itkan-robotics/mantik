import { describe, expect, it } from 'vitest';
import { getNeo } from './dcMotor';
import { ElevatorSimPlant, WPILIB_GRAVITY, computeHoldVoltage } from './elevatorPlant';
import { REFERENCE_PLANT } from '../reference/elevatorReference';
import { SIM_DT } from './elevatorSim';

describe('ElevatorSimPlant (WPILib)', () => {
  const motor = getNeo(1);
  const holdVoltage = computeHoldVoltage(motor, REFERENCE_PLANT);

  it('holds position with kG-equivalent voltage at rest', () => {
    const plant = new ElevatorSimPlant(motor, REFERENCE_PLANT);
    plant.setInputVoltage(holdVoltage);
    for (let i = 0; i < 100; i++) plant.update(SIM_DT);
    expect(plant.getPositionMeters()).toBeCloseTo(REFERENCE_PLANT.startHeightM, 2);
    expect(Math.abs(plant.getVelocityMetersPerSecond())).toBeLessThan(0.05);
  });

  it('falls with zero input and gravity enabled', () => {
    const plant = new ElevatorSimPlant(motor, REFERENCE_PLANT);
    plant.setInputVoltage(0);
    for (let i = 0; i < 50; i++) plant.update(SIM_DT);
    expect(plant.getPositionMeters()).toBeLessThan(REFERENCE_PLANT.startHeightM - 0.05);
  });

  it('snaps to lower limit with zero velocity', () => {
    const plant = new ElevatorSimPlant(motor, REFERENCE_PLANT);
    plant.setState(REFERENCE_PLANT.minHeightM - 0.1, -2);
    plant.setInputVoltage(0);
    plant.update(SIM_DT);
    expect(plant.getPositionMeters()).toBe(REFERENCE_PLANT.minHeightM);
    expect(plant.getVelocityMetersPerSecond()).toBe(0);
  });

  it('snaps to upper limit with zero velocity', () => {
    const plant = new ElevatorSimPlant(motor, REFERENCE_PLANT);
    plant.setState(REFERENCE_PLANT.maxHeightM + 0.1, 2);
    plant.setInputVoltage(12);
    plant.update(SIM_DT);
    expect(plant.getPositionMeters()).toBe(REFERENCE_PLANT.maxHeightM);
    expect(plant.getVelocityMetersPerSecond()).toBe(0);
  });

  it('does not blow up under sustained voltage', () => {
    const plant = new ElevatorSimPlant(motor, REFERENCE_PLANT);
    plant.setInputVoltage(12);
    for (let i = 0; i < 200; i++) plant.update(SIM_DT);
    expect(Number.isFinite(plant.getVelocityMetersPerSecond())).toBe(true);
    expect(Math.abs(plant.getVelocityMetersPerSecond())).toBeLessThan(20);
  });

  it('uses WPILib gravity constant', () => {
    expect(WPILIB_GRAVITY).toBe(9.8);
  });

  it('reports finite current draw', () => {
    const plant = new ElevatorSimPlant(motor, REFERENCE_PLANT);
    plant.setInputVoltage(holdVoltage);
    plant.update(SIM_DT);
    expect(Number.isFinite(plant.getCurrentDrawAmps())).toBe(true);
  });
});
