import { describe, expect, it } from 'vitest';
import { ElevatorSim, SIM_DT } from './elevatorSim';
import { REFERENCE_PLANT } from '../reference/elevatorReference';
import {
  heightMToMotorRotations,
  motorRotationsToHeightM,
  rotPerSecToLinearMps,
} from './units/encoderUnits';
import { VerticalElevatorPlant } from './plant/verticalElevatorPlant';
import { motorForVendor } from './vendorMotor';
import type { TuningConfig } from '../types';

const startRot = heightMToMotorRotations(REFERENCE_PLANT.startHeightM, REFERENCE_PLANT);
const moveLowRot = startRot;
const moveHighRot = heightMToMotorRotations(2, REFERENCE_PLANT);

function runSteps(sim: ElevatorSim, seconds: number): void {
  const steps = Math.round(seconds / SIM_DT);
  for (let i = 0; i < steps; i++) sim.step();
}

function baseConfig(overrides: Partial<TuningConfig> = {}): TuningConfig {
  return {
    kP: 0,
    kI: 0,
    kD: 0,
    kS: 0,
    kG: 0,
    kV: 0,
    kA: 0,
    maxVelocity: 0,
    maxAccel: 0,
    setpoint: startRot,
    ...overrides,
  };
}

describe('vertical elevator sim', () => {
  it('REV and CTRE use different hold voltages for the same plant', () => {
    const revHold = new VerticalElevatorPlant(motorForVendor('rev'), REFERENCE_PLANT).getHoldVoltage();
    const ctreHold = new VerticalElevatorPlant(motorForVendor('ctre'), REFERENCE_PLANT).getHoldVoltage();
    expect(revHold).toBeGreaterThan(0);
    expect(ctreHold).toBeGreaterThan(0);
    expect(revHold).not.toBeCloseTo(ctreHold, 1);
  });

  it('kG near hold voltage keeps carriage steady', () => {
    const sim = new ElevatorSim('rev');
    const hold = sim.getHoldVoltageHint();
    sim.setConfig(baseConfig({ kG: hold, setpoint: startRot }));
    sim.setEnabled(true);

    const before = sim.getLatest()?.position ?? REFERENCE_PLANT.startHeightM;
    runSteps(sim, 3);
    const after = sim.getLatest()?.position ?? before;

    expect(Math.abs(after - before)).toBeLessThan(0.05);
  });

  it('kG = 0 causes carriage to fall', () => {
    const sim = new ElevatorSim('rev');
    sim.setConfig(baseConfig({ kG: 0, setpoint: startRot }));
    sim.setEnabled(true);

    runSteps(sim, 2);
    const pos = sim.getLatest()?.position ?? REFERENCE_PLANT.startHeightM;
    expect(pos).toBeLessThan(REFERENCE_PLANT.startHeightM - 0.1);
  });

  it('kG well above hold creeps upward', () => {
    const sim = new ElevatorSim('rev');
    const hold = sim.getHoldVoltageHint();
    sim.setConfig(baseConfig({ kG: hold * 2, setpoint: startRot }));
    sim.setEnabled(true);

    runSteps(sim, 3);
    const pos = sim.getLatest()?.position ?? REFERENCE_PLANT.startHeightM;
    expect(pos).toBeGreaterThan(REFERENCE_PLANT.startHeightM + 0.02);
  });

  it('non-zero kP moves toward setpoint; higher kP gets closer', () => {
    const hold = new ElevatorSim('rev').getHoldVoltageHint();
    const target = moveHighRot;
    const targetM = motorRotationsToHeightM(target, REFERENCE_PLANT);
    const startM = REFERENCE_PLANT.startHeightM;

    const noP = new ElevatorSim('rev');
    noP.setConfig(baseConfig({ kG: hold, kP: 0, setpoint: target }));
    noP.setEnabled(true);
    runSteps(noP, 5);
    const noPPos = noP.getLatest()?.position ?? startM;

    const withP = new ElevatorSim('rev');
    withP.setConfig(baseConfig({ kG: hold, kP: 12, setpoint: target }));
    withP.setEnabled(true);
    runSteps(withP, 5);
    const withPPos = withP.getLatest()?.position ?? startM;

    expect(withPPos).toBeGreaterThan(noPPos);
    expect(Math.abs(withPPos - targetM)).toBeLessThan(Math.abs(noPPos - targetM));
  });

  it('descent covers more distance than ascent in the same window', () => {
    const sim = new ElevatorSim('rev');
    const hold = sim.getHoldVoltageHint();
    const kP = 4;
    const windowSec = 2;

    sim.setConfig(baseConfig({ kG: hold, kP, setpoint: moveHighRot }));
    sim.setEnabled(true);
    runSteps(sim, windowSec);
    const ascentEnd = sim.getLatest()?.position ?? REFERENCE_PLANT.startHeightM;

    sim.reset();
    sim.setConfig(baseConfig({ kG: hold, kP, setpoint: moveLowRot }));
    sim.setEnabled(true);
    runSteps(sim, windowSec);
    const descentEnd = sim.getLatest()?.position ?? moveHighRot;

    const ascentDist = ascentEnd - REFERENCE_PLANT.startHeightM;
    const descentDist = 2 - descentEnd;

    expect(ascentDist).toBeGreaterThan(0);
    expect(descentDist).toBeGreaterThan(ascentDist);
  });

  it('with zero motion limits, setpoint jumps instantly to goal', () => {
    const sim = new ElevatorSim('rev');
    const hold = sim.getHoldVoltageHint();
    const targetM = motorRotationsToHeightM(moveHighRot, REFERENCE_PLANT);

    sim.setConfig(baseConfig({ kG: hold, setpoint: moveHighRot }));
    sim.setEnabled(true);
    sim.step();

    const sample = sim.getLatest();
    expect(sample?.setpoint).toBeCloseTo(targetM, 6);
  });

  it('with profiling enabled, setpoint ramps toward goal', () => {
    const sim = new ElevatorSim('rev');
    const hold = sim.getHoldVoltageHint();
    const targetM = motorRotationsToHeightM(moveHighRot, REFERENCE_PLANT);
    const maxVelMps = rotPerSecToLinearMps(5, REFERENCE_PLANT);

    sim.setConfig(
      baseConfig({
        kG: hold,
        maxVelocity: 5,
        maxAccel: 20,
        setpoint: moveHighRot,
      }),
    );
    sim.setEnabled(true);
    sim.step();

    const sample = sim.getLatest();
    expect(sample).not.toBeNull();
    expect(sample!.setpoint).toBeGreaterThan(REFERENCE_PLANT.startHeightM);
    expect(sample!.setpoint).toBeLessThan(targetM);
    expect(Math.abs(sample!.velocity)).toBeLessThan(maxVelMps + 0.05);
  });

  it('setpoint change with profiling does not reset profile to origin', () => {
    const sim = new ElevatorSim('rev');
    const hold = sim.getHoldVoltageHint();
    const lowTarget = heightMToMotorRotations(0.8, REFERENCE_PLANT);

    sim.setConfig(
      baseConfig({
        kG: hold,
        maxVelocity: 5,
        maxAccel: 20,
        setpoint: moveHighRot,
      }),
    );
    sim.setEnabled(true);
    runSteps(sim, 3);

    const beforeRetarget = sim.getLatest()?.setpoint ?? REFERENCE_PLANT.startHeightM;
    expect(beforeRetarget).toBeGreaterThan(REFERENCE_PLANT.startHeightM + 0.15);

    sim.setConfig(
      baseConfig({
        kG: hold,
        maxVelocity: 5,
        maxAccel: 20,
        setpoint: lowTarget,
      }),
    );
    sim.step();
    const afterRetarget = sim.getLatest()?.setpoint ?? beforeRetarget;

    expect(afterRetarget).toBeGreaterThan(REFERENCE_PLANT.startHeightM);
    expect(Math.abs(afterRetarget - beforeRetarget)).toBeLessThan(0.05);
  });
});
