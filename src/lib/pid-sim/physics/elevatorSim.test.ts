import { describe, expect, it } from 'vitest';
import { getNeo } from './dcMotor';
import { ElevatorSim, SIM_DT } from './elevatorSim';
import { computeHoldVoltage, computeTheoreticalKA, computeTheoreticalKV } from './elevatorPlant';
import { TUNER_KP_OPTIMAL, REFERENCE_PLANT, tunerKpToPhysics } from '../reference/elevatorReference';
import { DEFAULT_TUNING } from '../types';
import type { SimSample } from '../types';

function runSteps(sim: ElevatorSim, seconds: number) {
  const steps = Math.round(seconds / SIM_DT);
  for (let i = 0; i < steps; i++) sim.step();
}

function maxOvershoot(samples: readonly SimSample[], setpoint: number): number {
  let peak = setpoint;
  for (const sample of samples) {
    if (sample.position > peak) peak = sample.position;
  }
  return peak - setpoint;
}

function runPositionStep(kP: number, holdVoltage: number, setpoint = 2) {
  const sim = new ElevatorSim(REFERENCE_PLANT);
  sim.setConfig({
    ...DEFAULT_TUNING,
    kG: holdVoltage,
    kP,
    setpoint,
  });
  sim.setEnabled(true);
  runSteps(sim, 4);
  return sim.getSamples();
}

