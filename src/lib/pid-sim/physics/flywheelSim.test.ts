import { describe, expect, it } from 'vitest';
import { FlywheelSim, SIM_DT } from './flywheelSim';
import {
  REFERENCE_FLYWHEEL_PLANT,
  REV_FLYWHEEL_KV_HINT,
  CTRE_FLYWHEEL_KV_HINT,
} from '../reference/flywheelReference';
import { motorRotPerSecToWheelRpm, wheelRpmToMotorRotPerSec } from './units/flywheelUnits';
import type { TuningConfig } from '../types';

function runSteps(sim: FlywheelSim, seconds: number): void {
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
    setpoint: 1,
    ...overrides,
  };
}

describe('flywheel sim', () => {
  it('REV and CTRE reach different peak RPM with same kV feedforward', () => {
    const kv = 0.15;
    const setpoint = 50;

    const rev = new FlywheelSim('rev');
    rev.setConfig(baseConfig({ setpoint, kV: kv, kP: 0 }));
    rev.setEnabled(true);
    runSteps(rev, 6);
    const revRpm = rev.getLatest()?.velocity ?? 0;

    const ctre = new FlywheelSim('ctre');
    ctre.setConfig(baseConfig({ setpoint, kV: kv, kP: 0 }));
    ctre.setEnabled(true);
    runSteps(ctre, 6);
    const ctreRpm = ctre.getLatest()?.velocity ?? 0;

    expect(revRpm).toBeGreaterThan(10);
    expect(ctreRpm).toBeGreaterThan(10);
    expect(Math.abs(revRpm - ctreRpm)).toBeGreaterThan(5);
  });

  it('kV = 0 with no PID causes velocity to decay toward zero', () => {
    const sim = new FlywheelSim('rev');
    const kv = sim.getHoldVoltageHint();
    sim.setConfig(baseConfig({ setpoint: 1, kV: kv, kP: 0 }));
    sim.setEnabled(true);
    runSteps(sim, 2);
    const mid = sim.getLatest()?.velocity ?? 0;

    sim.setConfig(baseConfig({ setpoint: 1, kV: 0, kP: 0 }));
    runSteps(sim, 2);
    const end = sim.getLatest()?.velocity ?? 0;

    expect(mid).toBeGreaterThan(0);
    expect(end).toBeLessThan(mid);
  });

  it('kV near hint holds near 1 motor rot/s setpoint', () => {
    const sim = new FlywheelSim('rev');
    const kv = sim.getHoldVoltageHint();
    sim.setConfig(baseConfig({ setpoint: 1, kV: kv, kP: 0 }));
    sim.setEnabled(true);

    runSteps(sim, 4);
    const rpm = sim.getLatest()?.velocity ?? 0;
    const targetRpm = motorRotPerSecToWheelRpm(1, REFERENCE_FLYWHEEL_PLANT);

    expect(rpm).toBeGreaterThan(targetRpm * 0.85);
    expect(rpm).toBeLessThan(targetRpm * 1.15);
  });

  it('non-zero kP reaches setpoint faster than kP = 0', () => {
    const kv = new FlywheelSim('rev').getHoldVoltageHint();

    const noP = new FlywheelSim('rev');
    noP.setConfig(baseConfig({ setpoint: 1, kV: kv * 0.8, kP: 0 }));
    noP.setEnabled(true);
    runSteps(noP, 2);
    const noPRpm = noP.getLatest()?.velocity ?? 0;

    const withP = new FlywheelSim('rev');
    withP.setConfig(baseConfig({ setpoint: 1, kV: kv * 0.8, kP: 0.01 }));
    withP.setEnabled(true);
    runSteps(withP, 2);
    const withPRpm = withP.getLatest()?.velocity ?? 0;

    const targetRpm = motorRotPerSecToWheelRpm(1, REFERENCE_FLYWHEEL_PLANT);
    expect(withPRpm).toBeGreaterThan(noPRpm);
    expect(Math.abs(withPRpm - targetRpm)).toBeLessThan(Math.abs(noPRpm - targetRpm));
  });

  it('wheel RPM stays at or below plant max', () => {
    const sim = new FlywheelSim('rev');
    const maxMotor = wheelRpmToMotorRotPerSec(REFERENCE_FLYWHEEL_PLANT.maxRpm, REFERENCE_FLYWHEEL_PLANT);
    sim.setConfig(baseConfig({ setpoint: maxMotor, kV: 12, kP: 0.01 }));
    sim.setEnabled(true);

    runSteps(sim, 8);
    const rpm = sim.getLatest()?.velocity ?? 0;
    expect(rpm).toBeLessThanOrEqual(REFERENCE_FLYWHEEL_PLANT.maxRpm + 5);
    expect(rpm).toBeGreaterThan(100);
  });

  it('kV hint is positive for both vendors', () => {
    expect(REV_FLYWHEEL_KV_HINT).toBeGreaterThan(0);
    expect(CTRE_FLYWHEEL_KV_HINT).toBeGreaterThan(0);
  });
});
