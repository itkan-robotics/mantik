import { describe, expect, it } from 'vitest';
import { ArmSim, SIM_DT } from './armSim';
import { REFERENCE_ARM_PLANT } from '../reference/armReference';
import {
  angleDegToMotorRotations,
  motorRotationsToAngleDeg,
  rotPerSecToRadPerSec,
} from './units/armUnits';
import { ArmPlant } from './plant/armPlant';
import { motorForVendor } from './vendorMotor';
import type { TuningConfig } from '../types';

const startRot = angleDegToMotorRotations(REFERENCE_ARM_PLANT.startAngleDeg, REFERENCE_ARM_PLANT);
const targetUpRot = angleDegToMotorRotations(45, REFERENCE_ARM_PLANT);
const targetDownRot = angleDegToMotorRotations(-45, REFERENCE_ARM_PLANT);

function runSteps(sim: ArmSim, seconds: number): void {
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

describe('single-jointed arm sim', () => {
  it('REV and CTRE use different horizontal hold voltages', () => {
    const revHold = new ArmPlant(motorForVendor('rev'), REFERENCE_ARM_PLANT).getHoldVoltageHorizontal();
    const ctreHold = new ArmPlant(motorForVendor('ctre'), REFERENCE_ARM_PLANT).getHoldVoltageHorizontal();
    expect(revHold).toBeGreaterThan(0);
    expect(ctreHold).toBeGreaterThan(0);
    expect(revHold).not.toBeCloseTo(ctreHold, 1);
  });

  it('kG near hold at horizontal keeps arm steady', () => {
    const sim = new ArmSim('rev');
    const hold = sim.getHoldVoltageHint();
    sim.setConfig(baseConfig({ kG: hold, setpoint: startRot }));
    sim.setEnabled(true);

    const before = sim.getLatest()?.position ?? REFERENCE_ARM_PLANT.startAngleDeg;
    runSteps(sim, 3);
    const after = sim.getLatest()?.position ?? before;

    expect(Math.abs(after - before)).toBeLessThan(3);
  });

  it('kG = 0 causes arm to fall from horizontal', () => {
    const sim = new ArmSim('rev');
    sim.setConfig(baseConfig({ kG: 0, setpoint: startRot }));
    sim.setEnabled(true);

    runSteps(sim, 2);
    const pos = sim.getLatest()?.position ?? REFERENCE_ARM_PLANT.startAngleDeg;
    expect(pos).toBeLessThan(REFERENCE_ARM_PLANT.startAngleDeg - 5);
  });

  it('kG well above hold creeps upward from horizontal', () => {
    const sim = new ArmSim('rev');
    const hold = sim.getHoldVoltageHint();
    sim.setConfig(baseConfig({ kG: hold * 2, setpoint: startRot }));
    sim.setEnabled(true);

    runSteps(sim, 3);
    const pos = sim.getLatest()?.position ?? REFERENCE_ARM_PLANT.startAngleDeg;
    expect(pos).toBeGreaterThan(REFERENCE_ARM_PLANT.startAngleDeg + 2);
  });

  it('non-zero kP moves toward setpoint; higher kP gets closer', () => {
    const hold = new ArmSim('rev').getHoldVoltageHint();
    const targetDeg = 45;

    const noP = new ArmSim('rev');
    noP.setConfig(baseConfig({ kG: hold, kP: 0, setpoint: targetUpRot }));
    noP.setEnabled(true);
    runSteps(noP, 5);
    const noPPos = noP.getLatest()?.position ?? 0;

    const withP = new ArmSim('rev');
    withP.setConfig(baseConfig({ kG: hold, kP: 8, setpoint: targetUpRot }));
    withP.setEnabled(true);
    runSteps(withP, 5);
    const withPPos = withP.getLatest()?.position ?? 0;

    expect(withPPos).toBeGreaterThan(noPPos);
    expect(Math.abs(withPPos - targetDeg)).toBeLessThan(Math.abs(noPPos - targetDeg));
  });

  it('gravity assists downward move more than upward in same window', () => {
    const sim = new ArmSim('rev');
    const hold = sim.getHoldVoltageHint();
    const kP = 3;
    const windowSec = 2;

    sim.setConfig(baseConfig({ kG: hold, kP, setpoint: targetUpRot }));
    sim.setEnabled(true);
    runSteps(sim, windowSec);
    const upEnd = sim.getLatest()?.position ?? 0;

    sim.reset();
    sim.setConfig(baseConfig({ kG: hold, kP, setpoint: targetDownRot }));
    sim.setEnabled(true);
    runSteps(sim, windowSec);
    const downEnd = sim.getLatest()?.position ?? 0;

    const upDist = upEnd - REFERENCE_ARM_PLANT.startAngleDeg;
    const downDist = REFERENCE_ARM_PLANT.startAngleDeg - downEnd;

    expect(upDist).toBeGreaterThan(0);
    expect(downDist).toBeGreaterThan(upDist);
  });

  it('with zero motion limits, setpoint jumps instantly to goal', () => {
    const sim = new ArmSim('rev');
    const hold = sim.getHoldVoltageHint();
    const targetDeg = motorRotationsToAngleDeg(targetUpRot, REFERENCE_ARM_PLANT);

    sim.setConfig(baseConfig({ kG: hold, setpoint: targetUpRot }));
    sim.setEnabled(true);
    sim.step();

    const sample = sim.getLatest();
    expect(sample?.setpoint).toBeCloseTo(targetDeg, 4);
  });

  it('with profiling enabled, setpoint ramps toward goal', () => {
    const sim = new ArmSim('rev');
    const hold = sim.getHoldVoltageHint();
    const targetDeg = motorRotationsToAngleDeg(targetUpRot, REFERENCE_ARM_PLANT);
    const maxVelRad = rotPerSecToRadPerSec(2, REFERENCE_ARM_PLANT);

    sim.setConfig(
      baseConfig({
        kG: hold,
        maxVelocity: 2,
        maxAccel: 10,
        setpoint: targetUpRot,
      }),
    );
    sim.setEnabled(true);
    sim.step();

    const sample = sim.getLatest();
    expect(sample).not.toBeNull();
    expect(sample!.setpoint).toBeGreaterThan(REFERENCE_ARM_PLANT.startAngleDeg);
    expect(sample!.setpoint).toBeLessThan(targetDeg);
    expect(Math.abs(sample!.velocity)).toBeLessThan(maxVelRad * (180 / Math.PI) + 5);
  });

  it('setpoint change with profiling does not reset profile to origin', () => {
    const sim = new ArmSim('rev');
    const hold = sim.getHoldVoltageHint();
    const lowTarget = angleDegToMotorRotations(20, REFERENCE_ARM_PLANT);

    sim.setConfig(
      baseConfig({
        kG: hold,
        maxVelocity: 2,
        maxAccel: 10,
        setpoint: targetUpRot,
      }),
    );
    sim.setEnabled(true);
    runSteps(sim, 3);

    const beforeRetarget = sim.getLatest()?.setpoint ?? 0;
    expect(beforeRetarget).toBeGreaterThan(15);

    sim.setConfig(
      baseConfig({
        kG: hold,
        maxVelocity: 2,
        maxAccel: 10,
        setpoint: lowTarget,
      }),
    );
    sim.step();
    const afterRetarget = sim.getLatest()?.setpoint ?? beforeRetarget;

    expect(afterRetarget).toBeGreaterThan(10);
    expect(Math.abs(afterRetarget - beforeRetarget)).toBeLessThan(8);
  });
});