describe('elevator physics', () => {
  const motor = getNeo(1);
  const holdVoltage = computeHoldVoltage(motor, REFERENCE_PLANT);

  it('hold voltage is in lesson kG range for reference plant', () => {
    expect(holdVoltage).toBeGreaterThan(0.4);
    expect(holdVoltage).toBeLessThan(0.8);
    expect(holdVoltage).toBeCloseTo(0.61, 1);
  });

  it('applies kG as motor voltage feedforward', () => {
    const sim = new ElevatorSim(REFERENCE_PLANT);
    const kG = holdVoltage * 1.15;
    sim.setConfig({
      ...DEFAULT_TUNING,
      kG,
      setpoint: REFERENCE_PLANT.startHeightM,
    });
    sim.setEnabled(true);
    const sample = sim.step();
    expect(sample?.output).toBeCloseTo(kG, 3);
  });

  it('falls when kG is zero', () => {
    const sim = new ElevatorSim(REFERENCE_PLANT);
    sim.setConfig({
      ...DEFAULT_TUNING,
      kG: 0,
      setpoint: REFERENCE_PLANT.startHeightM,
    });
    sim.setEnabled(true);
    runSteps(sim, 1);
    expect(sim.position).toBeLessThan(REFERENCE_PLANT.startHeightM - 0.05);
  });

  it('creeps upward when kG is too high', () => {
    const sim = new ElevatorSim(REFERENCE_PLANT);
    const kG = holdVoltage * 1.15;
    sim.setConfig({
      ...DEFAULT_TUNING,
      kG,
      setpoint: REFERENCE_PLANT.startHeightM,
    });
    sim.setEnabled(true);
    for (let i = 0; i < 25; i++) sim.step();
    expect(sim.position).toBeGreaterThan(REFERENCE_PLANT.startHeightM + 0.003);
    expect(sim.velocity).toBeGreaterThan(0);
  });

  it('holds near start height when kG matches gravity feedforward', () => {
    const sim = new ElevatorSim(REFERENCE_PLANT);
    sim.setConfig({
      ...DEFAULT_TUNING,
      kG: holdVoltage,
      setpoint: REFERENCE_PLANT.startHeightM,
    });
    sim.setEnabled(true);
    const startPos = sim.position;
    runSteps(sim, 3);
    expect(Math.abs(sim.position - startPos)).toBeLessThan(0.05);
    expect(Math.abs(sim.velocity)).toBeLessThan(0.15);
  });

  it('higher kP produces faster, stronger motion toward setpoint', () => {
    const setpoint = 2;
    const metricsAt = (kP: number) => {
      const samples = runPositionStep(kP, holdVoltage, setpoint);
      const final = samples[samples.length - 1]?.position ?? 0;
      const peakVel = samples.reduce((m, s) => Math.max(m, Math.abs(s.velocity)), 0);
      return { final, peakVel, overshoot: maxOvershoot(samples, setpoint) };
    };

    const low = metricsAt(0.02);
    const mid = metricsAt(0.06);
    const high = metricsAt(0.15);

    expect(mid.final).toBeGreaterThan(low.final);
    expect(high.peakVel).toBeGreaterThan(mid.peakVel);
    expect(high.peakVel).toBeGreaterThan(low.peakVel);
    expect(high.overshoot).toBeGreaterThanOrEqual(low.overshoot);
  });

  it('does not cap velocity when max motion limits are zero', () => {
    const sim = new ElevatorSim(REFERENCE_PLANT);
    sim.setConfig({
      ...DEFAULT_TUNING,
      kG: holdVoltage,
      kP: TUNER_KP_OPTIMAL,
      maxVelocity: 0,
      maxAccel: 0,
      setpoint: 2,
    });
    sim.setEnabled(true);
    let peakSpeed = 0;
    for (let i = 0; i < Math.round(1 / SIM_DT); i++) {
      sim.step();
      peakSpeed = Math.max(peakSpeed, Math.abs(sim.velocity));
    }
    expect(peakSpeed).toBeGreaterThan(0.5);
  });

  it('profile limits cruise velocity when maxVelocity is set', () => {
    const cap = 0.35;
    const sim = new ElevatorSim(REFERENCE_PLANT);
    sim.setConfig({
      ...DEFAULT_TUNING,
      kG: holdVoltage,
      kP: TUNER_KP_OPTIMAL,
      maxVelocity: cap,
      maxAccel: 0.3,
      setpoint: 2,
    });
    sim.setEnabled(true);
    let peakSpeed = 0;
    for (let i = 0; i < Math.round(5 / SIM_DT); i++) {
      sim.step();
      peakSpeed = Math.max(peakSpeed, Math.abs(sim.velocity));
    }
    expect(peakSpeed).toBeLessThanOrEqual(cap + 0.1);
    expect(peakSpeed).toBeGreaterThan(0.1);
  });

  it('higher kP produces larger PID term at the same position error', () => {
    const pidTermAtKp = (kP: number) => {
      const sim = new ElevatorSim(REFERENCE_PLANT);
      sim.setConfig({
        ...DEFAULT_TUNING,
        kG: holdVoltage,
        kP,
        setpoint: 2,
      });
      sim.setEnabled(true);
      sim.step();
      const pos = sim.position;
      return tunerKpToPhysics(kP) * (2 - pos);
    };

    expect(pidTermAtKp(TUNER_KP_OPTIMAL)).toBeGreaterThan(pidTermAtKp(2));
    expect(pidTermAtKp(12)).toBeGreaterThan(pidTermAtKp(4));
  });

  it('theoretical kV and kA are positive for reference plant', () => {
    expect(computeTheoreticalKV(motor, REFERENCE_PLANT)).toBeGreaterThan(0);
    expect(computeTheoreticalKA(motor, REFERENCE_PLANT)).toBeGreaterThan(0);
  });

  it('motion profile with kV adds velocity feedforward during cruise', () => {
    const kV = computeTheoreticalKV(motor, REFERENCE_PLANT);
    const profile = { maxVelocity: 0.3, maxAccel: 0.3, setpoint: 2 };

    const runWithKV = (kv: number) => {
      const sim = new ElevatorSim(REFERENCE_PLANT);
      sim.setConfig({
        ...DEFAULT_TUNING,
        kG: holdVoltage,
        kP: 0.15,
        kV: kv,
        ...profile,
      });
      sim.setEnabled(true);
      runSteps(sim, 5);
      return sim.getSamples();
    };

    const withKv = runWithKV(kV);
    const withoutKv = runWithKV(0);

    const meanOutputDuringCruise = (samples: readonly SimSample[]) => {
      const cruise = samples.filter((s) => s.time >= 2 && s.time <= 3.5 && Math.abs(s.velocity) > 0.05);
      if (cruise.length === 0) return 0;
      return cruise.reduce((a, s) => a + s.output, 0) / cruise.length;
    };

    expect(meanOutputDuringCruise(withKv)).toBeGreaterThan(meanOutputDuringCruise(withoutKv));
  });
});
